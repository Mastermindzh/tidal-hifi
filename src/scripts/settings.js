const Store = require("electron-store");
const settings = require("./../constants/settings");
const path = require("path");
const { BrowserWindow } = require("electron");

let settingsWindow;

const store = new Store({
  defaults: {
    adBlock: false,
    api: true,
    apiSettings: {
      port: 47836,
    },
    customCSS: "",
    disableBackgroundThrottle: true,
    disableHardwareMediaKeys: false,
    enableCustomHotkeys: false,
    enableDiscord: false,
    flags: {
      gpuRasterization: true,
      disableHardwareMediaKeys: false,
    },
    menuBar: true,
    minimizeOnClose: false,
    mpris: false,
    notifications: true,
    playBackControl: true,
    singleInstance: true,
    skipArtists: false,
    skippedArtists: [""],
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
  store,
  settings,
  settingsWindow,
};

settingsModule.createSettingsWindow = function () {
  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    resizable: false,
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

  settingsWindow.on("close", (event) => {
    if (settingsWindow != null) {
      event.preventDefault();
      settingsWindow.hide();
    }
  });

  settingsWindow.loadURL(`file://${__dirname}/../pages/settings/settings.html`);

  settingsModule.settingsWindow = settingsWindow;
};

settingsModule.showSettingsWindow = function (tab = "general") {
  settingsWindow.webContents.send("goToTab", tab);

  // refresh data just before showing the window
  settingsWindow.webContents.send("refreshData");
  settingsWindow.show();
};
settingsModule.hideSettingsWindow = function () {
  settingsWindow.hide();
};

settingsModule.closeSettingsWindow = function () {
  settingsWindow = null;
};

module.exports = settingsModule;
