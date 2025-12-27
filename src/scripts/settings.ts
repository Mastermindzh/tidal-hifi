import Store from "electron-store";

import { BrowserWindow, shell } from "electron";
import path from "path";
import { settings } from "../constants/settings";

let settingsWindow: BrowserWindow;
/**
 * Build a migration step for several settings.
 * All settings will be checked and set to the default if non-existent.
 * @param version
 * @param migrationStore
 * @param options
 */
const buildMigration = (
  version: string,
  migrationStore: { get: (str: string) => string; set: (str: string, val: unknown) => void },
  options: Array<{ key: string; value: unknown }>
) => {
  console.log(`running migrations for ${version}`);
  options.forEach(({ key, value }) => {
    const valueToSet = migrationStore.get(key) ?? value;
    console.log(`  - setting ${key} to ${value}`);
    migrationStore.set(key, valueToSet);
  });
};

export const settingsStore = new Store({
  defaults: {
    adBlock: false,
    advanced: {
      tidalUrl: "https://listen.tidal.com",
      userAgent: "default",
    },
    api: true,
    apiSettings: {
      port: 47836,
      hostname: "127.0.0.1",
    },
    customCSS: [],
    disableBackgroundThrottle: true,
    disableHardwareMediaKeys: false,
    enableCustomHotkeys: false,
    enableDiscord: false,
    discord: {
      showSong: true,
      showIdle: true,
      idleText: "Browsing Tidal",
      usingText: "Playing media on TIDAL",
      includeTimestamps: true,
      detailsPrefix: "Listening to ",
      buttonText: "Play on Tidal",
    },
    ListenBrainz: {
      enabled: false,
      api: "https://api.listenbrainz.org",
      token: "",
      delay: 5000,
    },
    flags: {
      disableHardwareMediaKeys: false,
      enableWaylandSupport: true,
      gpuRasterization: true,
    },
    menuBar: true,
    minimizeOnClose: false,
    mpris: false,
    notifications: true,
    playBackControl: true,
    singleInstance: true,
    skipArtists: false,
    skippedArtists: [""],
    staticWindowTitle: false,
    theme: "none",
    trayIcon: true,
    updateFrequency: 500,
    windowBounds: { width: 800, height: 600 },
  },
  migrations: {
    "3.1.0": (migrationStore) => {
      console.log("running migrations for 3.1.0");
      migrationStore.set(
        settings.flags.disableHardwareMediaKeys,
        migrationStore.get("disableHardwareMediaKeys") ?? false
      );
    },
    "5.7.0": (migrationStore) => {
      console.log("running migrations for 5.7.0");
      migrationStore.set(
        settings.ListenBrainz.delay,
        migrationStore.get(settings.ListenBrainz.delay) ?? 5000
      );
    },
    "5.8.0": (migrationStore) => {
      console.log("running migrations for 5.8.0");
      migrationStore.set(
        settings.discord.includeTimestamps,
        migrationStore.get(settings.discord.includeTimestamps) ?? true
      );
    },
    "5.9.0": (migrationStore) => {
      buildMigration("5.9.0", migrationStore, [
        { key: settings.discord.showSong, value: "true" },
        { key: settings.discord.idleText, value: "Browsing Tidal" },
        {
          key: settings.discord.usingText,
          value: "Playing media on TIDAL",
        },
      ]);
    },
    "5.14.0": (migrationStore) => {
      buildMigration("5.14.0", migrationStore, [
        { key: settings.apiSettings.hostname, value: "127.0.0.1" },
      ]);
    },
    "5.15.0": (migrationStore) => {
      buildMigration("5.15.0", migrationStore, [
        { key: settings.advanced.tidalUrl, value: "https://listen.tidal.com" },
      ]);
    },
    "5.16.0": (migrationStore) => {
      buildMigration("5.16.0", migrationStore, [{ key: settings.discord.showIdle, value: "true" }]);
    },
  },
});

const settingsModule = {
  // settings,
  settingsWindow,
};

export const createSettingsWindow = function () {
  settingsWindow = new BrowserWindow({
    width: 650,
    height: 700,
    resizable: true,
    show: false,
    transparent: true,
    frame: false,
    title: "TIDAL Hi-Fi settings",
    webPreferences: {
      preload: path.join(__dirname, "../pages/settings/preload.js"),
      plugins: true,
      nodeIntegration: true,
    },
  });

  settingsWindow.on("close", (event: Event) => {
    if (settingsWindow != null) {
      event.preventDefault();
      settingsWindow.hide();
    }
  });

  settingsWindow.loadURL(`file://${__dirname}/../pages/settings/settings.html`);

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  settingsModule.settingsWindow = settingsWindow;
};

export const showSettingsWindow = function (tab = "general") {
  if (!settingsWindow) {
    console.log("Settings window is not initialized. Attempting to create it.");
    createSettingsWindow();
  }
  settingsWindow.webContents.send("goToTab", tab);

  // refresh data just before showing the window
  settingsWindow.webContents.send("refreshData");
  settingsWindow.show();
};
export const hideSettingsWindow = function () {
  settingsWindow.hide();
};

export const closeSettingsWindow = function () {
  settingsWindow = null;
};

/**
 * add artists to the list of skipped artists
 * @param artists list of artists to append
 */
export const addSkippedArtists = (artists: string[]) => {
  const { skippedArtists } = settings;
  const previousStoreValue = settingsStore.get<string, string[]>(skippedArtists);
  settingsStore.set(skippedArtists, Array.from(new Set([...previousStoreValue, ...artists])));
};

/**
 * Remove artists from the list of skipped artists
 * @param artists list of artists to remove
 */
export const removeSkippedArtists = (artists: string[]) => {
  const { skippedArtists } = settings;
  const previousStoreValue = settingsStore.get<string, string[]>(skippedArtists);
  const filteredArtists = previousStoreValue.filter((value) => ![...artists].includes(value));

  settingsStore.set(skippedArtists, filteredArtists);
};
