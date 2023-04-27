let adBlock,
  api,
  disableBackgroundThrottle,
  disableHardwareMediaKeys,
  enableCustomHotkeys,
  enableDiscord,
  gpuRasterization,
  menuBar,
  minimizeOnClose,
  mpris,
  notifications,
  playBackControl,
  port,
  singleInstance,
  skipArtists,
  skippedArtists,
  trayIcon,
  updateFrequency;

const { store, settings } = require("./../../scripts/settings");
const { ipcRenderer } = require("electron");
const globalEvents = require("./../../constants/globalEvents");
const remote = require("@electron/remote");
const { app } = remote;
/**
 * Sync the UI forms with the current settings
 */
function refreshSettings() {
  adBlock.checked = store.get(settings.adBlock);
  api.checked = store.get(settings.api);
  disableBackgroundThrottle.checked = store.get("disableBackgroundThrottle");
  disableHardwareMediaKeys.checked = store.get(settings.flags.disableHardwareMediaKeys);
  enableCustomHotkeys.checked = store.get(settings.enableCustomHotkeys);
  enableDiscord.checked = store.get(settings.enableDiscord);
  gpuRasterization.checked = store.get(settings.flags.gpuRasterization);
  menuBar.checked = store.get(settings.menuBar);
  minimizeOnClose.checked = store.get(settings.minimizeOnClose);
  mpris.checked = store.get(settings.mpris);
  notifications.checked = store.get(settings.notifications);
  playBackControl.checked = store.get(settings.playBackControl);
  port.value = store.get(settings.apiSettings.port);
  singleInstance.checked = store.get(settings.singleInstance);
  skipArtists.checked = store.get(settings.skipArtists);
  skippedArtists.value = store.get(settings.skippedArtists).join("\n");
  trayIcon.checked = store.get(settings.trayIcon);
  updateFrequency.value = store.get(settings.updateFrequency);
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
  app.exit();
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

  adBlock = get("adBlock");
  api = get("apiCheckbox");
  disableBackgroundThrottle = get("disableBackgroundThrottle");
  disableHardwareMediaKeys = get("disableHardwareMediaKeys");
  enableCustomHotkeys = get("enableCustomHotkeys");
  enableDiscord = get("enableDiscord");
  gpuRasterization = get("gpuRasterization");
  menuBar = get("menuBar");
  minimizeOnClose = get("minimizeOnClose");
  mpris = get("mprisCheckbox");
  notifications = get("notifications");
  playBackControl = get("playBackControl");
  port = get("port");
  trayIcon = get("trayIcon");
  skipArtists = get("skipArtists");
  skippedArtists = get("skippedArtists");
  singleInstance = get("singleInstance");
  updateFrequency = get("updateFrequency");

  refreshSettings();

  addInputListener(adBlock, settings.adBlock);
  addInputListener(api, settings.api);
  addInputListener(disableBackgroundThrottle, settings.disableBackgroundThrottle);
  addInputListener(disableHardwareMediaKeys, settings.flags.disableHardwareMediaKeys);
  addInputListener(enableCustomHotkeys, settings.enableCustomHotkeys);
  addInputListener(enableDiscord, settings.enableDiscord);
  addInputListener(gpuRasterization, settings.flags.gpuRasterization);
  addInputListener(menuBar, settings.menuBar);
  addInputListener(minimizeOnClose, settings.minimizeOnClose);
  addInputListener(mpris, settings.mpris);
  addInputListener(notifications, settings.notifications);
  addInputListener(playBackControl, settings.playBackControl);
  addInputListener(port, settings.apiSettings.port);
  addInputListener(skipArtists, settings.skipArtists);
  addTextAreaListener(skippedArtists, settings.skippedArtists);
  addInputListener(singleInstance, settings.singleInstance);
  addInputListener(trayIcon, settings.trayIcon);
  addInputListener(updateFrequency, settings.updateFrequency);
});
