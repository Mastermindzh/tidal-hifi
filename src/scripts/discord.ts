import { Client, Presence } from "discord-rpc";
import { app, ipcMain } from "electron";
import { globalEvents } from "../constants/globalEvents";
import { settings } from "../constants/settings";
import { Logger } from "../features/logger";
import { settingsStore } from "./settings";
import { mainTidalState } from "../features/state";

const clientId = "833617820704440341";

export let rpc: Client;

const observer = () => {
  if (rpc) {
    rpc.setActivity(getActivity());
  }
};

const defaultPresence = {
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
  instance: false,
};

const getActivity = (): Presence => {
  const presence: Presence = { ...defaultPresence };

  if (mainTidalState.status === "Paused") {
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

  function setPresenceFromMediaInfo(detailsPrefix: string, buttonText: string) {
    const track = mainTidalState.currentTrack;
    if (!track) return;
    if (track.url) {
      presence.details = `${detailsPrefix}${track.title}`;
      presence.state = track.artists.join(", ");
      presence.largeImageKey = track.image;
      if (track.album) {
        presence.largeImageText = track.album;
      }
      presence.buttons = [{ label: buttonText, url: track.url }];
    } else {
      presence.details = `Watching ${track.title}`;
      presence.state = track.artists.join(", ");
    }
  }

  function includeTimeStamps(includeTimestamps: boolean) {
    if (includeTimestamps) {
      const currentSeconds = mainTidalState.currentTrack?.current ?? 0;
      const durationSeconds = mainTidalState.currentTrack?.duration ?? 0;
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
