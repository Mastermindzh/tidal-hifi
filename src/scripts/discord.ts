import { Client, type SetActivity } from "@xhayper/discord-rpc";
import { app, ipcMain } from "electron";

import { globalEvents } from "../constants/globalEvents";
import { settings } from "../constants/settings";
import { Logger } from "../features/logger";
import { MediaStatus } from "../models/mediaStatus";
import { mediaInfo } from "./mediaInfo";
import { settingsStore } from "./settingsStore";

const clientId = "833617820704440341";

let rpc: Client | null = null;

/**
 * Whether an active Discord RPC client currently exists.
 */
export const isRPCConnected = (): boolean => rpc !== null;

const ACTIVITY_LISTENING = 2;

// Reconnect backoff. Discord (or the RPC bridge) can disappear at any time; when it does
// the library emits `disconnected` and we keep retrying until it becomes reachable again.
const INITIAL_RETRY_DELAY = 10_000;
const MAX_RETRY_DELAY = 60_000;

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentRetryDelay = INITIAL_RETRY_DELAY;
// Whether the user wants RPC active. Guards reconnects so a torn-down client stays down.
let rpcEnabled = false;
let connecting = false;

const observer = () => {
  if (rpc) {
    updateActivity();
  }
};

const defaultPresence = {
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `TIDAL Hi-Fi ${app.getVersion()}`,
  instance: false,
  type: ACTIVITY_LISTENING,
};

/**
 * Cache of the last payload pushed to Discord. Without this, the observer fires
 * for every IPC event (including the 500 ms `updateInfo` poll) and we'd emit
 * `setActivity` ~7,200 times/hour. Each call allocates a new payload and its
 * unawaited Promise — wasted work and extra GC pressure that also bumps into
 * Discord's rate limit (5 per 20 s). Dedupe by content excluding the jittery
 * `startTimestamp`/`endTimestamp` *values* (derived from `Date.now()`) so identical
 * activity within the same track only sends once — while still keying on whether the
 * timestamps are *present*, so the corrected payload is sent when they go from absent
 * to available at the start of a track (see `includeTimeStamps`).
 *
 * `lastStartTimestamp` is tracked separately so a seek/scrub still updates Discord: during
 * steady playback `startTimestamp` (now − elapsed) stays constant, but a scrub shifts it, so
 * we re-send when it moves beyond a small tolerance without spamming on normal ticks.
 */
let lastActivityKey = "";
let lastStartTimestamp: number | undefined;

// Seconds the derived start timestamp can drift (rounding jitter) before we treat it as a seek.
const SEEK_TOLERANCE_SECONDS = 2;

const updateActivity = () => {
  const showIdle = settingsStore.get<string, boolean>(settings.discord.showIdle) ?? true;
  const isPausedAndHidden = mediaInfo.status === MediaStatus.paused && !showIdle;

  let payloadKey: string;
  let startTimestamp: number | undefined;
  let send: () => Promise<unknown> | undefined;

  if (isPausedAndHidden) {
    payloadKey = "clear";
    send = () => rpc?.user?.clearActivity();
  } else {
    const activity = getActivity();
    // getActivity only ever assigns a numeric epoch; normalize the wider number | Date type.
    startTimestamp =
      typeof activity.startTimestamp === "number" ? activity.startTimestamp : undefined;
    payloadKey = JSON.stringify({
      ...activity,
      // Collapse the timestamps to a presence flag: exclude their shifting values but
      // still re-send when they appear/disappear (e.g. duration becomes known mid-track).
      startTimestamp: activity.startTimestamp !== undefined,
      endTimestamp: activity.endTimestamp !== undefined,
    });
    send = () => rpc?.user?.setActivity(activity);
  }

  // Re-send when the content/presence changes, or when the timeline jumps (a seek/scrub).
  const seeked =
    Math.abs((startTimestamp ?? 0) - (lastStartTimestamp ?? 0)) > SEEK_TOLERANCE_SECONDS;
  if (payloadKey === lastActivityKey && !seeked) return;
  lastActivityKey = payloadKey;
  lastStartTimestamp = startTimestamp;

  send()?.catch((error) => {
    // A rejected send almost always means the socket died mid-session;
    // reconnect instead of letting the presence silently go stale.
    Logger.log("Failed to send activity to Discord", { error });
    if (rpc && !rpc.isConnected) {
      scheduleReconnect();
    }
  });
};

/**
 * Pad a string using spaces to at least 2 characters
 * @param input string to pad with 2 characters
 */
const pad = (input: string): string => input.padEnd(2, " ");

/**
 * Read the Discord "show song" related settings, applying defaults.
 */
