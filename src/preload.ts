import { ipcRenderer } from "electron";

import { bridgeChannels } from "./constants/bridge";
import { tidalControllers } from "./constants/controller";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import { getCurrentHotkeyConfig } from "./features/hotkeys";
import { Logger } from "./features/logger";
import { getTrackURL, getUniversalLink } from "./features/tidal/url";
import { mountCustomTitlebar, unmountCustomTitlebar } from "./features/titlebar/titlebarView";
import { getEmptyMediaInfo, type MediaInfo } from "./models/mediaInfo";
import { RepeatState, type RepeatStateType } from "./models/repeatState";
import { isSeekEvent } from "./models/seekEvent";
import { addHotkey, removeHotkeys } from "./scripts/hotkeys";
import { settingsStore } from "./scripts/settingsStore";
import { setTitle } from "./scripts/window-functions";
import { TidalApiController } from "./TidalControllers/apiController/TidalApiController";
import { clickElement, getElement } from "./TidalControllers/DomController/domHelpers";
import { DomTidalController } from "./TidalControllers/DomController/DomTidalController";
import { getDomUpdateFrequency } from "./TidalControllers/DomController/domUpdateFrequency";
import { MediaSessionController } from "./TidalControllers/MediaSessionController/MediaSessionController";
import { ReduxController } from "./TidalControllers/ReduxController/ReduxController";
import type { TidalController } from "./TidalControllers/TidalController";

const staticTitle = "TIDAL Hi-Fi";

// Build the draggable custom titlebar in this (isolated-world) preload, so no
// window action is exposed to page scripts and no executeJavaScript is needed.
if (settingsStore.get(settings.showCustomTitlebar)) {
  mountCustomTitlebar();
}

let currentSong = "";

let tidalController: TidalController;
let controllerOptions = {};
let currentMediaInfo = getEmptyMediaInfo();

switch (settingsStore.get(settings.advanced.controllerType)) {
  case tidalControllers.tidalApiController: {
    tidalController = new TidalApiController();
    Logger.log("TidalApiController initialized");
    break;
  }

  case tidalControllers.mediaSessionController: {
    tidalController = new MediaSessionController();
    controllerOptions = {
      refreshInterval: getDomUpdateFrequency(
        settingsStore.get<string, number>(settings.updateFrequency),
      ),
    };
    Logger.log("MediaSessionController initialized");
    break;
  }

  case tidalControllers.reduxController: {
    tidalController = new ReduxController();
    controllerOptions = {
      refreshInterval: getDomUpdateFrequency(
        settingsStore.get<string, number>(settings.updateFrequency),
      ),
    };
    Logger.log("ReduxController initialized");
    break;
  }

  default: {
    tidalController = new DomTidalController();
    controllerOptions = {
      refreshInterval: getDomUpdateFrequency(
        settingsStore.get<string, number>(settings.updateFrequency),
      ),
    };
    Logger.log("domController initialized");
    break;
  }
}

/**
 * Add hotkeys for when tidal is focused
 * Uses configurable hotkeys from settings store
 * Reflects the desktop hotkeys found on:
 * https://defkey.com/tidal-desktop-shortcuts
 */
