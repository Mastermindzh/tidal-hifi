import axios from "axios";
import Store from "electron-store";
import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";
import { tidalUrl } from "../tidal/url";

export class ListenBrainz {
  /**
   * Create track metadata object for ListenBrainz API
   */
  private static createTrackMetadata(
    title: string,
    artists: string,
    album: string,
    duration: number,
  ) {
    return {
      additional_info: {
        media_player: "Tidal Hi-Fi",
        submission_client: "Tidal Hi-Fi",
        music_service: tidalUrl,
        duration: duration,
      },
      artist_name: artists,
      track_name: title,
      release_name: album,
    };
  }

  /**
   * Send data to ListenBrainz API
   */
  private static async sendToListenBrainz(data: any): Promise<void> {
    await axios.post(
      `${settingsStore.get<string, string>(settings.ListenBrainz.api)}/1/submit-listens`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${settingsStore.get<string, string>(settings.ListenBrainz.token)}`,
        },
      },
    );
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
            track_metadata: this.createTrackMetadata(title, artists, album, duration),
          },
        ],
      };

      await this.sendToListenBrainz(playing_data);
    } catch (error) {
      Logger.log("ListenBrainz playing_now error:", error);
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
      const scrobble_data = {
        listen_type: "single",
        payload: [
          {
            listened_at: listenedAt ?? Math.floor(Date.now() / 1000),
            track_metadata: this.createTrackMetadata(title, artists, album, duration),
          },
        ],
      };

      await this.sendToListenBrainz(scrobble_data);
    } catch (error) {
      Logger.log("ListenBrainz scrobble error:", error);
    }
  }
}
