import { Client, SetActivity } from "@xhayper/discord-rpc";
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

const ACTIVITY_LISTENING = 2;

const observer = () => {
  if (rpc) {
    updateActivity();
  }
};

const defaultPresence = {
  smallImageKey: "tidal-hifi-icon",
  smallImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
  instance: false,
  type: ACTIVITY_LISTENING
};

const updateActivity = () => {
  if (mediaInfo.status === MediaStatus.paused) {
    rpc.user?.clearActivity();
  } else {
    rpc.user?.setActivity(getActivity());
  }
};

const getActivity = (): SetActivity => {
  const presence: SetActivity = { ...defaultPresence };

  includeTimeStamps();
  setPresenceFromMediaInfo();

  return presence;

  /**
   * Pad a string using spaces to at least 2 characters
   * @param input string to pad with 2 characters
   * @returns
   */
  function pad(input: string): string {
    return input.padEnd(2, " ");
  }

  function setPresenceFromMediaInfo() {
    // discord requires a minimum of 2 characters
    const title = pad(mediaInfo.title);
    const album = pad(mediaInfo.album);
    const artists = pad(mediaInfo.artists);

    const detailsPrefix = settingsStore.get<string, string>(settings.discord.detailsPrefix) ?? "Listening to ";
    presence.details = `${detailsPrefix}${title}`;
    presence.state = artists ? artists : "unknown artist(s)";
    if (mediaInfo.url) {
      presence.largeImageKey = mediaInfo.image;
      if (album) presence.largeImageText = album;
    }
  }

  function includeTimeStamps() {
      const currentSeconds = convertDurationToSeconds(mediaInfo.current);
      const durationSeconds = convertDurationToSeconds(mediaInfo.duration);
      const date = new Date();
      const now = Math.floor(date.getTime() / 1000);
      presence.startTimestamp = now - currentSeconds;
      presence.endTimestamp = presence.startTimestamp + durationSeconds;
  }
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpc = new Client({ transport: {type: "ipc"}, clientId });
  rpc.login().then(
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
    rpc.user?.clearActivity();
    rpc.destroy();
    rpc = null;
    ipcMain.removeListener(globalEvents.updateInfo, observer);
  }
};
