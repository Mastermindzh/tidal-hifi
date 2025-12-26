import { BrowserWindow, Tray } from "electron";
import { getSystemTrayIcon } from "./iconHelper";
import { getMenu } from "./menu";

let tray: Tray;

export const addTray = function (mainWindow: BrowserWindow, options = { icon: "" }) {
  const iconPath = getSystemTrayIcon(options.icon);
  tray = new Tray(iconPath);
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
