import { Client, Presence } from "discord-rpc";
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
  if (rpc) {
    rpc.setActivity(getActivity());
  }
};
const getActivity = (): Presence | undefined => {
  const presence: Presence | undefined = {
    largeImageKey: "tidal-hifi-icon",
    largeImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
    instance: false,
  };
  if (mediaInfo.status === MediaStatus.paused) {
    presence.details = settingsStore.get<string, string>(settings.discord.idleText) ?? "Browsing Tidal";
  } else {
    const showSong = settingsStore.get<string, boolean>(settings.discord.showSong) ?? false;
    if (showSong) {
      const includeTimestamps =
        settingsStore.get<string, boolean>(settings.discord.includeTimestamps) ?? true;

      if (includeTimestamps) {
        const currentSeconds = timeToSeconds(mediaInfo.current.split(":"));
        const durationSeconds = timeToSeconds(mediaInfo.duration.split(":"));
        const date = new Date();
        const now = (date.getTime() / 1000) | 0;
        const remaining = date.setSeconds(date.getSeconds() + (durationSeconds - currentSeconds));
        presence.startTimestamp = now;
        presence.endTimestamp = remaining;
      }

      const detailsPrefix = settingsStore.get<string, string>(settings.discord.detailsPrefix) ?? "Listening to ";
      const buttonText = settingsStore.get<string, string>(settings.discord.buttonText) ?? "Play on TIDAL";

      if (mediaInfo.url) {
        presence.details = `${detailsPrefix}${mediaInfo.title}`;
        presence.state = mediaInfo.artists ? mediaInfo.artists : "unknown artist(s)";
        presence.largeImageKey = mediaInfo.image;
        if (mediaInfo.album) {
          presence.largeImageText = mediaInfo.album;
        }
        presence.buttons = [{ label: buttonText, url: mediaInfo.url }];
      } else {
        presence.details = `Watching ${mediaInfo.title}`;
        presence.state = mediaInfo.artists;
      }
    } else {
      presence.details = settingsStore.get<string, string>(settings.discord.listeningText) ?? "Listening Tidal";
    }
  }
  return presence;
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpc = new Client({ transport: "ipc" });
  rpc.login({ clientId }).then(
    () => {
      rpc.on("ready", () => {
        rpc.setActivity(getActivity());
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
