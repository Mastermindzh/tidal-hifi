import { Client, Presence } from "discord-rpc";
import { app, ipcMain } from "electron";
import { globalEvents } from "../constants/globalEvents";
import { settings } from "../constants/settings";
import { Logger } from "../features/logger";
import { convertDurationToSeconds } from "../features/time/parse";
import { MediaStatus } from "../models/mediaStatus";
import { mediaInfo } from "./mediaInfo";
import { settingsStore } from "./settings";

const clientId = "833617820704440341";

export let rpc: Client;

const observer = () => {
  if (rpc) {
    updateActivity();
  }
};

const defaultPresence = {
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
  instance: false,
};

const updateActivity = () => {
  const showIdle = settingsStore.get<string, boolean>(settings.discord.showIdle) ?? true;
  if (mediaInfo.status === MediaStatus.paused && !showIdle) {
    rpc.clearActivity();
  } else {
    rpc.setActivity(getActivity());
  }
};

const getActivity = (): Presence => {
  const presence: Presence = { ...defaultPresence };

  if (mediaInfo.status === MediaStatus.paused) {
    presence.details =
      settingsStore.get<string, string>(settings.discord.idleText) ?? "Browsing Tidal";
  } else {
    const showSong = settingsStore.get<string, boolean>(settings.discord.showSong) ?? false;
    if (showSong) {
      const { includeTimestamps, detailsPrefix, buttonText } = getFromStore();
      includeTimeStamps(includeTimestamps);
      setPresenceFromMediaInfo(detailsPrefix, buttonText);
    } else {
      presence.details =
        settingsStore.get<string, string>(settings.discord.usingText) ?? "Playing media on TIDAL";
    }
  }
  return presence;

  function getFromStore() {
    const includeTimestamps =
      settingsStore.get<string, boolean>(settings.discord.includeTimestamps) ?? true;
    const detailsPrefix =
      settingsStore.get<string, string>(settings.discord.detailsPrefix) ?? "Listening to ";
    const buttonText =
      settingsStore.get<string, string>(settings.discord.buttonText) ?? "Play on TIDAL";

    return { includeTimestamps, detailsPrefix, buttonText };
  }

  /**
   * Pad a string using spaces to at least 2 characters
   * @param input string to pad with 2 characters
   * @returns
   */
  function pad(input: string): string {
    return input.padEnd(2, " ");
  }

  function setPresenceFromMediaInfo(detailsPrefix: string, buttonText: string) {
    // discord requires a minimum of 2 characters
    const title = pad(mediaInfo.title);
    const album = pad(mediaInfo.album);
    const artists = pad(mediaInfo.artists);

    if (mediaInfo.url) {
      presence.details = `${detailsPrefix}${title}`;
      presence.state = artists ? artists : "unknown artist(s)";
      presence.largeImageKey = mediaInfo.image;
      if (album) {
        presence.largeImageText = album;
      }

      presence.buttons = [{ label: buttonText, url: mediaInfo.url }];
    } else {
      presence.details = `Watching ${title}`;
      presence.state = artists;
    }
  }

  function includeTimeStamps(includeTimestamps: boolean) {
    if (includeTimestamps) {
      const currentSeconds = convertDurationToSeconds(mediaInfo.current);
      const durationSeconds = convertDurationToSeconds(mediaInfo.duration);
      const date = new Date();
      const now = (date.getTime() / 1000) | 0;
      const remaining = date.setSeconds(date.getSeconds() + (durationSeconds - currentSeconds));
      presence.startTimestamp = now;
      presence.endTimestamp = remaining;
    }
  }
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpc = new Client({ transport: "ipc" });
  rpc.login({ clientId }).then(
    () => {
      rpc.on("ready", () => {
        updateActivity();
      });

      const { updateInfo, play, pause, playPause } = globalEvents;
      [updateInfo, play, pause, playPause].forEach((status) => {
        ipcMain.on(status, observer);
      });
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
