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
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;

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
 * Try to login to RPC and retry if it errors
 * @param retryCount Max retry count
 */
const connectWithRetry = async (retryCount = 0) => {
  try {
    await rpc.login();
    Logger.log('Connected to Discord');
    rpc.on("ready", updateActivity);
    Object.values(globalEvents).forEach(event => ipcMain.on(event, observer));
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      Logger.log(`Failed to connect to Discord, retrying in ${RETRY_DELAY/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectWithRetry(retryCount + 1), RETRY_DELAY);
    } else {
      Logger.log('Failed to connect to Discord after maximum retry attempts');
    }
  }
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpc = new Client({ transport: {type: "ipc"}, clientId });
  connectWithRetry();
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