const getFromStore = () => {
  const includeTimestamps =
    settingsStore.get<string, boolean>(settings.discord.includeTimestamps) ?? true;
  const detailsPrefix =
    settingsStore.get<string, string>(settings.discord.detailsPrefix) ?? "Listening to ";
  const buttonText =
    settingsStore.get<string, string>(settings.discord.buttonText) ?? "Play on TIDAL";

  return { includeTimestamps, detailsPrefix, buttonText };
};

const getActivity = (): SetActivity => {
  const presence: SetActivity = { ...defaultPresence };

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

  function setPresenceFromMediaInfo(detailsPrefix: string, buttonText: string) {
    // discord requires a minimum of 2 characters
    const title = pad(mediaInfo.title);
    const album = pad(mediaInfo.album);
    const artists = pad(mediaInfo.artists);

    if (mediaInfo.url) {
      presence.statusDisplayType = 1;
      presence.details = `${detailsPrefix}${title}`;
      presence.state = artists || "unknown artist(s)";
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
    const durationSeconds = mediaInfo.durationInSeconds;
    // Skip timestamps until we have a real duration. During a track change TIDAL's media
    // element briefly reports duration = NaN (normalized to 0 by the controller), which
    // would otherwise emit a bogus 00:00 / 00:00 that then sticks for the whole track.
    if (includeTimestamps && durationSeconds > 0) {
      const currentSeconds = mediaInfo.currentInSeconds;
      const now = Math.trunc((Date.now() + 500) / 1000);
      presence.startTimestamp = now - currentSeconds;
      presence.endTimestamp = presence.startTimestamp + durationSeconds;
    }
  }
};

/**
 * Re-publish the current presence after a (re)connect. The dedupe keys are reset so the
 * active track is pushed again even though its content hasn't changed since the drop.
 */
const onReady = () => {
  Logger.log("Connected to Discord");
  currentRetryDelay = INITIAL_RETRY_DELAY;
  lastActivityKey = "";
  lastStartTimestamp = undefined;
  updateActivity();
};

/**
 * Fired when the IPC socket closes (Discord quit, bridge dropped the connection, ...).
 * Keep retrying so "presence" resumes automatically once Discord is reachable again.
 */
const onDisconnected = () => {
  if (!rpcEnabled) return;
  Logger.log("Disconnected from Discord, attempting to reconnect...");
  scheduleReconnect();
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

/**
 * Queue a single reconnect attempt using an exponential backoff capped at MAX_RETRY_DELAY.
 * No-op when RPC is disabled or an attempt is already queued.
 */
const scheduleReconnect = () => {
  if (!rpcEnabled || reconnectTimer) return;
  const delay = currentRetryDelay;
  currentRetryDelay = Math.min(currentRetryDelay * 2, MAX_RETRY_DELAY);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
};

/**
 * Attempt to (re)connect to the Discord IPC socket. A failed login reschedules another
 * attempt with backoff; later drops are handled by the `disconnected` event.
 */
const connect = async () => {
  if (!rpc || connecting || rpc.isConnected) return;
  connecting = true;
  try {
    await rpc.login();
  } catch (error) {
    Logger.log(`Failed to connect to Discord, retrying in ${currentRetryDelay / 1000}s`, { error });
    scheduleReconnect();
  } finally {
    connecting = false;
  }
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
export const initRPC = () => {
  rpcEnabled = true;
  currentRetryDelay = INITIAL_RETRY_DELAY;
  rpc = new Client({ transport: { type: "ipc" }, clientId });
  rpc.on("ready", onReady);
  rpc.on("disconnected", onDisconnected);

  // Register IPC observers once; updateActivity is a no-op while disconnected.
  Object.values(globalEvents).forEach((event) => {
    ipcMain.removeListener(event, observer);
    ipcMain.on(event, observer);
  });

  connect();
};

/**
 * Remove any RPC connection with discord and remove the event listener on globalEvents.updateInfo
 */
export const unRPC = () => {
  rpcEnabled = false;
  clearReconnectTimer();
  currentRetryDelay = INITIAL_RETRY_DELAY;
  if (rpc) {
    // Remove observer first to prevent events during cleanup from triggering activity updates
    Object.values(globalEvents).forEach((event) => {
      ipcMain.removeListener(event, observer);
    });

    try {
      rpc.user?.clearActivity()?.catch(() => {});
    } catch (error) {
      // Discord connection may already be closed; log for diagnostics but continue teardown.
      Logger.log("Clearing Discord activity during unRPC failed", { error });
    }
    rpc.destroy();
    rpc = null;
    lastActivityKey = "";
    lastStartTimestamp = undefined;
  }
};
