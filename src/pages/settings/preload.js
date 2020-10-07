let notifications;
let playBackControl;
let api;
let port;
let menuBar;

const { store, settings } = require("./../../scripts/settings");
const { ipcRenderer } = require("electron");
const globalEvents = require("./../../constants/globalEvents");

/**
 * Sync the UI forms with the current settings
 */
function refreshSettings() {
  notifications.checked = store.get(settings.notifications);
  playBackControl.checked = store.get(settings.playBackControl);
  api.checked = store.get(settings.api);
  port.value = store.get(settings.apiSettings.port);
  menuBar.checked = store.get(settings.menuBar);
  trayIcon.checked = store.get(settings.trayIcon);
  // mpris.checked = store.get(settings.mpris);
}

/**
 * Open an url in the default browsers
 */
window.openExternal = function (url) {
  const { shell } = require("electron");
  shell.openExternal(url);
};

/**
 * hide the settings window
 */
window.hide = function () {
  ipcRenderer.send(globalEvents.hideSettings);
};

/**
 * Restart tidal-hifi after changes
 */
window.restart = function () {
  const remote = require("electron").remote;
  remote.app.relaunch();
  remote.app.exit(0);
};

/**
 * Bind UI components to functions after DOMContentLoaded
 */
window.addEventListener("DOMContentLoaded", () => {
  function get(id) {
    return document.getElementById(id);
  }

  function addInputListener(source, key) {
    source.addEventListener("input", function (event, data) {
      if (this.value === "on") {
        store.set(key, source.checked);
      } else {
        store.set(key, this.value);
      }
      ipcRenderer.send(globalEvents.storeChanged);
    });
  }

  ipcRenderer.on("refreshData", () => {
    refreshSettings();
  });

  ipcRenderer.on("goToTab", (_, tab) => {
    document.getElementById(tab).click();
  });

  notifications = get("notifications");
  playBackControl = get("playBackControl");
  api = get("apiCheckbox");
  port = get("port");
  menuBar = get("menuBar");
  trayIcon = get("trayIcon");
  // mpris = get("mprisCheckbox");

  refreshSettings();

  addInputListener(notifications, settings.notifications);
  addInputListener(playBackControl, settings.playBackControl);
  addInputListener(api, settings.api);
  addInputListener(port, settings.apiSettings.port);
  addInputListener(menuBar, settings.menuBar);
  addInputListener(trayIcon, settings.trayIcon);
  // addInputListener(mpris, settings.mpris);
});
