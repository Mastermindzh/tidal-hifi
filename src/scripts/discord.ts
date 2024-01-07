import { Client } from "discord-rpc";
import { app, ipcMain } from "electron";
import { globalEvents } from "../constants/globalEvents";
import { settings } from "../constants/settings";
import { Logger } from "../features/logger";
import { MediaStatus } from "../models/mediaStatus";
import { mediaInfo } from "./mediaInfo";
import { settingsStore } from "./settings";

const clientId = "833617820704440341";

function timeToSeconds(timeArray: string[]) {
  const minutes = parseInt(timeArray[0]) * 1;
  const seconds = minutes * 60 + parseInt(timeArray[1]) * 1;
  return seconds;
}

export let rpc: Client;

const observer = () => {
  if (mediaInfo.status === MediaStatus.paused && rpc) {
    rpc.setActivity(idleStatus);
  } else if (rpc) {
    const currentSeconds = timeToSeconds(mediaInfo.current.split(":"));
    const durationSeconds = timeToSeconds(mediaInfo.duration.split(":"));
    const date = new Date();
    const now = (date.getTime() / 1000) | 0;
    const remaining = date.setSeconds(date.getSeconds() + (durationSeconds - currentSeconds));
    const detailsPrefix =
      settingsStore.get<string, string>(settings.discord.detailsPrefix) ?? "Listening to ";
    const buttonText =
      settingsStore.get<string, string>(settings.discord.buttonText) ?? "Play on TIDAL";
    const includeTimestamps =
      settingsStore.get<string, boolean>(settings.discord.includeTimestamps) ?? true;

    let activity = {
      ...idleStatus,
      ...{
        startTimestamp: includeTimestamps ? now : undefined,
        endTimestamp: includeTimestamps ? remaining : undefined,
      },
    };
    if (mediaInfo.url) {
      activity = {
        ...activity,
        ...{
          details: `${detailsPrefix}${mediaInfo.title}`,
          state: mediaInfo.artists ? mediaInfo.artists : "unknown artist(s)",
          largeImageKey: mediaInfo.image,
          largeImageText: mediaInfo.album ? mediaInfo.album : `${idleStatus.largeImageText}`,
          buttons: [{ label: buttonText, url: mediaInfo.url }],
        },
      };
    } else {
      activity = {
        ...activity,
        ...{
          details: `Watching ${mediaInfo.title}`,
          state: mediaInfo.artists,
        },
      };
    }

    rpc.setActivity(activity);
  }
};

const idleStatus = {
  details: `Browsing Tidal`,
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
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
      Logger.log("Can't connect to Discord, is it running?");
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
