import axios from "axios";
import { ipcRenderer } from "electron";
import Store from "electron-store";
import { settings } from "../../constants/settings";
import { MediaStatus } from "../../models/mediaStatus";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";
import { StoreData } from "./models/storeData";

const ListenBrainzStore = new Store({ name: "listenbrainz" });

export const ListenBrainzConstants = {
  oldData: "oldData",
};

export class ListenBrainz {
  /**
   * Create the object to store old information in the Store :)
   * @param title
   * @param artists
   * @param duration
   * @returns data passed along in an object + a "listenedAt" key with the current time
   */
  private static constructStoreData(title: string, artists: string, duration: number): StoreData {
    return {
      listenedAt: Math.floor(new Date().getTime() / 1000),
      title,
      artists,
      duration,
    };
  }

  /**
   * Call the ListenBrainz API and create playing now payload and scrobble old song
   * @param title
   * @param artists
   * @param status
   * @param duration
   */
  public static async scrobble(
    title: string,
    artists: string,
    status: string,
    duration: number
  ): Promise<void> {
    try {
      if (status === MediaStatus.paused) {
        return;
      } else {
        // Fetches the oldData required for scrobbling and proceeds to construct a playing_now data payload for the Playing Now area
        const oldData = ListenBrainzStore.get(ListenBrainzConstants.oldData) as StoreData;
        const playing_data = {
          listen_type: "playing_now",
          payload: [
            {
              track_metadata: {
                additional_info: {
                  media_player: "Tidal Hi-Fi",
                  submission_client: "Tidal Hi-Fi",
                  music_service: "tidal.com",
                  duration: duration,
                },
                artist_name: artists,
                track_name: title,
              },
            },
          ],
        };

        await axios.post(
          `${settingsStore.get<string, string>(settings.ListenBrainz.api)}/1/submit-listens`,
          playing_data,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${settingsStore.get<string, string>(
                settings.ListenBrainz.token
              )}`,
            },
          }
        );
        if (!oldData) {
          ListenBrainzStore.set(
            ListenBrainzConstants.oldData,
            this.constructStoreData(title, artists, duration)
          );
        } else {
          if (oldData.title !== title) {
            // This constructs the data required to scrobble the data after the song finishes
            const scrobble_data = {
              listen_type: "single",
              payload: [
                {
                  listened_at: oldData.listenedAt,
                  track_metadata: {
                    additional_info: {
                      media_player: "Tidal Hi-Fi",
                      submission_client: "Tidal Hi-Fi",
                      music_service: "listen.tidal.com",
                      duration: oldData.duration,
                    },
                    artist_name: oldData.artists,
                    track_name: oldData.title,
                  },
                },
              ],
            };
            await axios.post(
              `${settingsStore.get<string, string>(settings.ListenBrainz.api)}/1/submit-listens`,
              scrobble_data,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Token ${settingsStore.get<string, string>(
                    settings.ListenBrainz.token
                  )}`,
                },
              }
            );
            ListenBrainzStore.set(
              ListenBrainzConstants.oldData,
              this.constructStoreData(title, artists, duration)
            );
          }
        }
      }
    } catch (error) {
      const logger = new Logger(ipcRenderer);
      logger.log(JSON.stringify(error));
    }
  }
}

export { ListenBrainzStore };
