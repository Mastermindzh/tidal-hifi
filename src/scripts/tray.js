const { Tray } = require("electron");
const { getMenu } = require("./menu");
const trayModule = {};
let tray;

trayModule.addTray = function (options = { icon: "" }) {
  tray = new Tray(options.icon);
};

trayModule.refreshTray = function () {
  if (!tray) {
    trayModule.addTray();
  }
  tray.on("click", function (e) {
    // do nothing on click
  });

  tray.setToolTip("Tidal-hifi");
  tray.setContextMenu(getMenu());
};

module.exports = trayModule;
