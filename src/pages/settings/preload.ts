import { app } from "@electron/remote";
import { ipcRenderer, shell } from "electron";
import fs from "fs";
import { globalEvents } from "../../constants/globalEvents";
import { settings } from "../../constants/settings";
import { Logger } from "../../features/logger";
import { addCustomCss } from "../../features/theming/theming";
import { settingsStore } from "./../../scripts/settings";
import { getOptions, getOptionsHeader, getThemeListFromDirectory } from "./theming";

// All switches on the settings screen that show additional options based on their state
const switchesWithSettings = {
  listenBrainz: {
    switch: "enableListenBrainz",
    classToHide: "listenbrainz__options",
    settingsKey: settings.ListenBrainz.enabled,
  },
  discord: {
    switch: "enableDiscord",
    classToHide: "discord_options",
    settingsKey: settings.enableDiscord,
  },
};

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
  theme: HTMLSelectElement,
  trayIcon: HTMLInputElement,
  updateFrequency: HTMLInputElement,
  enableListenBrainz: HTMLInputElement,
  ListenBrainzAPI: HTMLInputElement,
  ListenBrainzToken: HTMLInputElement,
  listenbrainz_delay: HTMLInputElement,
  enableWaylandSupport: HTMLInputElement,
  discord_details_prefix: HTMLInputElement,
  discord_include_timestamps: HTMLInputElement,
  discord_button_text: HTMLInputElement;

addCustomCss(app);

function getThemeFiles() {
  const selectElement = document.getElementById("themesList") as HTMLSelectElement;
  const builtInThemes = getThemeListFromDirectory(process.resourcesPath);
  const userThemes = getThemeListFromDirectory(`${app.getPath("userData")}/themes`);

  let allThemes = [
    getOptionsHeader("Built-in Themes"),
    new Option("Tidal - Default", "none"),
  ].concat(getOptions(builtInThemes));

  if (userThemes.length >= 1) {
    allThemes = allThemes.concat([getOptionsHeader("User Themes")]).concat(getOptions(userThemes));
  }

  // empty old options
  const oldOptions = document.querySelectorAll("#themesList option");
  oldOptions.forEach((o) => o.remove());

  allThemes.forEach((option) => {
    selectElement.add(option, null);
  });
}

function handleFileUploads() {
  const fileMessage = document.getElementById("file-message");
  fileMessage.innerText = "or drag and drop files here";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document.getElementById("theme-files").addEventListener("change", function (e: any) {
    Array.from(e.target.files).forEach((file: File) => {
      const destination = `${app.getPath("userData")}/themes/${file.name}`;
      fs.copyFileSync(file.path, destination, null);
    });
    fileMessage.innerText = `${e.target.files.length} files successfully uploaded`;
    getThemeFiles();
  });
}

/**
 * hide or unhide an element
 * @param checked
 * @param toggleOptions
 */
function setElementHidden(
  checked: boolean,
  toggleOptions: { switch: string; classToHide: string }
) {
  const element = document.getElementById(toggleOptions.classToHide);

  checked ? element.classList.remove("hidden") : element.classList.add("hidden");
}

/**
 * Sync the UI forms with the current settings
 */