function addHotKeys() {
  const hotkeyConfig = getCurrentHotkeyConfig();

  if (settingsStore.get(settings.enableCustomHotkeys)) {
    addHotkey(hotkeyConfig.toggleFavorite, () => {
      tidalController.toggleFavorite();
    });
    addHotkey(hotkeyConfig.logout, () => {
      handleLogout();
    });
    addHotkey(hotkeyConfig.hardReload, () => {
      ipcRenderer.send(globalEvents.hardReload);
    });
    addHotkey(hotkeyConfig.toggleRepeat, () => {
      tidalController.repeat();
    });
    addHotkey(hotkeyConfig.shareTrackLink, async () => {
      const url = getUniversalLink(getTrackURL(tidalController.getTrackId()));
      ipcRenderer.send(bridgeChannels.clipboardWriteText, url);
      ipcRenderer.send(bridgeChannels.notificationShow, {
        title: "Universal link generated: ",
        body: `URL copied to clipboard: ${url}`,
      });
    });
    addHotkey(hotkeyConfig.goBack, () => {
      globalThis.history.back();
    });
    addHotkey(hotkeyConfig.goForward, () => {
      globalThis.history.forward();
    });

    // Delete key override (disabled for search)
    addHotkey(hotkeyConfig.deleteDisabled, () => {});

    addHotkey(hotkeyConfig.volumeUp, () => {
      const currentVolume = tidalController.getVolume();
      const newVolumeUp = Math.min(currentVolume + 0.1, 1.0);
      tidalController.setVolume(newVolumeUp);
    });
    addHotkey(hotkeyConfig.volumeDown, () => {
      const currentVolume = tidalController.getVolume();
      const newVolumeDown = Math.max(currentVolume - 0.1, 0.0);
      tidalController.setVolume(newVolumeDown);
    });
    addHotkey(hotkeyConfig.expandNowPlaying, () => {
      clickElement("toggleNowPlaying");
    });
    addHotkey(hotkeyConfig.sidebarMusic, () => {
      clickElement("sidebarMusic");
    });
    addHotkey(hotkeyConfig.sidebarExplore, () => {
      clickElement("sidebarExplore");
    });
    addHotkey(hotkeyConfig.sidebarFeed, () => {
      clickElement("sidebarFeed");
    });
    addHotkey(hotkeyConfig.sidebarUpload, () => {
      clickElement("sidebarUpload");
    });
    addHotkey(hotkeyConfig.toggleSidebar, () => {
      const collapseButton = getElement("collapseSidebar");
      const isExpanded = collapseButton && !collapseButton.hasAttribute("disabled");

      if (isExpanded) {
        clickElement("collapseSidebar");
      } else {
        clickElement("expandSidebar");
      }
    });
    addHotkey(hotkeyConfig.sidebarCollectionPlaylists, () => {
      clickElement("sidebarCollectionPlaylists");
    });
    addHotkey(hotkeyConfig.sidebarCollectionAlbums, () => {
      clickElement("sidebarCollectionAlbums");
    });
    addHotkey(hotkeyConfig.sidebarCollectionTracks, () => {
      clickElement("sidebarCollectionTracks");
    });
    addHotkey(hotkeyConfig.sidebarCollectionVideos, () => {
      clickElement("sidebarCollectionVideos");
    });
    addHotkey(hotkeyConfig.sidebarCollectionArtists, () => {
      clickElement("sidebarCollectionArtists");
    });
    addHotkey(hotkeyConfig.sidebarCollectionMixes, () => {
      clickElement("sidebarCollectionMixes");
    });
  }

  // Always-enabled hotkeys (settings shortcuts)
  addHotkey(hotkeyConfig.openSettings1, () => {
    ipcRenderer.send(globalEvents.showSettings);
  });
  addHotkey(hotkeyConfig.openSettings2, () => {
    ipcRenderer.send(globalEvents.showSettings);
  });
}

/**
 * This function will ask the user whether he/she wants to log out.
 * It will log the user out if he/she selects "yes"
 */
function handleLogout() {
  const logoutOptions = ["Cancel", "Yes, please", "No, thanks"];

  ipcRenderer
    .invoke(bridgeChannels.dialogShowMessageBox, {
      type: "question",
      title: "Logging out",
      message: "Are you sure you want to log out?",
      buttons: logoutOptions,
      defaultId: 2,
    })
    .then((response: number) => {
      if (logoutOptions.indexOf("Yes, please") === response) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key?.startsWith("_TIDAL_activeSession")) {
            window.localStorage.removeItem(key);
            break;
          }
        }
        window.location.reload();
      }
    });
}

function addFullScreenListeners() {
  window.document.addEventListener("fullscreenchange", () => {
    ipcRenderer.send(globalEvents.refreshMenuBar);
  });
}

/**
 * Apply the window title based on the current settings and media info. Called
 * both when a new song starts and when settings change so the
 * `staticWindowTitle` toggle takes effect without a restart.
 */
