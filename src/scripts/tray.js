const { Tray, app } = require("electron");
const { Menu } = require("electron");
const { getMenu, mainMenu } = require("./menu");
const { store, settings } = require("./settings");
const trayModule = {};
let tray;

trayModule.addTray = function (options = { icon: "" }) {
  tray = new Tray(options.icon);
};

trayModule.refreshTray = function (mainWindow) {
  if (!tray) {
    trayModule.addTray();
  }

  tray.on("click", function (e) {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  tray.setToolTip("Tidal-hifi");
  
  if (mainWindow && store.get(settings.minimizeOnClose)) {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Open App",
          click: function () {
            mainWindow.show();
          },
        },
        {
          label: "Close App",
          click: function () {
            mainWindow.destroy();
            app.quit();
          },
        },
      ])
    );
  } else {
    tray.setContextMenu(getMenu());
  }
};

module.exports = trayModule;
