import { BrowserWindow, Tray } from "electron";

const { getMenu } = require("./menu");

let tray: Tray;

export const addTray = function (mainWindow: BrowserWindow, options = { icon: "" }) {
  tray = new Tray(options.icon);
  tray.setIgnoreDoubleClickEvents(true);
  tray.setToolTip("Tidal-hifi");

  const menu = getMenu(mainWindow);

  tray.setContextMenu(menu);

  tray.on("click", function () {
    if (mainWindow.isVisible()) {
      if (!mainWindow.isFocused()) {
        mainWindow.focus();
      } else {
        mainWindow.hide();
      }
    } else {
      mainWindow.show();
    }
  });
};

export const refreshTray = function (mainWindow: BrowserWindow) {
  if (!tray) {
    addTray(mainWindow);
  }
};
