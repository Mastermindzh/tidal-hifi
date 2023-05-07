import { Client } from "discord-rpc";
import { app, ipcMain } from "electron";
import { globalEvents } from "../constants/globalEvents";
import { MediaStatus } from "../models/mediaStatus";
import { mediaInfo } from "./mediaInfo";

const clientId = "833617820704440341";

function timeToSeconds(timeArray: string[]) {
  const minutes = parseInt(timeArray[0]) * 1;
  const seconds = minutes * 60 + parseInt(timeArray[1]) * 1;
  return seconds;
}

export let rpc: Client;

const observer = () => {
  if (mediaInfo.status == MediaStatus.paused && rpc) {
    rpc.setActivity(idleStatus);
  } else if (rpc) {
    const currentSeconds = timeToSeconds(mediaInfo.current.split(":"));
    const durationSeconds = timeToSeconds(mediaInfo.duration.split(":"));
    const date = new Date();
    const now = (date.getTime() / 1000) | 0;
    const remaining = date.setSeconds(date.getSeconds() + (durationSeconds - currentSeconds));
    if (mediaInfo.url) {
      rpc.setActivity({
        ...idleStatus,
        ...{
          details: `Listening to ${mediaInfo.title}`,
          state: mediaInfo.artists ? mediaInfo.artists : "unknown artist(s)",
          startTimestamp: now,
          endTimestamp: remaining,
          largeImageKey: mediaInfo.image,
          largeImageText: mediaInfo.album ? mediaInfo.album : `${idleStatus.largeImageText}`,
          buttons: [{ label: "Play on Tidal", url: mediaInfo.url }],
        },
      });
    } else {
      rpc.setActivity({
        ...idleStatus,
        ...{
          details: `Watching ${mediaInfo.title}`,
          state: mediaInfo.artists,
          startTimestamp: now,
          endTimestamp: remaining,
        },
      });
    }
  }
};

const idleStatus = {
  details: `Browsing Tidal`,
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `Tidal HiFi ${app.getVersion()}`,
  instance: false,
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpc = new Client({ transport: "ipc" });
  rpc.login({ clientId }).then(
    () => {
      rpc.on("ready", () => {
        rpc.setActivity(idleStatus);
      });
      ipcMain.on(globalEvents.updateInfo, observer);
    },
    () => {
      console.error("Can't connect to Discord, is it running?");
    }
  );
};

/**
 * Remove any RPC connection with discord and remove the event listener on globalEvents.updateInfo
 */
export const unRPC = () => {
  if (rpc) {
    rpc.clearActivity();
    rpc.destroy();
    rpc = null;
    ipcMain.removeListener(globalEvents.updateInfo, observer);
  }
};
