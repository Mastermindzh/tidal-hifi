const { app, BrowserWindow } = require("electron");
const path = require("path");
const tidalUrl = "https://listen.tidal.com";
let mainWindow;

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
    width: 1024,
    height: 800,
    backgroundColor: options.backgroundColor,
    webPreferences: {
      affinity: "window",
      preload: path.join(__dirname, "preload.js"),
      plugins: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // load the Tidal website
  mainWindow.loadURL(tidalUrl);

  // run stuff after first load
  mainWindow.webContents.once("did-finish-load", () => {});

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    mainWindow = null;
  });
}

function addGlobalShortcuts() {
  // globalShortcut.register("Control+A", () => {
  //   dialog.showErrorBox("test", "test");
  //   // mainWindow.webContents.send("getPlayInfo");
  // });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // window with white backround
  createWindow();
  addGlobalShortcuts();
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
