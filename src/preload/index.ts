import "./integrations/mpris";
import "./integrations/listenbrainz";
import "./integrations/hotkeys";
import "./integrations/ipc";
import "./integrations/notifications";
import "./integrations/skipArtists";
import { ipcRenderer } from "electron";
import { globalEvents } from "../constants/globalEvents";
import { addCustomCss } from "../features/theming/theming";
import { app } from "@electron/remote";

window.document.addEventListener("fullscreenchange", () => {
  ipcRenderer.send(globalEvents.refreshMenuBar);
});
addCustomCss(app);