function refreshSettings() {
  try {
    adBlock.checked = settingsStore.get(settings.adBlock);
    api.checked = settingsStore.get(settings.api);
    customCSS.value = settingsStore.get<string, string[]>(settings.customCSS).join("\n");
    disableBackgroundThrottle.checked = settingsStore.get(settings.disableBackgroundThrottle);
    disableHardwareMediaKeys.checked = settingsStore.get(settings.flags.disableHardwareMediaKeys);
    enableCustomHotkeys.checked = settingsStore.get(settings.enableCustomHotkeys);
    enableDiscord.checked = settingsStore.get(settings.enableDiscord);
    enableWaylandSupport.checked = settingsStore.get(settings.flags.enableWaylandSupport);
    gpuRasterization.checked = settingsStore.get(settings.flags.gpuRasterization);
    menuBar.checked = settingsStore.get(settings.menuBar);
    minimizeOnClose.checked = settingsStore.get(settings.minimizeOnClose);
    mpris.checked = settingsStore.get(settings.mpris);
    notifications.checked = settingsStore.get(settings.notifications);
    playBackControl.checked = settingsStore.get(settings.playBackControl);
    port.value = settingsStore.get(settings.apiSettings.port);
    singleInstance.checked = settingsStore.get(settings.singleInstance);
    skipArtists.checked = settingsStore.get(settings.skipArtists);
    theme.value = settingsStore.get(settings.theme);
    skippedArtists.value = settingsStore.get<string, string[]>(settings.skippedArtists).join("\n");
    trayIcon.checked = settingsStore.get(settings.trayIcon);
    updateFrequency.value = settingsStore.get(settings.updateFrequency);
    enableListenBrainz.checked = settingsStore.get(settings.ListenBrainz.enabled);
    ListenBrainzAPI.value = settingsStore.get(settings.ListenBrainz.api);
    ListenBrainzToken.value = settingsStore.get(settings.ListenBrainz.token);
    listenbrainz_delay.value = settingsStore.get(settings.ListenBrainz.delay);
    discord_details_prefix.value = settingsStore.get(settings.discord.detailsPrefix);
    discord_include_timestamps.checked = settingsStore.get(settings.discord.includeTimestamps);
    discord_button_text.value = settingsStore.get(settings.discord.buttonText);

    // set state of all switches with additional settings
    Object.values(switchesWithSettings).forEach((settingSwitch) => {
      setElementHidden(settingsStore.get(settingSwitch.settingsKey), settingSwitch);
    });
  } catch (error) {
    Logger.log("Refreshing settings failed.", error);
  }
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
 * Bind UI components to functions after DOMContentLoaded
 */
window.addEventListener("DOMContentLoaded", () => {
  function get<T = HTMLInputElement>(id: string): T {
    return document.getElementById(id) as T;
  }

  getThemeFiles();
  handleFileUploads();

  document.getElementById("close").addEventListener("click", hide);
  document.querySelectorAll(".external-link").forEach((elem) =>
    elem.addEventListener("click", function (event) {
      openExternal((event.target as HTMLElement).getAttribute("data-url"));
    })
  );

  function addInputListener(
    source: HTMLInputElement,
    key: string,
    toggleOptions?: { switch: string; classToHide: string }
  ) {
    source.addEventListener("input", () => {
      if (source.value === "on") {
        settingsStore.set(key, source.checked);
      } else {
        settingsStore.set(key, source.value);
      }

      if (toggleOptions) {
        if (source.value === "on" && source.id === toggleOptions.switch) {
          setElementHidden(source.checked, toggleOptions);
        }
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

  function addSelectListener(source: HTMLSelectElement, key: string) {
    source.addEventListener("change", () => {
      settingsStore.set(key, source.value);
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
  enableWaylandSupport = get("enableWaylandSupport");
  gpuRasterization = get("gpuRasterization");
  menuBar = get("menuBar");
  minimizeOnClose = get("minimizeOnClose");
  mpris = get("mprisCheckbox");
  notifications = get("notifications");
  playBackControl = get("playBackControl");
  port = get("port");
  theme = get<HTMLSelectElement>("themesList");
  trayIcon = get("trayIcon");
  skipArtists = get("skipArtists");
  skippedArtists = get("skippedArtists");
  singleInstance = get("singleInstance");
  updateFrequency = get("updateFrequency");
  enableListenBrainz = get("enableListenBrainz");
  ListenBrainzAPI = get("ListenBrainzAPI");
  ListenBrainzToken = get("ListenBrainzToken");
  discord_details_prefix = get("discord_details_prefix");
  discord_include_timestamps = get("discord_include_timestamps");
  listenbrainz_delay = get("listenbrainz_delay");
  discord_button_text = get("discord_button_text");

  refreshSettings();
  addInputListener(adBlock, settings.adBlock);
  addInputListener(api, settings.api);
  addTextAreaListener(customCSS, settings.customCSS);
  addInputListener(disableBackgroundThrottle, settings.disableBackgroundThrottle);
  addInputListener(disableHardwareMediaKeys, settings.flags.disableHardwareMediaKeys);
  addInputListener(enableCustomHotkeys, settings.enableCustomHotkeys);
  addInputListener(enableDiscord, settings.enableDiscord, switchesWithSettings.discord);
  addInputListener(enableWaylandSupport, settings.flags.enableWaylandSupport);
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
  addSelectListener(theme, settings.theme);
  addInputListener(trayIcon, settings.trayIcon);
  addInputListener(updateFrequency, settings.updateFrequency);
  addInputListener(
    enableListenBrainz,
    settings.ListenBrainz.enabled,
    switchesWithSettings.listenBrainz
  );
  addInputListener(ListenBrainzAPI, settings.ListenBrainz.api);
  addInputListener(ListenBrainzToken, settings.ListenBrainz.token);
  addInputListener(listenbrainz_delay, settings.ListenBrainz.delay);
  addInputListener(discord_details_prefix, settings.discord.detailsPrefix);
  addInputListener(discord_include_timestamps, settings.discord.includeTimestamps);
  addInputListener(discord_button_text, settings.discord.buttonText);
});
