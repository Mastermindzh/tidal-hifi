const { app, BrowserWindow, globalShortcut, ipcMain, session } = require("electron");
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

let mainWindow;
let icon = path.join(__dirname, "../assets/icon.png");

/**
 * Enable live reload in development builds
 */
if (!app.isPackaged) {
  require("electron-reload")(`${__dirname}`, {
    electron: require(`${__dirname}/../node_modules/electron`),
  });
}

session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64; rv:98.0) Gecko/20100101 Firefox/98.0';
  callback({ cancel: false, requestHeaders: details.requestHeaders });
});

/**
 * Update the menuBarVisbility according to the store value
 *
 */
function syncMenuBarWithStore() {
  mainWindow.setMenuBarVisibility(store.get(settings.menuBar));
}

function createWindow(options = {}) {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: options.x,
    y: options.y,
    width: store && store.get(settings.windowBounds.width),
    height: store && store.get(settings.windowBounds.height),
    icon,
    tray: true,
    backgroundColor: options.backgroundColor,
    webPreferences: {
      affinity: "window",
      preload: path.join(__dirname, "preload.js"),
      plugins: true,
      devTools: true, // I like tinkering, others might too
      enableRemoteModule: true,
    },
  });

  syncMenuBarWithStore();

  // load the Tidal website
  mainWindow.loadURL(tidalUrl);

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
app.on("ready", () => {
  createWindow();
  addMenu();
  createSettingsWindow();
  addGlobalShortcuts();
  store.get(settings.trayIcon) && addTray({ icon }) && refreshTray();
  store.get(settings.api) && expressModule.run(mainWindow);
  store.get(settings.enableDiscord) && discordModule.initRPC();
  // mainWindow.webContents.openDevTools();
});

app.on("activate", function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC
ipcMain.on(globalEvents.updateInfo, (event, arg) => {
  mediaInfoModule.update(arg);
});

ipcMain.on(globalEvents.hideSettings, (event, arg) => {
  hideSettingsWindow();
});
ipcMain.on(globalEvents.showSettings, (event, arg) => {
  showSettingsWindow();
});

ipcMain.on(globalEvents.refreshMenuBar, (event, arg) => {
  syncMenuBarWithStore();
});

ipcMain.on(globalEvents.storeChanged, (event, arg) => {
  syncMenuBarWithStore();

  if (store.get(settings.enableDiscord) && !discordModule.rpc) {
    discordModule.initRPC();
  } else if (!store.get(settings.enableDiscord) && discordModule.rpc) {
    discordModule.unRPC();
  }
});

ipcMain.on(globalEvents.error, (event, arg) => {
  console.log(event);
});
