require("@electron/remote/main").initialize();
const { app, BrowserWindow, components, globalShortcut, ipcMain, protocol } = require("electron");
const {
  settings,
  store,
  createSettingsWindow,
  showSettingsWindow,
  closeSettingsWindow,
  hideSettingsWindow,
} = require("./scripts/settings");
const { addTray, refreshTray } = require("./scripts/tray");
const { addMenu } = require("./scripts/menu");
const path = require("path");
const tidalUrl = "https://listen.tidal.com";
const expressModule = require("./scripts/express");
const mediaKeys = require("./constants/mediaKeys");
const mediaInfoModule = require("./scripts/mediaInfo");
const discordModule = require("./scripts/discord");
const globalEvents = require("./constants/globalEvents");
const flagValues = require("./constants/flags");

let mainWindow;
let icon = path.join(__dirname, "../assets/icon.png");
const PROTOCOL_PREFIX = "tidal";

setFlags();

function setFlags() {
  const flags = store.get().flags;
  if (flags) {
    for (const [key, value] of Object.entries(flags)) {
      if (value) {
        flagValues[key].forEach((flag) => {
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
  const fixedMenuBar = store.get(settings.menuBar);

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

function createWindow(options = {}) {
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
  require("@electron/remote/main").enable(mainWindow.webContents);
  registerHttpProtocols();
  syncMenuBarWithStore();

  // load the Tidal website
  mainWindow.loadURL(tidalUrl);

  if (store.get(settings.disableBackgroundThrottle)) {
    // prevent setInterval lag
    mainWindow.webContents.setBackgroundThrottling(false);
  }

  // run stuff after first load
  mainWindow.webContents.once("did-finish-load", () => {});

  mainWindow.on("close", function (event) {
    if (!app.isQuiting && store.get(settings.minimizeOnClose)) {
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
    let { width, height } = mainWindow.getBounds();

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
      mainWindow.webContents.send("globalEvent", `${mediaKeys[key]}`);
    });
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isMainInstanceOrMultipleInstancesAllowed()) {
    await components.whenReady();
    createWindow();
    addMenu(mainWindow);
    createSettingsWindow();
    addGlobalShortcuts();
    store.get(settings.trayIcon) && addTray(mainWindow, { icon }) && refreshTray();
    store.get(settings.api) && expressModule.run(mainWindow);
    store.get(settings.enableDiscord) && discordModule.initRPC();
    // mainWindow.webContents.openDevTools();
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
  require("@electron/remote/main").enable(window.webContents);
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
