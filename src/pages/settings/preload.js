let trayIcon,
  minimizeOnClose,
  mpris,
  enableCustomHotkeys,
  enableDiscord,
  skipArtists,
  notifications,
  playBackControl,
  api,
  port,
  menuBar,
  skippedArtists,
  adBlock,
  disableBackgroundThrottle,
  singleInstance,
  disableHardwareMediaKeys,
  gpuRasterization;

const { store, settings } = require("./../../scripts/settings");
const { ipcRenderer } = require("electron");
const globalEvents = require("./../../constants/globalEvents");
const remote = require("@electron/remote");
const { app } = remote;
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
  mpris.checked = store.get(settings.mpris);
  enableCustomHotkeys.checked = store.get(settings.enableCustomHotkeys);
  enableDiscord.checked = store.get(settings.enableDiscord);
  minimizeOnClose.checked = store.get(settings.minimizeOnClose);
  skipArtists.checked = store.get(settings.skipArtists);
  skippedArtists.value = store.get(settings.skippedArtists).join("\n");
  adBlock.checked = store.get(settings.adBlock);
  singleInstance.checked = store.get(settings.singleInstance);
  disableHardwareMediaKeys.checked = store.get(settings.flags.disableHardwareMediaKeys);
  gpuRasterization.checked = store.get(settings.flags.gpuRasterization);
  disableBackgroundThrottle.checked = store.get("disableBackgroundThrottle");
}

/**
 * Open an url in the default browsers
 */
function openExternal(url) {
  const { shell } = require("electron");
  shell.openExternal(url);
}

/**
 * hide the settings window
 */
function hide() {
  ipcRenderer.send(globalEvents.hideSettings);
}

/**
 * Restart tidal-hifi after changes
 */
function restart() {
  app.relaunch();
  app.quit();
}

/**
 * Bind UI components to functions after DOMContentLoaded
 */
window.addEventListener("DOMContentLoaded", () => {
  function get(id) {
    return document.getElementById(id);
  }

  document.getElementById("close").addEventListener("click", hide);
  document.getElementById("restart").addEventListener("click", restart);
  document.querySelectorAll(".external-link").forEach((elem) =>
    elem.addEventListener("click", function (event) {
      openExternal(event.target.getAttribute("data-url"));
    })
  );

  function addInputListener(source, key) {
    source.addEventListener("input", function (_event, _data) {
      if (this.value === "on") {
        store.set(key, source.checked);
      } else {
        store.set(key, this.value);
      }
      ipcRenderer.send(globalEvents.storeChanged);
    });
  }

  function addTextAreaListener(source, key) {
    source.addEventListener("input", function (_event, _data) {
      store.set(key, source.value.split("\n"));
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
  minimizeOnClose = get("minimizeOnClose");
  mpris = get("mprisCheckbox");
  enableCustomHotkeys = get("enableCustomHotkeys");
  enableDiscord = get("enableDiscord");
  skipArtists = get("skipArtists");
  skippedArtists = get("skippedArtists");
  adBlock = get("adBlock");
  disableBackgroundThrottle = get("disableBackgroundThrottle");
  singleInstance = get("singleInstance");
  disableHardwareMediaKeys = get("disableHardwareMediaKeys");
  gpuRasterization = get("gpuRasterization");

  refreshSettings();

  addInputListener(notifications, settings.notifications);
  addInputListener(playBackControl, settings.playBackControl);
  addInputListener(api, settings.api);
  addInputListener(port, settings.apiSettings.port);
  addInputListener(menuBar, settings.menuBar);
  addInputListener(trayIcon, settings.trayIcon);
  addInputListener(mpris, settings.mpris);
  addInputListener(enableCustomHotkeys, settings.enableCustomHotkeys);
  addInputListener(enableDiscord, settings.enableDiscord);
  addInputListener(minimizeOnClose, settings.minimizeOnClose);
  addInputListener(skipArtists, settings.skipArtists);
  addTextAreaListener(skippedArtists, settings.skippedArtists);
  addInputListener(adBlock, settings.adBlock);
  addInputListener(disableBackgroundThrottle, settings.disableBackgroundThrottle);
  addInputListener(singleInstance, settings.singleInstance);
  addInputListener(disableHardwareMediaKeys, settings.flags.disableHardwareMediaKeys);
  addInputListener(gpuRasterization, settings.flags.gpuRasterization);
});
