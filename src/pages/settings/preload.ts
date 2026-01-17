import fs from "node:fs";
import { app } from "@electron/remote";
import { ipcRenderer, shell } from "electron";

import { globalEvents } from "../../constants/globalEvents";
import { settings } from "../../constants/settings";
import { SUPPORTED_TRAY_ICON_EXTENSIONS } from "../../constants/trayIcon";
import { Logger } from "../../features/logger";
import { addCustomCss } from "../../features/theming/theming";
import { settingsStore } from "../../scripts/settings";
import { cssFilter, getOptions, getOptionsHeader, getThemeListFromDirectory } from "./theming";

// All switches on the settings screen that show additional options based on their state
const switchesWithSettings = {
  tray: {
    switch: "trayIcon",
    classToHide: "tray__options",
    settingsKey: settings.trayIcon,
  },
  api: {
    switch: "apiCheckbox",
    classToHide: "api__options",
    settingsKey: settings.api,
  },
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
  discord_show_song: {
    switch: "discord_show_song",
    classToHide: "discord_show_song_options",
    settingsKey: settings.discord.showSong,
  },
};

let adBlock: HTMLInputElement,
  api: HTMLInputElement,
  channel: HTMLSelectElement,
  customCSS: HTMLInputElement,
  disableAltMenuBar: HTMLInputElement,
  disableBackgroundThrottle: HTMLInputElement,
  disableHardwareMediaKeys: HTMLInputElement,
  enableCustomHotkeys: HTMLInputElement,
  enableDiscord: HTMLInputElement,
  gpuRasterization: HTMLInputElement,
  hostname: HTMLInputElement,
  menuBar: HTMLInputElement,
  minimizeOnClose: HTMLInputElement,
  mpris: HTMLInputElement,
  notifications: HTMLInputElement,
  playBackControl: HTMLInputElement,
  port: HTMLInputElement,
  singleInstance: HTMLInputElement,
  skipArtists: HTMLInputElement,
  skippedArtists: HTMLInputElement,
  startMinimized: HTMLInputElement,
  staticWindowTitle: HTMLInputElement,
  theme: HTMLSelectElement,
  trayIcon: HTMLInputElement,
  trayIconPath: HTMLInputElement,
  updateFrequency: HTMLInputElement,
  enableListenBrainz: HTMLInputElement,
  ListenBrainzAPI: HTMLInputElement,
  ListenBrainzToken: HTMLInputElement,
  listenbrainz_delay: HTMLInputElement,
  enableWaylandSupport: HTMLInputElement,
  discord_details_prefix: HTMLInputElement,
  discord_include_timestamps: HTMLInputElement,
  discord_button_text: HTMLInputElement,
  discord_show_song: HTMLInputElement,
  discord_show_idle: HTMLInputElement,
  discord_idle_text: HTMLInputElement,
  discord_using_text: HTMLInputElement,
  userAgent: HTMLInputElement,
  controllerType: HTMLSelectElement;

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
  oldOptions.forEach((o) => {
    o.remove();
  });

  allThemes.forEach((option) => {
    selectElement.add(option, null);
  });
}

