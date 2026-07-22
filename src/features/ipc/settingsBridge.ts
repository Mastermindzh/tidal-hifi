import fs from "node:fs";
import path from "node:path";
import { app, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from "electron";

import { settingsBridgeChannels } from "../../constants/bridge";
import { Logger } from "../logger";
import {
  getBuiltInThemeDirectories,
  getThemeListFromDirectory,
  getUserThemeDirectory,
  isSafeThemeName,
} from "../theming/theming";

interface UploadedTheme {
  name: string;
  data: Uint8Array;
}

interface ThemeList {
  builtIn: string[];
  user: string[];
}

/**
 * Validate that an uploaded theme is a safe, *flat* `.css` filename. Uploads
 * come from a file picker, so (unlike theme resolution) nested paths are never
 * expected — layer a basename check on top of the shared safety validation.
 */
function isSafeUploadName(name: string): boolean {
  return isSafeThemeName(name) && name === path.basename(name);
}

/**
 * Read the built-in and user theme lists from disk.
 */
function listThemes(): ThemeList {
  const builtIn = [
    ...new Set(
      getBuiltInThemeDirectories(app).flatMap((dir) => getThemeListFromDirectory(dir, true)),
    ),
  ].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const user = getThemeListFromDirectory(getUserThemeDirectory(app));
  return { builtIn, user };
}

/**
 * `settings:listThemes` — return the built-in and user theme lists.
 */
function handleListThemes(): ThemeList {
  return listThemes();
}

/**
 * `settings:uploadThemes` — persist uploaded `.css` files to the user themes
 * directory, rejecting anything that isn't a safe, flat `.css` filename or that
 * would resolve outside the themes directory. Returns the refreshed theme list.
 */
function handleUploadThemes(_event: IpcMainInvokeEvent, files: UploadedTheme[]): ThemeList {
  if (!Array.isArray(files)) return listThemes();

  const dir = getUserThemeDirectory(app);
  const root = path.resolve(dir) + path.sep;
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    Logger.log(`Failed to create user themes directory: ${dir}`, error);
    return listThemes();
  }

  for (const file of files) {
    if (!file || !isSafeUploadName(file.name) || !(file.data instanceof Uint8Array)) {
      Logger.log("Rejected unsafe theme upload", { name: file?.name });
      continue;
    }
    const destination = path.resolve(dir, file.name);
    if (!destination.startsWith(root)) {
      Logger.log(`Rejected theme upload outside themes directory: ${destination}`);
      continue;
    }
    try {
      fs.writeFileSync(destination, Buffer.from(file.data));
      Logger.log("Theme uploaded", { destination });
    } catch (error) {
      Logger.log(`Failed to write uploaded theme: ${destination}`, error);
    }
  }

  return listThemes();
}

/**
 * `settings:trayIconExists` — synchronously report whether a tray-icon path
 * exists on disk.
 */
function handleTrayIconExists(event: IpcMainEvent, iconPath: string): void {
  try {
    event.returnValue =
      typeof iconPath === "string" && iconPath.length > 0 ? fs.existsSync(iconPath) : false;
  } catch {
    event.returnValue = false;
  }
}

/**
 * `settings:openExternal` — open an external `http(s)` url in the default
 * browser, rejecting any other protocol.
 */
function handleOpenExternal(_event: IpcMainEvent, url: string): void {
  if (!url || typeof url !== "string") return;
  try {
    const { protocol } = new URL(url);
    if (protocol === "https:" || protocol === "http:") {
      shell.openExternal(url);
    } else {
      Logger.log(`Blocked openExternal for unexpected protocol: ${protocol}`);
    }
  } catch {
    Logger.log(`Blocked openExternal for invalid url: ${url}`);
  }
}

/**
 * `settings:getAppVersion` — return the current app version from package.json
 * via Electron's app.getVersion(). Works correctly both in dev and packaged.
 */
function handleGetAppVersion(): string {
  return app.getVersion();
}

/**
 * Register the privileged operations delegated by the context-isolated
 * settings window preload: theme listing/uploads, tray-icon path checks,
 * opening external links, and app version retrieval. All `fs`/`path`/`shell`
 * logic lives here rather than in the renderer.
 */
export function registerSettingsBridge(): void {
  ipcMain.handle(settingsBridgeChannels.listThemes, handleListThemes);
  ipcMain.handle(settingsBridgeChannels.uploadThemes, handleUploadThemes);
  ipcMain.on(settingsBridgeChannels.trayIconExists, handleTrayIconExists);
  ipcMain.on(settingsBridgeChannels.openExternal, handleOpenExternal);
  ipcMain.handle(settingsBridgeChannels.getAppVersion, handleGetAppVersion);
}
