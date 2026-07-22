/**
 * IPC channel names used by the renderer <-> main "bridge".
 *
 * These back the privileged operations that used to be performed directly in
 * the (unsandboxed) renderer via `@electron/remote` and Node built-ins. With
 * the main window sandboxed, the renderer delegates them to the main process
 * over these channels instead.
 */
export const bridgeChannels = {
  /** sync: read a settings key, returns the stored value (or undefined) */
  settingsGet: "settings:get",
  /** sync: write a settings key */
  settingsSet: "settings:set",
  /** invoke: show a modal message box, resolves to the chosen button index */
  dialogShowMessageBox: "dialog:showMessageBox",
  /** send: show/replace a desktop notification */
  notificationShow: "notification:show",
  /** send: write text to the system clipboard */
  clipboardWriteText: "clipboard:writeText",
  /** invoke: download album art to the user-data dir, resolves to local path */
  downloadAlbumArt: "media:downloadAlbumArt",
} as const;

/**
 * IPC channels used exclusively by the (context-isolated) settings window
 * preload for privileged operations that used to run directly in the renderer
 * via `@electron/remote` and Node built-ins (theme listing/uploads, tray-icon
 * path checks, opening external links).
 */
export const settingsBridgeChannels = {
  /** invoke: list available theme filenames, resolves to { builtIn, user } */
  listThemes: "settings:listThemes",
  /** invoke: write uploaded .css theme files to the user themes dir */
  uploadThemes: "settings:uploadThemes",
  /** sync: check whether a tray-icon path exists on disk, returns boolean */
  trayIconExists: "settings:trayIconExists",
  /** send: open an external http(s) url in the default browser */
  openExternal: "settings:openExternal",
  /** invoke: get the app version from package.json via app.getVersion() */
  getAppVersion: "settings:getAppVersion",
} as const;
