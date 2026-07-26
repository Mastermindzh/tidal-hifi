// Restore `util.isError` (removed in Node 23+) before anything loads dbus-next /
// usocket, which still call it. Must stay first. See ./utility/nodeCompat.
import "./utility/nodeCompat";

import path from "node:path";
import { initialize } from "@electron/remote/main";
import { app, BrowserWindow, components, ipcMain, screen, session } from "electron";

import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import values from "./constants/values";
import { startApi } from "./features/api";
import { setDefaultFlags, setManagedFlagsFromSettings } from "./features/flags/flags";
import {
  acquireInhibitorIfInactive,
  releaseInhibitorIfActive,
} from "./features/idleInhibitor/idleInhibitor";
import { registerRendererBridge } from "./features/ipc/rendererBridge";
import { registerSettingsBridge } from "./features/ipc/settingsBridge";
import { ListenBrainz } from "./features/listenbrainz/listenbrainz";
import { Logger } from "./features/logger";
import { addAltKeyMenuBarHandler } from "./features/menuBar/altMenuBar";
import { MprisService } from "./features/mpris/mprisService";
import { SharingService } from "./features/sharingService/sharingService";
import { injectThemeCss, injectThemeCssIfChanged } from "./features/theming/theming";
import { tidalUrl } from "./features/tidal/url";
import { injectTitlebarStyles, removeTitlebarStyles } from "./features/titlebar/titlebar";
import { isWindowTransparencyEnabled } from "./features/windowTransparency/windowTransparency";
import type { MediaInfo } from "./models/mediaInfo";
import { MediaStatus } from "./models/mediaStatus";
import { initRPC, isRPCConnected, unRPC } from "./scripts/discord";
import { updateMediaInfo } from "./scripts/mediaInfo";
import { addMenu } from "./scripts/menu";
import { isSandboxDisabled } from "./scripts/sandbox";
import {
  closeSettingsWindow,
  createSettingsWindow,
  hideSettingsWindow,
  refreshSettingsWindowTheme,
  settingsStore,
  showSettingsWindow,
} from "./scripts/settings";
import { addTray, refreshTray } from "./scripts/tray";

let mainInhibitorId = -1;
let mprisService: MprisService | null;

let mainWindow: BrowserWindow;
const icon = path.join(__dirname, "../assets/icon.png");
const PROTOCOL_PREFIX = "tidal";

const sandboxDisabled = isSandboxDisabled();

const windowPreferences = {
  sandbox: !sandboxDisabled,
  plugins: true,
  devTools: true, // Ensure devTools is enabled for debugging
  contextIsolation: true, // Enable context isolation for Security
};

// Initialize Logger early so we can use it everywhere
Logger.watch(ipcMain);

Logger.log(
  sandboxDisabled
    ? "Renderer sandbox is DISABLED (--no-sandbox or the disableSandbox setting is active)"
    : "Renderer sandbox is ENABLED",
);

// Register the IPC bridge that sandboxed renderers use for privileged
// operations (dialogs, notifications, album-art downloads).
registerRendererBridge();

// Register the IPC bridge used by the context-isolated settings window
// (theme listing/uploads, tray-icon path checks, opening external links).
registerSettingsBridge();

setDefaultFlags(app);
setManagedFlagsFromSettings(app);

/**
 * Update the menuBarVisibility according to the store value
 *
 */
function syncMenuBarWithStore() {
  const fixedMenuBar = !!settingsStore.get(settings.menuBar);
  const disableAltMenuBar = !!settingsStore.get(settings.disableAltMenuBar);

  if (fixedMenuBar) {
    // Menu bar is always visible
    mainWindow.autoHideMenuBar = false;
    mainWindow.setMenuBarVisibility(true);
  } else if (disableAltMenuBar) {
    // Menu bar is completely hidden (no Alt key activation)
    mainWindow.autoHideMenuBar = false;
    mainWindow.setMenuBarVisibility(false);
  } else {
    // Menu bar is hidden but can be shown with Alt key
    mainWindow.autoHideMenuBar = true;
    mainWindow.setMenuBarVisibility(false);
  }
}

/**
 * Perform cleanup operations without quitting the app
 */
