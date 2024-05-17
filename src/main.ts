import { enable, initialize } from "@electron/remote/main";
import { BrowserWindow, app, components, ipcMain, session } from "electron";
import path from "path";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import { startApi } from "./features/api";
import { setDefaultFlags, setManagedFlagsFromSettings } from "./features/flags/flags";
import {
  acquireInhibitorIfInactive,
  releaseInhibitorIfActive,
} from "./features/idleInhibitor/idleInhibitor";
import { Logger } from "./features/logger";
import { Songwhip } from "./features/songwhip/songwhip";
import { initRPC, rpc, unRPC } from "./scripts/discord";
import { addMenu } from "./scripts/menu";
import {
  closeSettingsWindow,
  createSettingsWindow,
  hideSettingsWindow,
  settingsStore,
  showSettingsWindow,
} from "./scripts/settings";
import { addTray, refreshTray } from "./scripts/tray";
import axios from "axios";
import { existsSync, createWriteStream } from "fs";
import { mainTidalState } from "./features/state";
import { TidalState } from "./models/tidalState";
const tidalUrl = "https://listen.tidal.com";
let mainInhibitorId = -1;

initialize();
let mainWindow: BrowserWindow;
const icon = path.join(__dirname, "../assets/icon.png");
const PROTOCOL_PREFIX = "tidal";
const windowPreferences = {
  sandbox: false,
  plugins: true,
  devTools: true, // I like tinkering, others might too
};

setDefaultFlags(app);
setManagedFlagsFromSettings(app);

/**
 * Update the menuBarVisibility according to the store value
 *
 */
function syncMenuBarWithStore() {
  const fixedMenuBar = !!settingsStore.get(settings.menuBar);

  mainWindow.autoHideMenuBar = !fixedMenuBar;
  mainWindow.setMenuBarVisibility(fixedMenuBar);
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

  return tidalUrl + "/" + customProtocolArg.substring(PROTOCOL_PREFIX.length + 3);
}

function createWindow(options = { x: 0, y: 0, backgroundColor: "white" }) {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: options.x,
    y: options.y,
    width: settingsStore?.get(settings.windowBounds.width),
    height: settingsStore?.get(settings.windowBounds.height),
    icon,
    backgroundColor: options.backgroundColor,
    autoHideMenuBar: true,
    webPreferences: {
      ...windowPreferences,
      preload: path.join(__dirname, "preload/index.js"),
      contextIsolation: false,
    },
  });
  enable(mainWindow.webContents);
  registerHttpProtocols();
  syncMenuBarWithStore();

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

  mainWindow.on("close", function (event: CloseEvent) {
    if (settingsStore.get(settings.minimizeOnClose)) {
      event.preventDefault();
      mainWindow.hide();
      refreshTray(mainWindow);
    }
    return false;
  });
  // Emitted when the window is closed.
  mainWindow.on("closed", function () {
    releaseInhibitorIfActive(mainInhibitorId);
    closeSettingsWindow();
    app.quit();
  });
  mainWindow.on("resize", () => {
    const { width, height } = mainWindow.getBounds();
    settingsStore.set(settings.windowBounds.root, { width, height });
  });
  mainWindow.webContents.setWindowOpenHandler(() => {
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        webPreferences: {
          sandbox: false,
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
app.on("ready", async () => {
  // check if the app is the main instance and multiple instances are not allowed
  if (isMainInstance() && !isMultipleInstancesAllowed()) {
    app.on("second-instance", (_, commandLine) => {
      const customProtocolUrl = getCustomProtocolUrl(commandLine);

      if (customProtocolUrl) {
        mainWindow.loadURL(customProtocolUrl);
      }

      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }

  if (isMainInstance() || isMultipleInstancesAllowed()) {
    await components.whenReady();

    // Adblock
    if (settingsStore.get(settings.adBlock)) {
      const filter = { urls: ["https://listen.tidal.com/*"] };
      session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        if (details.url.match(/\/users\/.*\d\?country/)) callback({ cancel: true });
        else callback({ cancel: false });
      });
    }

    createWindow();
    addMenu(mainWindow);
    createSettingsWindow();
    if (settingsStore.get(settings.trayIcon)) {
      addTray(mainWindow, { icon });
      refreshTray(mainWindow);
    }
    settingsStore.get(settings.api) && startApi(mainWindow);
    settingsStore.get(settings.enableDiscord) && initRPC();
  } else {
    app.quit();
  }
});

app.on("activate", function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("browser-window-created", (_, window) => {
  enable(window.webContents);
});

// IPC
ipcMain.on(globalEvents.updateInfo, (_event, arg: TidalState) => {
  Object.assign(mainTidalState, arg);
  if (arg.status === "Playing") {
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

ipcMain.on(globalEvents.refreshMenuBar, () => {
  syncMenuBarWithStore();
});

ipcMain.on(globalEvents.storeChanged, () => {
  syncMenuBarWithStore();

  if (settingsStore.get(settings.enableDiscord) && !rpc) {
    initRPC();
  } else if (!settingsStore.get(settings.enableDiscord) && rpc) {
    unRPC();
  }
});

ipcMain.on(globalEvents.error, (event) => {
  console.log(event);
});

ipcMain.handle(globalEvents.whip, async (_, url) => {
  return Songwhip.whip(url);
});

ipcMain.handle(globalEvents.downloadCover, async (_, id, url) => {
  const targetPath = `${app.getPath("userData")}/cover-${id}.jpg`;
  if (existsSync(targetPath)) return targetPath;
  const res = await axios.get(url, {
    responseType: "stream",
  });
  res.data.pipe(createWriteStream(targetPath));
  return new Promise((resolve, reject) => {
    res.data.on("end", () => resolve(targetPath));
    res.data.on("error", reject);
  });
});

Logger.watch(ipcMain);
