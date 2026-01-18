import { app, dialog, Notification } from "@electron/remote";
import { clipboard, ipcRenderer } from "electron";
import Player from "mpris-service";

import { tidalControllers } from "./constants/controller";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import { downloadImage } from "./features/icon/downloadImage";
import { Logger } from "./features/logger";
import { addCustomCss } from "./features/theming/theming";
import { getTrackURL, getUniversalLink } from "./features/tidal/url";
import { convertMicrosecondsToSeconds, convertSecondsToMicroseconds } from "./features/time/parse";
import { getEmptyMediaInfo, type MediaInfo } from "./models/mediaInfo";
import { MediaStatus } from "./models/mediaStatus";
import { RepeatState } from "./models/repeatState";
import { addHotkey } from "./scripts/hotkeys";
import { ObjectToDotNotation } from "./scripts/objectUtilities";
import { settingsStore } from "./scripts/settings";
import { setTitle } from "./scripts/window-functions";
import { TidalApiController } from "./TidalControllers/apiController/TidalApiController";
import { DomTidalController } from "./TidalControllers/DomController/DomTidalController";
import { getDomUpdateFrequency } from "./TidalControllers/DomController/domUpdateFrequency";
import { MediaSessionController } from "./TidalControllers/MediaSessionController/MediaSessionController";
import type { TidalController } from "./TidalControllers/TidalController";
import {
  convertMprisLoopToRepeatState,
  convertRepeatStateToMprisLoop,
  isMPRISLoop,
  isMPRISPosition,
  isMPRISShuffle,
  isMPRISVolume,
  type MprisLoopType,
} from "./utility/mpris";

const albumArtPath = `${app.getPath("userData")}/current.jpg`;
const staticTitle = "TIDAL Hi-Fi";

let currentSong = "";
let player: Player;

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
      tidalController.repeat();
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
        case globalEvents.volume:
          if (payload.volume) {
            tidalController.setVolume(payload.volume);
          }
          break;
        case globalEvents.seek:
          if (payload.currentTime) {
            tidalController.setCurrentTime(payload.currentTime);
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
    updateMpris(mediaInfo);
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

async function setLoopState(newRepeatState: MprisLoopType) {
  const order = [RepeatState.off, RepeatState.all, RepeatState.single];
  const currentValue = tidalController.getCurrentRepeatState();

  // Based on the newValue and currentValue delta, we press the repeat button repeatedly so the user's preference is set.
  const newIndex = order.indexOf(convertMprisLoopToRepeatState(newRepeatState));
  const currentIndex = order.indexOf(currentValue);
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

function setShuffleState(newShuffleState: boolean) {
  if (!newShuffleState && tidalController.getCurrentShuffleState()) {
    tidalController.toggleShuffle();
  } else if (newShuffleState && !tidalController.getCurrentShuffleState()) {
    tidalController.toggleShuffle();
  }
}

function addMPRIS() {
  if (process.platform === "linux" && settingsStore.get(settings.mpris)) {
    try {
      player = Player({
        name: "tidal-hifi",
        identity: "tidal-hifi",
        supportedUriSchemes: ["file"],
        supportedMimeTypes: [
          "audio/mpeg",
          "audio/flac",
          "audio/x-flac",
          "application/ogg",
          "audio/wav",
        ],
        supportedInterfaces: ["player"],
        desktopEntry: "tidal-hifi",
      });
      // Events
      const events = [
        "next",
        "previous",
        "pause",
        "playpause",
        "stop",
        "play",
        "loopStatus",
        "shuffle",
        "seek",
        "volume",
        "position",
      ];
      events.forEach((eventName) => {
        player.on(eventName, async (eventData) => {
          // The eventData parameter is typed as an object in mpris-service.d.ts,
          // but MPRIS is sending different types depending on the event.
          switch (eventName) {
            case "playpause":
              tidalController.playPause();
              break;
            case "next":
              tidalController.next();
              break;
            case "previous":
              tidalController.previous();
              break;
            case "pause":
              tidalController.pause();
              break;
            case "stop":
              tidalController.stop();
              break;
            case "play":
              tidalController.play();
              break;
            case "loopStatus":
              if (isMPRISLoop(eventData)) {
                setLoopState(eventData);
              }
              break;
            case "shuffle":
              if (isMPRISShuffle(eventData)) {
                setShuffleState(eventData);
              }
              break;
            case "volume":
              if (isMPRISVolume(eventData)) {
                tidalController.setVolume(eventData);
              }
              break;
            case "position":
              if (isMPRISPosition(eventData)) {
                tidalController.setCurrentTime(convertMicrosecondsToSeconds(eventData.position));
              }
              break;
          }
        });
      });
      // Override get position function
      player.getPosition = () => {
        return convertSecondsToMicroseconds(tidalController.getCurrentTime());
      };
      player.on("quit", () => {
        app.quit();
      });
    } catch (exception) {
      Logger.log("MPRIS player api not working", exception);
    }
  }
}

function updateMpris(mediaInfo: MediaInfo) {
  if (player) {
    // Use high-resolution image URL for better quality in media players
    const highResImageUrl = tidalController.getSongImage() || mediaInfo.image;

    player.metadata = {
      ...player.metadata,
      ...{
        "xesam:title": mediaInfo.title,
        "xesam:artist": [mediaInfo.artists],
        "xesam:album": mediaInfo.album,
        "xesam:url": mediaInfo.url,
        "mpris:artUrl": highResImageUrl,
        "mpris:length": convertSecondsToMicroseconds(mediaInfo.durationInSeconds),
        "mpris:trackid": `/org/mpris/MediaPlayer2/track/${tidalController.getTrackId()}`,
      },
      ...ObjectToDotNotation(mediaInfo, "custom:"),
    };
    player.playbackStatus = mediaInfo.status === MediaStatus.paused ? "Paused" : "Playing";
    player.volume = tidalController.getVolume();
    player.shuffle = tidalController.getCurrentShuffleState();
    player.loopStatus = convertRepeatStateToMprisLoop(tidalController.getCurrentRepeatState());
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
addMPRIS();
addCustomCss(app);
addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
