const { Tray } = require("electron");
const { getMenu } = require("./menu");
const trayModule = {};
let tray;

trayModule.addTray = function (mainWindow, options = { icon: "" }) {
  tray = new Tray(options.icon);
  tray.setIgnoreDoubleClickEvents(true);
  tray.setToolTip("Tidal-hifi");

  const menu = getMenu(mainWindow);

  tray.setContextMenu(menu);
};

trayModule.refreshTray = function (mainWindow) {
  if (!tray) {
    trayModule.addTray(mainWindow);
  }
};

module.exports = trayModule;