function applyWindowTitle() {
  if (settingsStore.get(settings.staticWindowTitle) || !currentMediaInfo.title) {
    setTitle(staticTitle);
  } else {
    setTitle(`${currentMediaInfo.title} - ${currentMediaInfo.artists}`);
  }
}

/**
 * Re-apply settings that are otherwise only read once at startup, so changes
 * made in the settings window take effect live. Triggered by the main process
 * on `storeChanged`. Theme/custom CSS is re-injected from the main process.
 */
function reapplyLiveSettings() {
  removeHotkeys();
  addHotKeys();
  applyWindowTitle();

  if (settingsStore.get(settings.showCustomTitlebar)) {
    mountCustomTitlebar();
  } else {
    unmountCustomTitlebar();
  }
}

/**
 * Add ipc event listeners.
 * Some actions triggered outside of the site need info from the site.
 */
function addIPCEventListeners() {
  // Register the handler directly (not inside DOMContentLoaded) to avoid
  // accumulating duplicate listeners on every same-origin navigation.  With
  // Electron's contextIsolation the preload context is preserved across
  // same-origin navigations, so DOMContentLoaded fires again each time while
  // prior ipcRenderer.on registrations remain alive — a classic listener leak.
  const globalEventHandler = (
    _event: Electron.IpcRendererEvent,
    action: string,
    payload: Record<string, unknown>,
  ) => {
    switch (action) {
      case globalEvents.playPause:
        tidalController.playPause();
        break;
      case globalEvents.play:
        tidalController.play();
        break;
      case globalEvents.pause:
        tidalController.pause();
        break;
      case globalEvents.next:
        tidalController.next();
        break;
      case globalEvents.previous:
        tidalController.previous();
        break;
      case globalEvents.toggleFavorite:
        tidalController.toggleFavorite();
        break;
      case globalEvents.toggleShuffle:
        tidalController.toggleShuffle();
        break;
      case globalEvents.toggleRepeat:
        tidalController.repeat();
        break;
      case globalEvents.volume: {
        const vol = payload?.volume;
        if (typeof vol === "number" && Number.isFinite(vol)) {
          tidalController.setVolume(vol);
        }
        break;
      }
      case globalEvents.seek:
        if (isSeekEvent(payload)) {
          if (payload.type === "absolute") {
            tidalController.setCurrentTime(payload.seconds);
          } else if (payload.type === "relative") {
            const currentTime = tidalController.getCurrentTime();
            const newTime = currentTime + payload.seconds;
            tidalController.setCurrentTime(newTime);
          }
        }
        break;
      case globalEvents.setLoopState: {
        const targetState = payload?.targetState;
        if (targetState === "off" || targetState === "single" || targetState === "all") {
          setLoopState(targetState);
        }
        break;
      }
      default:
        break;
    }
  };

  ipcRenderer.on("globalEvent", globalEventHandler);

  const storeChangedHandler = () => reapplyLiveSettings();
  ipcRenderer.on(globalEvents.storeChanged, storeChangedHandler);

  window.addEventListener("beforeunload", () => {
    ipcRenderer.removeListener("globalEvent", globalEventHandler);
    ipcRenderer.removeListener(globalEvents.storeChanged, storeChangedHandler);
    tidalController.destroy();
  });
}

/**
 * Update Tidal-hifi's media info
 * @param {*} mediaInfo
 * @param notify Whether to notify
 */
function updateMediaInfo(mediaInfo: MediaInfo, notify: boolean) {
  if (mediaInfo) {
    ipcRenderer.send(globalEvents.updateInfo, mediaInfo);
    if (notify) {
      sendNotification(mediaInfo);
    }
  }
}

/**
 * send a desktop notification if enabled in settings
 * @param mediaInfo
 */
async function sendNotification(mediaInfo: MediaInfo) {
  if (settingsStore.get(settings.notifications)) {
    ipcRenderer.send(bridgeChannels.notificationShow, {
      title: mediaInfo.title,
      body: mediaInfo.artists,
      icon: mediaInfo.localAlbumArt || mediaInfo.image || mediaInfo.icon,
    });
  }
}

