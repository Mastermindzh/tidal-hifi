import { app, dialog, Notification } from "@electron/remote";
import { clipboard, ipcRenderer } from "electron";

import { tidalControllers } from "./constants/controller";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import { downloadImage } from "./features/icon/downloadImage";
import { Logger } from "./features/logger";
import { addCustomCss } from "./features/theming/theming";
import { getTrackURL, getUniversalLink } from "./features/tidal/url";
import { getEmptyMediaInfo, type MediaInfo } from "./models/mediaInfo";
import { MediaStatus } from "./models/mediaStatus";
import { isSeekEvent } from "./models/seekEvent";
import { addHotkey } from "./scripts/hotkeys";
import { settingsStore } from "./scripts/settings";
import { setTitle } from "./scripts/window-functions";
import { TidalApiController } from "./TidalControllers/apiController/TidalApiController";
import { DomTidalController } from "./TidalControllers/DomController/DomTidalController";
import { getDomUpdateFrequency } from "./TidalControllers/DomController/domUpdateFrequency";
import { MediaSessionController } from "./TidalControllers/MediaSessionController/MediaSessionController";
import type { TidalController } from "./TidalControllers/TidalController";

const albumArtPath = `${app.getPath("userData")}/current.jpg`;
const staticTitle = "TIDAL Hi-Fi";

let currentSong = "";

let currentNotification: Electron.Notification;

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
 * Reflects the desktop hotkeys found on:
 * https://defkey.com/tidal-desktop-shortcuts
 */
function addHotKeys() {
  if (settingsStore.get(settings.enableCustomHotkeys)) {
    addHotkey("Control+l", () => {
      handleLogout();
    });
    addHotkey("Control+a", () => {
      tidalController.toggleFavorite();
    });

    addHotkey("control+u", () => {
      // reloading window without cache should show the update bar if applicable
      window.location.reload();
    });

    addHotkey("control+r", () => {
      tidalController.toggleRepeat();
    });
    addHotkey("delete", () => {});
    addHotkey("control+w", async () => {
      const url = getUniversalLink(getTrackURL(tidalController.getTrackId()));
      clipboard.writeText(url);
      new Notification({
        title: `Universal link generated: `,
        body: `URL copied to clipboard: ${url}`,
      }).show();
    });
  }

  // always add the hotkey for the settings window
  addHotkey("control+=", () => {
    ipcRenderer.send(globalEvents.showSettings);
  });
  addHotkey("control+0", () => {
    ipcRenderer.send(globalEvents.showSettings);
  });
}

/**
 * This function will ask the user whether he/she wants to log out.
 * It will log the user out if he/she selects "yes"
 */
function handleLogout() {
  const logoutOptions = ["Cancel", "Yes, please", "No, thanks"];

  dialog
    .showMessageBox(null, {
      type: "question",
      title: "Logging out",
      message: "Are you sure you want to log out?",
      buttons: logoutOptions,
      defaultId: 2,
    })
    .then((result: { response: number }) => {
      if (logoutOptions.indexOf("Yes, please") === result.response) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key.startsWith("_TIDAL_activeSession")) {
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
 * Add ipc event listeners.
 * Some actions triggered outside of the site need info from the site.
 */
function addIPCEventListeners() {
  window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("globalEvent", (_event, action, payload) => {
      switch (action) {
        case globalEvents.playPause:
          // Toggle play/pause
          if (tidalController.getMediaStatus() === MediaStatus.playing) {
            tidalController.pause();
          } else {
            tidalController.play();
          }
          break;
        case globalEvents.play:
          // Only play if not already playing
          if (tidalController.getMediaStatus() !== MediaStatus.playing) {
            tidalController.play();
          }
          break;
        case globalEvents.pause:
          // Only pause if currently playing
          if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
            tidalController.pause();
          }
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
        case globalEvents.setShuffle:
          if (
            typeof payload.shuffle === "boolean" &&
            tidalController.getShuffleState() !== payload.shuffle
          ) {
            tidalController.setShuffle(payload.shuffle);
          }
          break;
        case globalEvents.toggleRepeat:
          tidalController.toggleRepeat();
          break;
        case globalEvents.setRepeat:
          if (payload?.targetState) {
            tidalController.setRepeat(payload.targetState);
          }
          break;
        case globalEvents.volume:
          if (typeof payload.volume === "number" && Number.isFinite(payload.volume)) {
            tidalController.setVolume(payload.volume);
          }
          break;
        case globalEvents.seek:
          if (isSeekEvent(payload)) {
            if (payload.type === "absolute") {
              tidalController.setPosition(payload.seconds);
            } else if (payload.type === "relative") {
              const currentTime = tidalController.getPosition();
              const newTime = currentTime + payload.seconds;
              tidalController.setPosition(newTime);
            }
          }
          break;
        default:
          break;
      }
    });
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
    if (currentNotification) {
      currentNotification.close();
    }
    currentNotification = new Notification({
      title: mediaInfo.title,
      body: mediaInfo.artists,
      icon: mediaInfo.localAlbumArt || mediaInfo.image || mediaInfo.icon,
    });
    currentNotification.show();
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
      currentMediaInfo.localAlbumArt = await downloadImage(imageUrlToDownload, albumArtPath);
    } else {
      currentMediaInfo.localAlbumArt = "";
    }

    updateMediaInfo(currentMediaInfo, true);
  } else {
    // if titleOrArtists didn't change then only minor mediaInfo (like timings) changed, so don't bother the user with notifications
    updateMediaInfo(currentMediaInfo, false);
  }
  /**
   * automatically skip a song if the artists are found in the list of artists to skip
   * @param {*} artists array of artists
   */
  function skipArtistsIfFoundInSkippedArtistsList(artists: string[]) {
    if (settingsStore.get(settings.skipArtists)) {
      const skippedArtists = settingsStore.get<string, string[]>(settings.skippedArtists);
      if (skippedArtists.length > 0) {
        const artistsToSkip = skippedArtists.map((artist) => artist);
        const artistNames = Object.values(artists).map((artist) => artist);
        const foundArtist = artistNames.some((artist) => artistsToSkip.includes(artist));
        if (foundArtist) {
          tidalController.next();
        }
      }
    }
  }
});

addCustomCss(app);
addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