function handleFileUploads() {
  const fileMessage = document.getElementById("file-message");
  fileMessage.innerText = "or drag and drop files here";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document.getElementById("theme-files").addEventListener("change", async (e: any) => {
    if (!e.target.files || e.target.files.length === 0) {
      fileMessage.classList.add("hidden");
      return;
    }
    const newThemes = (Array.from(e.target.files) as File[]).filter((f) => cssFilter(f.name));
    if (newThemes.length === 0) {
      fileMessage.innerText = "No valid .css files found in the selected files.";
      fileMessage.classList.remove("hidden");
      return;
    }
    for (const file of newThemes as File[]) {
      const destination = `${app.getPath("userData")}/themes/${file.name}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(destination, buffer);
      Logger.log("written file!", { destination });
    }
    fileMessage.innerText = `${e.target.files.length} files successfully uploaded`;
    fileMessage.classList.remove("hidden");
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
  toggleOptions: { switch: string; classToHide: string },
) {
  const element = document.getElementById(toggleOptions.classToHide);

  checked ? element.classList.remove("hidden") : element.classList.add("hidden");
}

/**
 * Validate tray icon path and show feedback
 * @param path the path to validate
 * @param validationElement the element to show validation messages (null if not found)
 * @returns true if valid
 */
function validateTrayIconPath(path: string, validationElement: HTMLElement | null): boolean {
  if (!validationElement) {
    // If validation element doesn't exist, still validate but don't show UI feedback
    const trimmedPath = path.trim();
    if (trimmedPath === "" || trimmedPath.toLowerCase() === "default") {
      return true;
    }
    const lowerPath = trimmedPath.toLowerCase();
    const hasValidExtension = SUPPORTED_TRAY_ICON_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
    return hasValidExtension && fs.existsSync(trimmedPath);
  }

  const trimmedPath = path.trim();

  // Empty or "default" is valid
  if (trimmedPath === "" || trimmedPath.toLowerCase() === "default") {
    validationElement.style.display = "none";
    return true;
  }

  // Check for supported extensions (SVG not supported)
  const lowerPath = trimmedPath.toLowerCase();
  const hasValidExtension = SUPPORTED_TRAY_ICON_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));

  if (!hasValidExtension) {
    validationElement.textContent =
      "⚠️ Unsupported file format. Use PNG, JPG, JPEG, ICO, BMP, or GIF (SVG not supported).";
    validationElement.style.display = "block";
    return false;
  }

  // Check if file exists
  if (!fs.existsSync(trimmedPath)) {
    validationElement.textContent = "⚠️ File not found. Please check the path.";
    validationElement.style.display = "block";
    return false;
  }

  // Valid!
  validationElement.style.display = "none";
  return true;
}

/**
 * Sync the UI forms with the current settings
 */
function refreshSettings() {
  try {
    adBlock.checked = settingsStore.get(settings.adBlock);
    api.checked = settingsStore.get(settings.api);
    channel.value = settingsStore.get(settings.advanced.tidalUrl);
    customCSS.value = settingsStore.get<string, string[]>(settings.customCSS).join("\n");
    disableAltMenuBar.checked = settingsStore.get(settings.disableAltMenuBar);
    disableBackgroundThrottle.checked = settingsStore.get(settings.disableBackgroundThrottle);
    disableHardwareMediaKeys.checked = settingsStore.get(settings.flags.disableHardwareMediaKeys);
    enableCustomHotkeys.checked = settingsStore.get(settings.enableCustomHotkeys);
    enableDiscord.checked = settingsStore.get(settings.enableDiscord);
    enableWaylandSupport.checked = settingsStore.get(settings.flags.enableWaylandSupport);
    gpuRasterization.checked = settingsStore.get(settings.flags.gpuRasterization);
    hostname.value = settingsStore.get(settings.apiSettings.hostname);
    menuBar.checked = settingsStore.get(settings.menuBar);
    minimizeOnClose.checked = settingsStore.get(settings.minimizeOnClose);
    mpris.checked = settingsStore.get(settings.mpris);
    notifications.checked = settingsStore.get(settings.notifications);
    playBackControl.checked = settingsStore.get(settings.playBackControl);
    port.value = settingsStore.get(settings.apiSettings.port);
    singleInstance.checked = settingsStore.get(settings.singleInstance);
    skipArtists.checked = settingsStore.get(settings.skipArtists);
    skippedArtists.value = settingsStore.get<string, string[]>(settings.skippedArtists).join("\n");
    startMinimized.checked = settingsStore.get(settings.startMinimized);
    staticWindowTitle.checked = settingsStore.get(settings.staticWindowTitle);
    theme.value = settingsStore.get(settings.theme);
    trayIcon.checked = settingsStore.get(settings.trayIcon);
    trayIconPath.value = settingsStore.get(settings.trayIconPath) || "";

    // Validate tray icon path on load
    const validationElement = document.getElementById("trayIconPathValidation");
    if (validationElement) {
      validateTrayIconPath(trayIconPath.value, validationElement);
    }

    updateFrequency.value = settingsStore.get(settings.updateFrequency);
    enableListenBrainz.checked = settingsStore.get(settings.ListenBrainz.enabled);
    ListenBrainzAPI.value = settingsStore.get(settings.ListenBrainz.api);
    ListenBrainzToken.value = settingsStore.get(settings.ListenBrainz.token);
    listenbrainz_delay.value = settingsStore.get(settings.ListenBrainz.delay);
    discord_details_prefix.value = settingsStore.get(settings.discord.detailsPrefix);
    discord_include_timestamps.checked = settingsStore.get(settings.discord.includeTimestamps);
    discord_button_text.value = settingsStore.get(settings.discord.buttonText);
    discord_show_song.checked = settingsStore.get(settings.discord.showSong);
    discord_show_idle.checked = settingsStore.get(settings.discord.showIdle);
    discord_idle_text.value = settingsStore.get(settings.discord.idleText);
    discord_using_text.value = settingsStore.get(settings.discord.usingText);
    userAgent.value = settingsStore.get(settings.advanced.userAgent);
    controllerType.value = settingsStore.get(settings.advanced.controllerType);

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
  document.getElementById("resetZoom")?.addEventListener("click", () => {
    ipcRenderer.send(globalEvents.resetZoom);
  });
  document.querySelectorAll(".external-link").forEach((elem) => {
    elem.addEventListener("click", (event) => {
      openExternal((event.target as HTMLElement).getAttribute("data-url"));
    });
  });

  function addInputListener(
    source: HTMLInputElement,
    key: string,
    toggleOptions?: { switch: string; classToHide: string },
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

  function addTrayIconPathListener(source: HTMLInputElement, key: string) {
    const validationElement = document.getElementById("trayIconPathValidation");

    source.addEventListener("input", () => {
      const isValid = validateTrayIconPath(source.value, validationElement);
      settingsStore.set(key, source.value);

      // Only send storeChanged if valid to avoid unnecessary reloads
      if (isValid) {
        ipcRenderer.send(globalEvents.storeChanged);
      }
    });

    // Also validate on blur (when user leaves the field)
    source.addEventListener("blur", () => {
      validateTrayIconPath(source.value, validationElement);
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
  channel = get<HTMLSelectElement>("channel");
  customCSS = get("customCSS");
  disableAltMenuBar = get("disableAltMenuBar");
  disableBackgroundThrottle = get("disableBackgroundThrottle");
  disableHardwareMediaKeys = get("disableHardwareMediaKeys");
  enableCustomHotkeys = get("enableCustomHotkeys");
  enableDiscord = get("enableDiscord");
  enableWaylandSupport = get("enableWaylandSupport");
  gpuRasterization = get("gpuRasterization");
  hostname = get("hostname");
  menuBar = get("menuBar");
  minimizeOnClose = get("minimizeOnClose");
  mpris = get("mprisCheckbox");
  notifications = get("notifications");
  playBackControl = get("playBackControl");
  port = get("port");
  theme = get<HTMLSelectElement>("themesList");
  trayIcon = get("trayIcon");
  trayIconPath = get("trayIconPath");
  skipArtists = get("skipArtists");
  skippedArtists = get("skippedArtists");
  startMinimized = get("startMinimized");
  staticWindowTitle = get("staticWindowTitle");
  singleInstance = get("singleInstance");
  updateFrequency = get("updateFrequency");
  enableListenBrainz = get("enableListenBrainz");
  ListenBrainzAPI = get("ListenBrainzAPI");
  ListenBrainzToken = get("ListenBrainzToken");
  discord_details_prefix = get("discord_details_prefix");
  discord_include_timestamps = get("discord_include_timestamps");
  listenbrainz_delay = get("listenbrainz_delay");
  discord_button_text = get("discord_button_text");
  discord_show_song = get("discord_show_song");
  discord_show_idle = get("discord_show_idle");
  discord_using_text = get("discord_using_text");
  discord_idle_text = get("discord_idle_text");
  userAgent = get("userAgent");
  controllerType = get<HTMLSelectElement>("controllerType");

  refreshSettings();
  addInputListener(adBlock, settings.adBlock);
  addInputListener(api, settings.api, switchesWithSettings.api);
  addSelectListener(channel, settings.advanced.tidalUrl);
  addTextAreaListener(customCSS, settings.customCSS);
  addInputListener(disableAltMenuBar, settings.disableAltMenuBar);
  addInputListener(disableBackgroundThrottle, settings.disableBackgroundThrottle);
  addInputListener(disableHardwareMediaKeys, settings.flags.disableHardwareMediaKeys);
  addInputListener(enableCustomHotkeys, settings.enableCustomHotkeys);
  addInputListener(enableDiscord, settings.enableDiscord, switchesWithSettings.discord);
  addInputListener(enableWaylandSupport, settings.flags.enableWaylandSupport);
  addInputListener(gpuRasterization, settings.flags.gpuRasterization);
  addInputListener(hostname, settings.apiSettings.hostname);
  addInputListener(menuBar, settings.menuBar);
  addInputListener(minimizeOnClose, settings.minimizeOnClose);
  addInputListener(mpris, settings.mpris);
  addInputListener(notifications, settings.notifications);
  addInputListener(playBackControl, settings.playBackControl);
  addInputListener(port, settings.apiSettings.port);
  addInputListener(skipArtists, settings.skipArtists);
  addTextAreaListener(skippedArtists, settings.skippedArtists);
  addInputListener(startMinimized, settings.startMinimized);
  addInputListener(staticWindowTitle, settings.staticWindowTitle);
  addInputListener(singleInstance, settings.singleInstance);
  addSelectListener(theme, settings.theme);
  addInputListener(trayIcon, settings.trayIcon, switchesWithSettings.tray);
  addTrayIconPathListener(trayIconPath, settings.trayIconPath);
  addInputListener(updateFrequency, settings.updateFrequency);
  addInputListener(
    enableListenBrainz,
    settings.ListenBrainz.enabled,
    switchesWithSettings.listenBrainz,
  );
  addInputListener(ListenBrainzAPI, settings.ListenBrainz.api);
  addInputListener(ListenBrainzToken, settings.ListenBrainz.token);
  addInputListener(listenbrainz_delay, settings.ListenBrainz.delay);
  addInputListener(discord_details_prefix, settings.discord.detailsPrefix);
  addInputListener(discord_include_timestamps, settings.discord.includeTimestamps);
  addInputListener(discord_button_text, settings.discord.buttonText);
  addInputListener(
    discord_show_song,
    settings.discord.showSong,
    switchesWithSettings.discord_show_song,
  );
  addInputListener(discord_show_idle, settings.discord.showIdle);
  addInputListener(discord_idle_text, settings.discord.idleText);
  addInputListener(discord_using_text, settings.discord.usingText);
  addInputListener(userAgent, settings.advanced.userAgent);
  addSelectListener(controllerType, settings.advanced.controllerType);
});