function performCleanup(): void {
  try {
    Logger.log("Performing application cleanup...");
    if (isRPCConnected()) {
      unRPC();
    }
    closeSettingsWindow();
    releaseInhibitorIfActive(mainInhibitorId);
    mprisService?.destroy();
    Logger.log("Application cleanup completed");
  } catch (error) {
    Logger.log("Error during cleanup:", error);
  }
}

/**
 * Gracefully shut down the application with proper cleanup
 */
let isQuitting = false;

function gracefulExit(): void {
  performCleanup();
  // Force quit even if cleanup fails
  app.quit();
}

/**
 * @returns true/false based on whether the current window is the main window
 */
function isMainInstance() {
  return app.requestSingleInstanceLock();
}

/**
 * @returns true/false based on whether multiple instances are allowed
 */
function isMultipleInstancesAllowed() {
  return !settingsStore.get(settings.singleInstance);
}

/**
 * @param args the arguments passed to the app
 * @returns the custom protocol url if it exists, otherwise null
 */
function getCustomProtocolUrl(args: string[]) {
  const customProtocolArg = args.find((arg) => arg.startsWith(PROTOCOL_PREFIX));

  if (!customProtocolArg) {
    return null;
  }

  const relativePath = customProtocolArg.substring(PROTOCOL_PREFIX.length + 3);
  const url = `${tidalUrl}/${relativePath}`;

  // Validate that the constructed URL stays within the Tidal domain
  try {
    const parsed = new URL(url);
    const tidalParsed = new URL(tidalUrl);
    // Only ever navigate to web content; never file:, data:, etc.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      Logger.log(`Blocked custom protocol URL with unexpected scheme: ${parsed.protocol}`);
      return null;
    }
    if (parsed.hostname !== tidalParsed.hostname) {
      Logger.log(`Blocked custom protocol URL with unexpected host: ${parsed.hostname}`);
      return null;
    }
  } catch {
    Logger.log(`Invalid custom protocol URL: ${url}`);
    return null;
  }

  return url;
}

/**
 * Configure custom user agent if specified in settings
 */
function configureUserAgent() {
  const customUserAgent = settingsStore.get<string, string>(settings.advanced.userAgent);
  if (
    customUserAgent &&
    customUserAgent !== values.defaultUserAgent &&
    customUserAgent.trim() !== ""
  ) {
    mainWindow.webContents.setUserAgent(customUserAgent);
  }
}

function createWindow({ x = 0, y = 0, backgroundColor = "white" } = {}) {
  // Transparency is opt-in and never enabled on macOS (it caused issues there).
  const transparent = isWindowTransparencyEnabled();
  const showCustomTitlebar = settingsStore.get(settings.showCustomTitlebar);
  const isMac = process.platform === "darwin";

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x,
    y,
    width: settingsStore?.get(settings.windowBounds.width),
    height: settingsStore?.get(settings.windowBounds.height),
    icon,
    // A transparent window still needs a transparent base colour, otherwise the
    // opaque backgroundColor sits behind the page and shows through wherever the
    // (themed) CSS is transparent — defeating the point of a transparent theme.
    backgroundColor: transparent ? "#00000000" : backgroundColor,
    autoHideMenuBar: true,
    // Frameless so the injected custom titlebar replaces the native chrome.
    frame: isMac ? true : !showCustomTitlebar,
    titleBarStyle: isMac && showCustomTitlebar ? "hiddenInset" : "default",
    trafficLightPosition: isMac && showCustomTitlebar ? { x: 14, y: 13 } : undefined,
    transparent,
    webPreferences: {
      ...windowPreferences,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  registerHttpProtocols();
  syncMenuBarWithStore();
  configureUserAgent();
  addAltKeyMenuBarHandler(mainWindow);

  // Inject theme CSS via Chromium-level insertCSS on every page load.
  // This survives SPA hydration / DOM replacement that wipes preload-injected <style> elements.
  mainWindow.webContents.on("did-finish-load", () => {
    injectThemeCss(app, mainWindow.webContents);
    // Same lifecycle hook, same technique: paint the custom titlebar.
    if (settingsStore.get(settings.showCustomTitlebar)) {
      injectTitlebarStyles(mainWindow.webContents);
    }
  });

  // find the custom protocol argument
  const customProtocolUrl = getCustomProtocolUrl(process.argv);

  if (customProtocolUrl) {
    // load the url received from the custom protocol
    mainWindow.loadURL(customProtocolUrl);
  } else {
    // load the Tidal website
    mainWindow.loadURL(tidalUrl);
  }

  if (settingsStore.get(settings.disableBackgroundThrottle)) {
    // prevent setInterval lag
    mainWindow.webContents.setBackgroundThrottling(false);
  }

  app.on("before-quit", () => {
    isQuitting = true;
  });

  mainWindow.on("close", (event: Electron.Event) => {
    if (!isQuitting && settingsStore.get(settings.minimizeOnClose)) {
      event.preventDefault();
      mainWindow.hide();
      refreshTray(mainWindow);
    }
    return false;
  });

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    gracefulExit();
  });
  mainWindow.on("resize", () => {
    // Don't persist maximized/full-screen bounds, otherwise the restored
    // (un-maximized) size gets overwritten with the maximized dimensions.
    if (mainWindow.isMaximized() || mainWindow.isFullScreen()) {
      return;
    }
    const { width, height } = mainWindow.getBounds();
    settingsStore.set(settings.windowBounds.root, { width, height });
  });

  // Transparent windows on Linux (X11/Wayland) don't maximize to fill the
  // screen, they stop at a smaller "limit" (see issue #866). Force the window
  // to the display's work area when maximized to work around this.
  if (process.platform === "linux" && transparent) {
    mainWindow.on("maximize", () => {
      const { workArea } = screen.getDisplayMatching(mainWindow.getBounds());
      mainWindow.setBounds(workArea);
    });
  }
  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        webPreferences: {
          sandbox: !sandboxDisabled,
          plugins: true,
          devTools: true, // I like tinkering, others might too
        },
      },
    };
  });
}

