import axios from "axios";

import { settings } from "../../constants/settings";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { settingsStore } from "../../scripts/settingsStore";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { Logger } from "../logger";
import { tidalUrl } from "../tidal/url";

export class ListenBrainz {
  // Internal state for tracking scrobbling
  private static currentTrackKey = "";
  private static currentTrackScrobbled = false;
  private static currentTrackDuration = 0;
  private static lastKnownPosition = 0;
  private static currentPlayingNowDelayId: ReturnType<typeof setTimeout>;

  /** How long to wait for a ListenBrainz request before giving up. */
  private static readonly requestTimeoutMs = 10000;
  /** Number of attempts for transient network failures (e.g. "socket hang up"). */
  private static readonly maxNetworkAttempts = 3;

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
    const additional_info: Record<string, unknown> = {
      media_player: "Tidal Hi-Fi",
      submission_client: "Tidal Hi-Fi",
    };

    // ListenBrainz expects `music_service` to be a bare domain (e.g. "tidal.com"),
    // not a full URL. Sending a URL fails validation with HTTP 400.
    const musicService = ListenBrainz.toDomain(tidalUrl);
    if (musicService) {
      additional_info.music_service = musicService;
    }

    // ListenBrainz rejects the entire submission with HTTP 400 when `duration`
    // is present but not a positive integer, so only include it when known.
    const normalizedDuration = Number(duration);
    if (Number.isFinite(normalizedDuration) && normalizedDuration > 0) {
      additional_info.duration = Math.round(normalizedDuration);
    }

    const track_metadata: Record<string, unknown> = {
      additional_info,
      artist_name: String(artists || ""),
      track_name: String(title || ""),
    };

    // Optional fields must be omitted entirely when unknown otherwise it'll throw a 400
    const release_name = String(album || "").trim();
    if (release_name) {
      track_metadata.release_name = release_name;
    }

    return track_metadata;
  }

  /**
   * Extract the bare domain (hostname without a leading "www.") from a URL so it
   * can be used as the ListenBrainz `music_service` value.
   */
  private static toDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
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
      await ListenBrainz.postWithRetry(apiUrl, serializedData, token);
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
   * POST to ListenBrainz, retrying transient network failures (e.g. the
   * frequent "socket hang up" the ListenBrainz API returns) with a short
   * exponential backoff. HTTP responses (4xx/5xx) are never retried since the
   * server already answered.
   */
  private static async postWithRetry(apiUrl: string, data: any, token: string): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        await axios.post(apiUrl, data, {
          timeout: ListenBrainz.requestTimeoutMs,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        });
        return;
      } catch (error: unknown) {
        const hasResponse =
          !!error && typeof error === "object" && "response" in error && !!(error as any).response;

        // Only retry when the server never responded (network-level failure).
        if (hasResponse || attempt >= ListenBrainz.maxNetworkAttempts) {
          throw error;
        }

        const backoffMs = 500 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
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
        // Check if we should scrobble (half duration or 4 minutes, whichever is sooner).
        // When the duration is unknown (0), fall back to the 4 minute rule instead of
        // scrobbling immediately (which would also submit an invalid duration).
        const scrobbleThreshold =
          ListenBrainz.currentTrackDuration > 0
            ? Math.min(ListenBrainz.currentTrackDuration / 2, 240)
            : 240;

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
