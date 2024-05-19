import { settingsStore } from "../../scripts/settings";
import {
  ListenBrainz,
  ListenBrainzConstants,
  ListenBrainzStore,
} from "../../features/listenbrainz/listenbrainz";
import { settings } from "../../constants/settings";
import { StoreData } from "../../features/listenbrainz/models/storeData";
import { $tidalState } from "../state";

ListenBrainzStore.clear();

let delayTimeout: ReturnType<typeof setTimeout> | null = null;

$tidalState.subscribe((state) => {
  if (!settingsStore.get(settings.ListenBrainz.enabled)) return;
  if (delayTimeout !== null) return;

  const track = state.currentTrack;
  if (!track) return;

  const oldData = ListenBrainzStore.get(ListenBrainzConstants.oldData) as StoreData;
  if ((!oldData && state.status === "Playing") || (oldData && oldData.title !== track.title)) {
    clearTimeout(delayTimeout);
    delayTimeout = setTimeout(
      async () => {
        await ListenBrainz.scrobble(
          track.title,
          track.artists.join(),
          state.status,
          track.duration
        );
        delayTimeout = null;
      },
      settingsStore.get(settings.ListenBrainz.delay) ?? 0
    );
  }
});
