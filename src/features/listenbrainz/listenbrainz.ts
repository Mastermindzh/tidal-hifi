import axios from "axios";

import { settings } from "../../constants/settings";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { settingsStore } from "../../scripts/settings";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { Logger } from "../logger";
import { tidalUrl } from "../tidal/url";

// biome-ignore lint/complexity/noStaticOnlyClass: off
export class ListenBrainz {
  // Internal state for tracking scrobbling
  private static currentTrackKey = "";
  private static currentTrackScrobbled = false;
  private static currentTrackDuration = 0;
  private static lastKnownPosition = 0;
  private static currentPlayingNowDelayId: ReturnType<typeof setTimeout>;

  /**
   * Execute a "playing_now" operation with delay, cancelling any pending "playing_now" operations
   */
  private static executePlayingNowWithDelay(operation: () => Promise<void> | void): void {
    // Cancel any pending "playing_now" operation
    clearTimeout(ListenBrainz.currentPlayingNowDelayId);
    const startPlayingNowDelay = constrainPollingInterval(
      settingsStore.get(settings.ListenBrainz.delay),
    );
    ListenBrainz.currentPlayingNowDelayId = setTimeout(async () => {
      try {
        await operation();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.log("ListenBrainz playing_now error:", { error: errorMessage });
      }
    }, startPlayingNowDelay);
  }
  /**
   * Create track metadata object for ListenBrainz API
   * Ensures all data is properly serializable for multi-scrobbler compatibility
   */
  private static createTrackMetadata(
    title: string,
    artists: string,
    album: string,
    duration: number,
  ) {
    // Create a clean, serializable object
    return {
      additional_info: {
        media_player: "Tidal Hi-Fi",
        submission_client: "Tidal Hi-Fi",
        music_service: tidalUrl,
        duration: Number(duration) || 0,
      },
      artist_name: String(artists || ""),
      track_name: String(title || ""),
      release_name: String(album || ""),
    };
  }

  /**
   * Send data to ListenBrainz API
   */
  private static async sendToListenBrainz(data: any): Promise<void> {
    const apiUrl = settingsStore.get<string, string>(settings.ListenBrainz.api);
    const token = settingsStore.get<string, string>(settings.ListenBrainz.token);

    try {
      // Ensure data is properly serializable by creating a clean copy
      const serializedData = JSON.parse(JSON.stringify(data));

      // CodeQL [js/request-forgery] - User-configured API endpoint is intentional for ListenBrainz integration
      await axios.post(apiUrl, serializedData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      });
    } catch (error: unknown) {
      const isAxiosError = error && typeof error === "object" && "response" in error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const status = isAxiosError ? (error as any).response?.status : undefined;

      Logger.log("ListenBrainz API error details:", {
        url: apiUrl,
        listen_type: data.listen_type,
        error: errorMessage,
        status,
        data: data,
      });
      throw error;
    }
  }

  /**
   * Send a "playing_now" update to ListenBrainz
   */
  public static async sendPlayingNow(
    title: string,
    artists: string,
    album: string,
    duration: number,
  ): Promise<void> {
    try {
      const playing_data = {
        listen_type: "playing_now",
        payload: [
          {
            track_metadata: ListenBrainz.createTrackMetadata(title, artists, album, duration),
          },
        ],
      };

      await ListenBrainz.sendToListenBrainz(playing_data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.log("ListenBrainz playing_now error:", {
        error: errorMessage,
        track: { title, artists, album, duration },
      });
      throw error;
    }
  }

  /**
   * Send a "single" listen (completed track) to ListenBrainz
   * @param title
   * @param artists
   * @param album
   * @param duration
   * @param listenedAt Optional timestamp, defaults to now
   */
  public static async scrobbleSingle(
    title: string,
    artists: string,
    album: string,
    duration: number,
    listenedAt?: number,
  ): Promise<void> {
    try {
      const timestamp = listenedAt ?? Math.floor(Date.now() / 1000);
      const scrobble_data = {
        listen_type: "single",
        payload: [
          {
            listened_at: timestamp,
            track_metadata: ListenBrainz.createTrackMetadata(title, artists, album, duration),
          },
        ],
      };

      await ListenBrainz.sendToListenBrainz(scrobble_data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.log("ListenBrainz scrobble error:", {
        error: errorMessage,
        track: { title, artists, album, duration },
      });
    }
  }

  /**
   * Handle media info updates for ListenBrainz integration
   * Encapsulates all scrobbling logic and state management
   */
  public static handleMediaUpdate(mediaInfo: MediaInfo): void {
    if (
      settingsStore.get(settings.ListenBrainz.enabled) &&
      mediaInfo.status === MediaStatus.playing
    ) {
      const trackKey = `${mediaInfo.title}|${mediaInfo.album}|${mediaInfo.artists}`;
      const currentInSeconds = mediaInfo.currentInSeconds ?? 0;
      const durationInSeconds = mediaInfo.durationInSeconds ?? 0;

      // Check if this is a new track or if the same track has restarted
      const hasRestarted =
        trackKey === ListenBrainz.currentTrackKey &&
        currentInSeconds < ListenBrainz.lastKnownPosition - 30;

      if (trackKey !== ListenBrainz.currentTrackKey || hasRestarted) {
        ListenBrainz.currentTrackKey = trackKey;
        ListenBrainz.currentTrackScrobbled = false;
        ListenBrainz.currentTrackDuration = durationInSeconds;

        // Send "playing_now" for new track, cancelling any pending old "playing_now" operations
        ListenBrainz.executePlayingNowWithDelay(() => {
          return ListenBrainz.sendPlayingNow(
            mediaInfo.title,
            mediaInfo.artists,
            mediaInfo.album,
            durationInSeconds,
          );
        });
      } else if (!ListenBrainz.currentTrackScrobbled) {
        // Check if we should scrobble (half duration or 4 minutes, whichever is sooner)
        const scrobbleThreshold = Math.min(ListenBrainz.currentTrackDuration / 2, 240);

        if (currentInSeconds >= scrobbleThreshold) {
          ListenBrainz.currentTrackScrobbled = true;

          // Send "single" listen (actual scrobble) - no delay needed due to natural listening time throttling
          ListenBrainz.scrobbleSingle(
            mediaInfo.title,
            mediaInfo.artists,
            mediaInfo.album,
            ListenBrainz.currentTrackDuration,
          );
        }
      }

      // Update last known position for restart detection
      ListenBrainz.lastKnownPosition = currentInSeconds;
    }
  }
}
