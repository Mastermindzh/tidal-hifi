import remote from "@electron/remote";
import { ipcRenderer, shell } from "electron";
import fs from "fs";
import { globalEvents } from "../../constants/globalEvents";
import { settings } from "../../constants/settings";
import { settingsStore } from "./../../scripts/settings";

let adBlock: HTMLInputElement,
  api: HTMLInputElement,
  customCSS: HTMLInputElement,
  disableBackgroundThrottle: HTMLInputElement,
  disableHardwareMediaKeys: HTMLInputElement,
  enableCustomHotkeys: HTMLInputElement,
  enableDiscord: HTMLInputElement,
  gpuRasterization: HTMLInputElement,
  menuBar: HTMLInputElement,
  minimizeOnClose: HTMLInputElement,
  mpris: HTMLInputElement,
  notifications: HTMLInputElement,
  playBackControl: HTMLInputElement,
  port: HTMLInputElement,
  singleInstance: HTMLInputElement,
  skipArtists: HTMLInputElement,
  skippedArtists: HTMLInputElement,
  trayIcon: HTMLInputElement,
  updateFrequency: HTMLInputElement;

function getThemeFiles() {
  const selectElement = document.getElementById("themesList") as HTMLSelectElement;
  const fileNames = fs.readdirSync(process.resourcesPath).filter((file) => file.endsWith(".css"));
  const options = fileNames.map((name) => {
    return new Option(name, name);
  });

  // empty old options
  const oldOptions = document.querySelectorAll("#themesList option");
  oldOptions.forEach((o) => o.remove());

  [new Option("Tidal - Default", "none")].concat(options).forEach((option) => {
    selectElement.add(option, null);
  });
}

function handleFileUploads() {
  const fileMessage = document.getElementById("file-message");
  fileMessage.innerText = "or drag and drop files here";

  document.getElementById("theme-files").addEventListener("change", function (e: any) {
    Array.from(e.target.files).forEach((file: File) => {
      const destination = `${process.resourcesPath}/${file.name}`;
      fs.copyFileSync(file.path, destination, null);
    });
    fileMessage.innerText = `${e.target.files.length} files successfully uploaded`;
    getThemeFiles();
  });
}

/**
 * Sync the UI forms with the current settings
 */
function refreshSettings() {
  adBlock.checked = settingsStore.get(settings.adBlock);
  api.checked = settingsStore.get(settings.api);
  customCSS.value = settingsStore.get(settings.customCSS);
  disableBackgroundThrottle.checked = settingsStore.get(settings.disableBackgroundThrottle);
  disableHardwareMediaKeys.checked = settingsStore.get(settings.flags.disableHardwareMediaKeys);
  enableCustomHotkeys.checked = settingsStore.get(settings.enableCustomHotkeys);
  enableDiscord.checked = settingsStore.get(settings.enableDiscord);
  gpuRasterization.checked = settingsStore.get(settings.flags.gpuRasterization);
  menuBar.checked = settingsStore.get(settings.menuBar);
  minimizeOnClose.checked = settingsStore.get(settings.minimizeOnClose);
  mpris.checked = settingsStore.get(settings.mpris);
  notifications.checked = settingsStore.get(settings.notifications);
  playBackControl.checked = settingsStore.get(settings.playBackControl);
  port.value = settingsStore.get(settings.apiSettings.port);
  singleInstance.checked = settingsStore.get(settings.singleInstance);
  skipArtists.checked = settingsStore.get(settings.skipArtists);
  skippedArtists.value = settingsStore.get<string, string[]>(settings.skippedArtists).join("\n");
  trayIcon.checked = settingsStore.get(settings.trayIcon);
  updateFrequency.value = settingsStore.get(settings.updateFrequency);
}

/**
 * Open an url in the default browsers
 */
function openExternal(url: string) {
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
  remote.app.relaunch();
  remote.app.exit();
}

/**
 * Bind UI components to functions after DOMContentLoaded
 */
window.addEventListener("DOMContentLoaded", () => {
  function get(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
  }

  getThemeFiles();
  handleFileUploads();

  document.getElementById("close").addEventListener("click", hide);
  document.getElementById("restart").addEventListener("click", restart);
  document.querySelectorAll(".external-link").forEach((elem) =>
    elem.addEventListener("click", function (event) {
      openExternal((event.target as HTMLElement).getAttribute("data-url"));
    })
  );

  function addInputListener(source: HTMLInputElement, key: string) {
    source.addEventListener("input", () => {
      if (source.value === "on") {
        settingsStore.set(key, source.checked);
      } else {
        settingsStore.set(key, source.value);
      }
      ipcRenderer.send(globalEvents.storeChanged);
    });
  }

  function addTextAreaListener(source: HTMLInputElement, key: string) {
    source.addEventListener("input", () => {
      settingsStore.set(key, source.value.split("\n"));
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
  customCSS = get("customCSS");
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
  addTextAreaListener(customCSS, settings.customCSS);
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
