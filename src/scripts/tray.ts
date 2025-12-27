import { BrowserWindow, Tray } from "electron";
import { existsSync } from "fs";
import { settings } from "../constants/settings";
import { SUPPORTED_TRAY_ICON_EXTENSIONS } from "../constants/trayIcon";
import { settingsStore } from "./settings";
import { getMenu } from "./menu";

let tray: Tray;

/**
 * Check if the file has a supported image extension
 * @param filePath the file path to check
 * @returns true if the extension is supported
 */
function hasSupportedExtension(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return SUPPORTED_TRAY_ICON_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
}

/**
 * Get the icon path to use for the tray icon
 * Checks if custom path is set and valid, otherwise uses default
 * @param defaultIcon the default bundled icon path
 * @returns the icon path to use
 */
function getTrayIconPath(defaultIcon: string): string {
  const customPath = settingsStore.get<string, string>(settings.trayIconPath);
  
  // Trim once and reuse
  const trimmedPath = customPath?.trim() || "";
  
  // If no custom path or set to "default", use the default icon
  if (trimmedPath === "" || trimmedPath.toLowerCase() === "default") {
    return defaultIcon;
  }
  
  // Check if the path has a supported extension
  if (!hasSupportedExtension(trimmedPath)) {
    return defaultIcon;
  }
  
  // Check if the custom path exists
  if (existsSync(trimmedPath)) {
    return trimmedPath;
  }
  
  // If path doesn't exist, fallback to default
  return defaultIcon;
}

export const addTray = function (mainWindow: BrowserWindow, options = { icon: "" }) {
  const iconPath = getTrayIconPath(options.icon);
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
