const Store = require("electron-store");
const settings = require("./../constants/settings");
const path = require("path");
const { BrowserWindow } = require("electron");

let settingsWindow;

const store = new Store({
  defaults: {
    notifications: true,
    api: true,
    playBackControl: true,
    menuBar: true,
    apiSettings: {
      port: 47836,
    },
    trayIcon: true,
    mpris: false,
    enableCustomHotkeys: false,
    windowBounds: { width: 800, height: 600 },
  },
});

const settingsModule = {
  store,
  settings,
  settingsWindow,
};

settingsModule.createSettingsWindow = function () {
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    show: false,
    frame: false,
    title: "Tidal-hifi - settings",
    webPreferences: {
      affinity: "window",
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