async function setLoopState(targetRepeatState: RepeatStateType) {
  const order = [RepeatState.off, RepeatState.all, RepeatState.single];
  const currentValue = tidalController.getCurrentRepeatState();

  // Based on the targetState and currentValue delta, we press the repeat button repeatedly so the user's preference is set.
  const newIndex = order.indexOf(targetRepeatState);
  const currentIndex = order.indexOf(currentValue);

  if (newIndex === -1 || currentIndex === -1) return;

  let calculatedDelta = newIndex - currentIndex;
  if (calculatedDelta < 0) {
    calculatedDelta += order.length;
  }

  for (let i = 0; i < calculatedDelta; i++) {
    tidalController.repeat();
    // Small delay to ensure the button click is registered in the UI
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

tidalController.bootstrap(controllerOptions);
tidalController.onMediaInfoUpdate(async (newState) => {
  currentMediaInfo = { ...currentMediaInfo, ...newState };

  const songDashArtistTitle = `${currentMediaInfo.title} - ${currentMediaInfo.artists}`;
  const isNewSong = currentSong !== songDashArtistTitle;

  if (isNewSong) {
    // check whether one of the artists is in the "skip artist" array, if so, skip...
    skipArtistsIfFoundInSkippedArtistsList(currentMediaInfo.artistsArray ?? []);
    // check whether the track title matches any of the "skip track" keywords, if so, skip...
    skipTracksIfTitleMatchesSkippedTracksList(currentMediaInfo.title ?? "");

    // update the currently playing song
    currentSong = songDashArtistTitle;

    // update the window title with the new info
    settingsStore.get(settings.staticWindowTitle)
      ? setTitle(staticTitle)
      : setTitle(`${currentMediaInfo.title} - ${currentMediaInfo.artists}`);

    // Download the best available image for local use
    let imageUrlToDownload = "";

    // Try to download image first, fallback to icon
    if (newState.image) {
      imageUrlToDownload = newState.image;
    } else if (newState.icon) {
      imageUrlToDownload = newState.icon;
    }

    if (imageUrlToDownload) {
      currentMediaInfo.localAlbumArt = await ipcRenderer.invoke(
        bridgeChannels.downloadAlbumArt,
        imageUrlToDownload,
      );
    } else {
      currentMediaInfo.localAlbumArt = "";
    }

    updateMediaInfo(currentMediaInfo, true);
  } else {
    // if titleOrArtists didn't change then only minor mediaInfo (like timings) changed, so don't bother the user with notifications
    updateMediaInfo(currentMediaInfo, false);
  }
});

/**
 * automatically skip a song if the artists are found in the list of artists to skip
 * @param {*} artists array of artists
 */
function skipArtistsIfFoundInSkippedArtistsList(artists: string[]) {
  if (settingsStore.get(settings.skipArtists)) {
    const skippedArtists = settingsStore.get<string, string[]>(settings.skippedArtists);
    if (skippedArtists.length > 0) {
      const artistsToSkip = new Set(skippedArtists.map((artist) => artist.trim().toLowerCase()));
      const foundArtist = artists.some(
        (artist) => artist && artistsToSkip.has(artist.trim().toLowerCase()),
      );
      if (foundArtist) {
        tidalController.next();
      }
    }
  }
}

/**
 * Skip the current track if its title contains any of the configured
 * keywords (case-insensitive substring match), e.g. "live" or "remix".
 */
function skipTracksIfTitleMatchesSkippedTracksList(title: string) {
  if (!title || !settingsStore.get(settings.skipTracks)) return;
  const skippedTracks = settingsStore
    .get<string, string[]>(settings.skippedTracks)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
  if (skippedTracks.length === 0) return;
  const lowerTitle = title.toLowerCase();
  const match = skippedTracks.some((keyword) => lowerTitle.includes(keyword.toLowerCase()));
  if (match) {
    tidalController.next();
  }
}

addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
