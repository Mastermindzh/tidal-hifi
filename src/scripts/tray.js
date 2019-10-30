const { Tray, Menu } = require("electron");
const trayModule = {};
let tray;

trayModule.addTray = function(options = { icon: "" }) {
  tray = new Tray(options.icon);
};

trayModule.refreshTray = function() {
  const contextMenu = Menu.buildFromTemplate([
    { label: "Item1", type: "radio" },
    { label: "Item2", type: "radio" },
    { label: "Item3", type: "radio", checked: true },
    { label: "Item4", type: "radio" },
  ]);
  tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
};

module.exports = trayModule;
