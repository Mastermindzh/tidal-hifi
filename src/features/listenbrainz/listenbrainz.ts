import axios from "axios";
import { settingsStore } from "../../scripts/settings";
import { settings } from "../../constants/settings";
import { MediaStatus } from "../../models/mediaStatus";
import Store from "electron-store";

const ListenBrainzStore = new Store({name: "listenbrainz"});

export class ListenBrainz {
  /**
   * Call the ListenBrainz API and create playing now payload
   * @param title
   * @param artists
   * @param status
   * @param duration
   */
  public static async scrobble(title: string, artists: string, status: string, duration: number): Promise<any> {
    try {
      if (status == MediaStatus.paused) {
        return false;
      } else {
        // Fetches the OldData required for scrobbling and proceeds to construct a playing_now data payload for the Playing Now area
        const OldData = ListenBrainzStore.get("OldData") as string[];
        const playing_data = {
            listen_type: "playing_now",
            payload: [
                {
                    track_metadata: {
                        additional_info: {
                            media_player: "Tidal Hi-Fi",
                            submission_client: "Tidal Hi-Fi",
                            music_service: "listen.tidal.com",
                            duration: duration,
                        },
                        artist_name: artists,
                        track_name: title,
                    }
                }
            ]
        };

        await axios.post(`${settingsStore.get(settings.ListenBrainz.api)}/1/submit-listens`, playing_data, {
            headers:{
                "Content-Type": "application/json",
                "Authorization": `Token ${settingsStore.get(settings.ListenBrainz.token)}`
            }
        });
        if (!OldData) {
            ListenBrainzStore.set("OldData", [Math.floor(new Date().getTime() / 1000), title, artists, duration]);
        } else if (OldData[1] != title) {
            // This constructs the data required to scrobble the data after the song finishes
            const scrobble_data = {
                listen_type: "single",
                payload: [
                    {
                        listened_at: OldData[0],
                        track_metadata: {
                            additional_info: {
                                media_player: "Tidal Hi-Fi",
                                submission_client: "Tidal Hi-Fi",
                                music_service: "listen.tidal.com",
                                duration: OldData[3],
                            },
                            artist_name: OldData[2],
                            track_name: OldData[1],
                        }
                    }
                ]
            };
            await axios.post(`${settingsStore.get(settings.ListenBrainz.api)}/1/submit-listens`, scrobble_data, {
                headers:{
                    "Content-Type": "application/json",
                    "Authorization": `Token ${settingsStore.get(settings.ListenBrainz.token)}`
                }
            });
            ListenBrainzStore.set("OldData", [Math.floor(new Date().getTime() / 1000), title, artists, duration]);
        }
      }
    } catch (error) {
      console.log(JSON.stringify(error));
    }
  }
}
