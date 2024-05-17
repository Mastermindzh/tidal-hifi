import { settingsStore } from "../../scripts/settings";
import { $tidalState, coverArtPaths } from "../state";
import { settings } from "../../constants/settings";
import { Notification } from "@electron/remote";

let currentNotification: Electron.Notification | undefined;

$tidalState.subscribe(async (state, prevState) => {
  if (!settingsStore.get(settings.notifications)) return;
  if (!state.currentTrack) return;

  if (state.currentTrack.id === prevState.currentTrack?.id) return;

  currentNotification?.close();
  if (state.status !== "Playing") return;
  const icon = await coverArtPaths.get(state.currentTrack.image);
  currentNotification = new Notification({
    title: state.currentTrack.title,
    body: state.currentTrack.artists.join(", "),
    icon,
  });
  currentNotification.show();
});
