const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
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
const globalEvents = require("./constants/globalEvents");
const discordrpc = require("discord-rpc");
const clientId = '833617820704440341';

let mainWindow;
let discord;
let rpc;
let icon = path.join(__dirname, "../assets/icon.png");

/**
 * Enable live reload in development builds
 */
if (!app.isPackaged) {
  require("electron-reload")(`${__dirname}`, {
    electron: require(`${__dirname}/../node_modules/electron`),
  });
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
    },
  });

  mainWindow.setMenuBarVisibility(store.get(settings.menuBar));

  // load the Tidal website
  mainWindow.loadURL(tidalUrl);

  // run stuff after first load
  mainWindow.webContents.once("did-finish-load", () => {});

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

function initDiscordRPC() {
  rpc = new discordrpc.Client({ transport: 'ipc' });
  rpc.login({ clientId }).catch(console.error);
  
  rpc.on('ready', () => {
    rpc.setActivity({
      details: `Browsing Tidal`,
      largeImageKey: 'tidal-hifi-icon',
      largeImageText: 'Tidal HiFi 2.0.0',
      instance: false,
    });
  })

  discord = setInterval(() => {
    if(mediaInfoModule.mediaInfo.status == 'paused' && rpc) {
      rpc.setActivity({
        details: `Browsing Tidal`,
        largeImageKey: 'tidal-hifi-icon',
        largeImageText: 'Tidal HiFi 2.0.0',
        instance: false,
      });
    } else if(rpc) {
      rpc.setActivity({
        details: `Listening to ${mediaInfoModule.mediaInfo.title}`,
        state: `Artist: ${mediaInfoModule.mediaInfo.artist}`,
        largeImageKey: 'tidal-hifi-icon',
        largeImageText: 'Tidal HiFi 2.0.0',
        buttons: [
          { label: "Play on Tidal", url: mediaInfoModule.mediaInfo.url }
        ],
        instance: false,
      });
    }
  }, 15e3);
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
  store.get(settings.enableDiscord) && initDiscordRPC();
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

ipcMain.on(globalEvents.updateStatus, (event, arg) => {
  mediaInfoModule.updateStatus(arg);
});
ipcMain.on(globalEvents.storeChanged, (event, arg) => {
  mainWindow.setMenuBarVisibility(store.get(settings.menuBar));

  if(store.get(settings.enableDiscord) && !rpc) {
    initDiscordRPC();
  } else if(!store.get(settings.enableDiscord) && rpc) {
    clearInterval(discord);
    rpc.clearActivity();
    rpc.destroy();
    rpc = false;
  }
});

ipcMain.on(globalEvents.error, (event, arg) => {
  console.log(event);
});
