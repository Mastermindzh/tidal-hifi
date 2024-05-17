import { ipcRenderer } from "electron";
import { globalEvents } from "../../constants/globalEvents";
import {
  $tidalState,
  favoriteCurrentTrack,
  next,
  pause,
  play,
  playPause,
  previous,
  toggleRepeat,
  toggleShuffle,
} from "../state";

/**
 * Add ipc event listeners.
 * Some actions triggered outside of the site need info from the site.
 */
const handlers: Partial<Record<keyof typeof globalEvents, () => void>> = {
  [globalEvents.playPause]: playPause,
  [globalEvents.play]: play,
  [globalEvents.pause]: pause,
  [globalEvents.next]: next,
  [globalEvents.previous]: previous,
  [globalEvents.toggleFavorite]: favoriteCurrentTrack,
  [globalEvents.toggleShuffle]: toggleShuffle,
  [globalEvents.toggleRepeat]: toggleRepeat,
};
ipcRenderer.on("globalEvent", (_, event) => {
  handlers[event as keyof typeof globalEvents]?.();
});

$tidalState.subscribe((state) => {
  ipcRenderer.send(globalEvents.updateInfo, state);
});
