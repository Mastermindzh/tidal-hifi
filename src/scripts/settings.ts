import Store from "electron-store";

import { settings } from "../constants/settings";
import path from "path";
import { BrowserWindow } from "electron";

let settingsWindow: BrowserWindow;

export const settingsStore = new Store({
  defaults: {
    adBlock: false,
    api: true,
    apiSettings: {
      port: 47836,
    },
    customCSS: [],
    disableBackgroundThrottle: true,
    disableHardwareMediaKeys: false,
    enableCustomHotkeys: false,
    enableDiscord: false,
    ListenBrainz: {
      enabled: false,
      api: "https://api.listenbrainz.org",
      token: "",
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
  },
});

const settingsModule = {
  // settings,
  settingsWindow,
};

export const createSettingsWindow = function () {
  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
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

  settingsModule.settingsWindow = settingsWindow;
};

export const showSettingsWindow = function (tab = "general") {
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
