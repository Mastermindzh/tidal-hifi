import { initialize, enable } from "@electron/remote/main";
import {
  app,
  BrowserWindow,
  components,
  globalShortcut,
  ipcMain,
  protocol,
  session,
} from "electron";
import {
  settings,
  store,
  createSettingsWindow,
  showSettingsWindow,
  closeSettingsWindow,
  hideSettingsWindow,
} from "./scripts/settings";
import { addTray, refreshTray } from "./scripts/tray";
import { addMenu } from "./scripts/menu";
import path from "path";
import { startExpress } from "./scripts/express";
import mediaKeys from "./constants/mediaKeys";
import mediaInfoModule from "./scripts/mediaInfo";
import discordModule from "./scripts/discord";
import globalEvents from "./constants/globalEvents";
import flagValues from "./constants/flags";
const tidalUrl = "https://listen.tidal.com";

initialize();

let mainWindow: BrowserWindow;
const icon = path.join(__dirname, "../assets/icon.png");
const PROTOCOL_PREFIX = "tidal";

setFlags();

function setFlags() {
  const flags = store.get(settings.flags.root);
  if (flags) {
    for (const [key, value] of Object.entries(flags)) {
      if (value) {
        (flagValues as any)[key].forEach((flag: any) => {
          console.log(`enabling command line switch ${flag.flag} with value ${flag.value}`);
          app.commandLine.appendSwitch(flag.flag, flag.value);
        });
      }
    }
  }

  /**
   * Fix Display Compositor issue.
   */
  app.commandLine.appendSwitch("disable-seccomp-filter-sandbox");
}

/**
 * Update the menuBarVisbility according to the store value
 *
 */
function syncMenuBarWithStore() {
  const fixedMenuBar = !!store.get(settings.menuBar);

  mainWindow.autoHideMenuBar = !fixedMenuBar;
  mainWindow.setMenuBarVisibility(fixedMenuBar);
}

/**
 * Determine whether the current window is the main window
 * if singleInstance is requested.
 * If singleInstance isn't requested simply return true
 * @returns true if singInstance is not requested, otherwise true/false based on whether the current window is the main window
 */
function isMainInstanceOrMultipleInstancesAllowed() {
  if (store.get(settings.singleInstance)) {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      return false;
    }
  }
  return true;
}

function createWindow(options = { x: 0, y: 0, backgroundColor: "white" }) {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: options.x,
    y: options.y,
    width: store && store.get(settings.windowBounds.width),
    height: store && store.get(settings.windowBounds.height),
    icon,
    backgroundColor: options.backgroundColor,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
      plugins: true,
      devTools: true, // I like tinkering, others might too
    },
  });
  enable(mainWindow.webContents);
  registerHttpProtocols();
  syncMenuBarWithStore();

  // load the Tidal website
  mainWindow.loadURL(tidalUrl);

  if (store.get(settings.disableBackgroundThrottle)) {
    // prevent setInterval lag
    mainWindow.webContents.setBackgroundThrottling(false);
  }

  mainWindow.on("close", function (event: CloseEvent) {
    if (store.get(settings.minimizeOnClose)) {
      event.preventDefault();
      mainWindow.hide();
      refreshTray(mainWindow);
    }
    return false;
  });
  // Emitted when the window is closed.
  mainWindow.on("closed", function () {
    closeSettingsWindow();
    app.quit();
  });
  mainWindow.on("resize", () => {
    const { width, height } = mainWindow.getBounds();
    store.set(settings.windowBounds.root, { width, height });
  });
}

function registerHttpProtocols() {
  protocol.registerHttpProtocol(PROTOCOL_PREFIX, (request, _callback) => {
    mainWindow.loadURL(`${tidalUrl}/${request.url.substring(PROTOCOL_PREFIX.length + 3)}`);
  });
  if (!app.isDefaultProtocolClient(PROTOCOL_PREFIX)) {
    app.setAsDefaultProtocolClient(PROTOCOL_PREFIX);
  }
}

function addGlobalShortcuts() {
  Object.keys(mediaKeys).forEach((key) => {
    globalShortcut.register(`${key}`, () => {
      mainWindow.webContents.send("globalEvent", `${(mediaKeys as any)[key]}`);
    });
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isMainInstanceOrMultipleInstancesAllowed()) {
    await components.whenReady();

    // Adblock
    if (store.get(settings.adBlock)) {
      const filter = { urls: ["https://listen.tidal.com/*"] };
      session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        if (details.url.match(/\/users\/.*\d\?country/)) callback({ cancel: true });
        else callback({ cancel: false });
      });
    }

    createWindow();
    addMenu(mainWindow);
    createSettingsWindow();
    addGlobalShortcuts();
    if (store.get(settings.trayIcon)) {
      addTray(mainWindow, { icon });
      refreshTray(mainWindow);
    }
    store.get(settings.api) && startExpress(mainWindow);
    store.get(settings.enableDiscord) && discordModule.initRPC();
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
ipcMain.on(globalEvents.updateInfo, (_event, arg) => {
  mediaInfoModule.update(arg);
});

ipcMain.on(globalEvents.hideSettings, (_event, _arg) => {
  hideSettingsWindow();
});
ipcMain.on(globalEvents.showSettings, (_event, _arg) => {
  showSettingsWindow();
});

ipcMain.on(globalEvents.refreshMenuBar, (_event, _arg) => {
  syncMenuBarWithStore();
});

ipcMain.on(globalEvents.storeChanged, (_event, _arg) => {
  syncMenuBarWithStore();

  if (store.get(settings.enableDiscord) && !discordModule.rpc) {
    discordModule.initRPC();
  } else if (!store.get(settings.enableDiscord) && discordModule.rpc) {
    discordModule.unRPC();
  }
});

ipcMain.on(globalEvents.error, (event, _arg) => {
  console.log(event);
});
