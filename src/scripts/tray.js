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
          label: "Toggle Window",
          click: function () {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
          },
        },
        {
          label: "Quit",
          click: function () {
            mainWindow.destroy();
            app.quit();
          },
        },
        ...mainMenu, //we add menu items from the other context
      ])
    );
  } else {
    tray.setContextMenu(getMenu());
  }
};

module.exports = trayModule;