function registerHttpProtocols() {
  if (!app.isDefaultProtocolClient(PROTOCOL_PREFIX)) {
    app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
/**
 * When this is the sole instance, focus/raise the existing window (and honour any
 * incoming custom-protocol URL) instead of letting a second launch spawn a new one.
 */
function registerSecondInstanceHandler() {
  if (!isMainInstance() || isMultipleInstancesAllowed()) {
    return;
  }

  app.on("second-instance", (_, commandLine) => {
    const customProtocolUrl = getCustomProtocolUrl(commandLine);

    if (customProtocolUrl) {
      mainWindow.loadURL(customProtocolUrl);
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * Cancel TIDAL ad/session requests when ad-blocking is enabled.
 */
function setupAdBlock() {
  if (!settingsStore.get(settings.adBlock)) {
    return;
  }

  // TIDAL serves ads and account/session data from the same domain, so there
  // is no `/users/<id>/...` request we can cancel without breaking startup:
  // favorites, clients and subscription are all awaited by the web app before
  // it renders, and cancelling any of them stalls startup for ~110s on an
  // internal retry loop (issue #973).
  const adRequestPatterns: RegExp[] = [
    /\/users\/.*\d\?country/, // original broad rule (blocked everything below)
    // /\/users\/\d+\/subscription\?country/, // subscription tier (drives the Subscribe button)
    // /\/users\/\d+\/favorites\/ids\?country/, // favorite track ids
    // /\/users\/\d+\/clients\?country/, // registered devices
  ];
  const filter = { urls: [`${tidalUrl}/*`] };
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    if (adRequestPatterns.some((pattern) => pattern.test(details.url))) {
      Logger.log(`[adBlock] cancelling request: ${details.url}`);
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });
}

/**
 * Create the main window and start the optional services enabled in settings.
 */
function initializeWindowAndServices() {
  createWindow();
  addMenu(mainWindow);
  createSettingsWindow();
  if (settingsStore.get(settings.trayIcon)) {
    addTray(mainWindow, { icon });
    refreshTray(mainWindow);
  }
  if (settingsStore.get(settings.api)) {
    startApi(mainWindow);
  }
  if (settingsStore.get(settings.enableDiscord)) {
    initRPC();
  }
  if (settingsStore.get(settings.mpris)) {
    mprisService = new MprisService(mainWindow);
    mprisService.initialize();
  }

  // Hide window on startup if startMinimized is enabled
  if (settingsStore.get(settings.startMinimized)) {
    mainWindow.hide();
  }
}

app.on("ready", async () => {
  registerSecondInstanceHandler();

  if (isMainInstance() || isMultipleInstancesAllowed()) {
    await components.whenReady();
    initialize();

    setupAdBlock();
    Logger.log("components ready:", components.status());

    initializeWindowAndServices();
  } else {
    gracefulExit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  // On OS X, apps typically stay active even when all windows are closed
  if (process.platform !== "darwin") {
    gracefulExit();
  } else {
    // On macOS, just clean up services but don't quit
    performCleanup();
  }
});

app.on("before-quit", () => {
  // Ensure cleanup happens even if quit is triggered externally
  performCleanup();
});

// IPC
ipcMain.on(globalEvents.updateInfo, (_event, arg: MediaInfo) => {
  updateMediaInfo(arg);
  ListenBrainz.handleMediaUpdate(arg);

  // Handle MPRIS updates with error recovery
  if (mprisService) {
    try {
      mprisService.updateMetadata(arg);
    } catch (error) {
      Logger.log("Error updating MPRIS metadata from IPC:", error);
      // Attempt to reconnect if the service is not healthy
      if (!mprisService.isHealthy()) {
        Logger.log("MPRIS service appears unhealthy, attempting reconnection...");
        mprisService.forceReconnect();
      }
    }
  }

  if (arg.status === MediaStatus.playing) {
    mainInhibitorId = acquireInhibitorIfInactive(mainInhibitorId);
  } else {
    releaseInhibitorIfActive(mainInhibitorId);
    mainInhibitorId = -1;
  }
});

ipcMain.on(globalEvents.hideSettings, () => {
  hideSettingsWindow();
});
ipcMain.on(globalEvents.showSettings, () => {
  showSettingsWindow();
});

ipcMain.on(globalEvents.resetZoom, () => {
  mainWindow.webContents.setZoomFactor(1.0);
});

ipcMain.on(globalEvents.hardReload, (event) => {
  event.sender.reloadIgnoringCache();
});

ipcMain.on(globalEvents.refreshMenuBar, () => {
  syncMenuBarWithStore();
});

ipcMain.on(globalEvents.storeChanged, () => {
  syncMenuBarWithStore();

  // Re-inject theme + custom CSS only when it actually changed, so appearance
  // changes apply live without flickering the window on unrelated settings.
  injectThemeCssIfChanged(app, mainWindow.webContents);
  refreshSettingsWindowTheme();

  if (settingsStore.get(settings.showCustomTitlebar)) {
    injectTitlebarStyles(mainWindow.webContents);
  } else {
    removeTitlebarStyles(mainWindow.webContents);
  }

  // Notify the main renderer so it can re-apply settings that are otherwise only
  // read at startup (hotkeys, window title).
  mainWindow.webContents.send(globalEvents.storeChanged);

  if (settingsStore.get(settings.enableDiscord) && !isRPCConnected()) {
    initRPC();
  } else if (!settingsStore.get(settings.enableDiscord) && isRPCConnected()) {
    unRPC();
  }

  // Handle MPRIS settings changes
  if (settingsStore.get(settings.mpris) && !mprisService) {
    mprisService = new MprisService(mainWindow);
    mprisService.initialize();
    Logger.log("MPRIS service enabled and initialized");
  } else if (!settingsStore.get(settings.mpris) && mprisService) {
    mprisService.destroy();
    mprisService = null;
    Logger.log("MPRIS service disabled and destroyed");
  } else if (settingsStore.get(settings.mpris) && mprisService && !mprisService.isHealthy()) {
    // If MPRIS is enabled but not healthy, try to restart it
    Logger.log("MPRIS service is enabled but not healthy, restarting...");
    mprisService.forceReconnect();
  }
});

ipcMain.on(globalEvents.error, (event) => {
  Logger.log("Error occurred", { event: event });
});

ipcMain.on(globalEvents.restartApp, () => {
  app.relaunch();
  gracefulExit();
});

ipcMain.on(globalEvents.quit, () => {
  gracefulExit();
});

ipcMain.on(globalEvents.titlebarMinimize, () => {
  mainWindow?.minimize();
});

ipcMain.on(globalEvents.titlebarMaximizeToggle, () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on(globalEvents.titlebarClose, () => {
  mainWindow?.close();
});

ipcMain.handle(globalEvents.getUniversalLink, async (_event, url) => {
  return SharingService.getUniversalLink(url);
});
