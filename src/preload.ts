import { app, dialog, Notification } from "@electron/remote";
import { clipboard, ipcRenderer } from "electron";
import Player from "mpris-service";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import {
  ListenBrainz,
  ListenBrainzConstants,
  ListenBrainzStore,
} from "./features/listenbrainz/listenbrainz";
import { StoreData } from "./features/listenbrainz/models/storeData";
import { Logger } from "./features/logger";
import { SharingService } from "./features/sharingService/sharingService";
import { addCustomCss } from "./features/theming/theming";
import { convertDurationToSeconds } from "./features/time/parse";
import { MediaInfo } from "./models/mediaInfo";
import { MediaStatus } from "./models/mediaStatus";
import { RepeatState } from "./models/repeatState";
import { downloadFile } from "./scripts/download";
import { addHotkey } from "./scripts/hotkeys";
import { ObjectToDotNotation } from "./scripts/objectUtilities";
import { settingsStore } from "./scripts/settings";
import { setTitle } from "./scripts/window-functions";
import { DomTidalController } from "./TidalControllers/DomTidalController";
import { MediaSessionTidalController } from "./TidalControllers/MediaSessionTidalController";
import { TidalController } from "./TidalControllers/TidalController";

const notificationPath = `${app.getPath("userData")}/notification.jpg`;
let currentSong = "";
let player: Player;
let currentListenBrainzDelayId: ReturnType<typeof setTimeout>;
let scrobbleWaitingForDelay = false;

let currentlyPlaying = MediaStatus.paused;
let currentRepeatState: RepeatState = RepeatState.off;
let currentShuffleState = false;
let currentMediaInfo: MediaInfo;
let currentNotification: Electron.Notification;

let tidalController: TidalController;

// TODO: replace with setting
// eslint-disable-next-line no-constant-condition
if (true) {
  tidalController = new DomTidalController();
} else {
  tidalController = new MediaSessionTidalController();
}

/**
 * Get the update frequency from the store
 * make sure it returns a number, if not use the default
 */
function getUpdateFrequency() {
  const storeValue = settingsStore.get<string, number>(settings.updateFrequency);
  const defaultValue = 500;

  if (!isNaN(storeValue)) {
    return storeValue;
  } else {
    return defaultValue;
  }
}

/**
 * Clears the old listenbrainz data on launch
 */
ListenBrainzStore.clear();

/**
 * Add hotkeys for when tidal is focused
 * Reflects the desktop hotkeys found on:
 * https://defkey.com/tidal-desktop-shortcuts
 */
function addHotKeys() {
  if (settingsStore.get(settings.enableCustomHotkeys)) {
    addHotkey("Control+p", () => {
      tidalController.openSettings();
    });
    addHotkey("Control+l", () => {
      handleLogout();
    });
    addHotkey("Control+a", () => {
      tidalController.toggleFavorite();
    });

    addHotkey("Control+h", () => {
      tidalController.goToHome();
    });

    addHotkey("backspace", function () {
      tidalController.back();
    });

    addHotkey("shift+backspace", function () {
      tidalController.forward();
    });

    addHotkey("control+u", function () {
      // reloading window without cache should show the update bar if applicable
      window.location.reload();
    });

    addHotkey("control+r", function () {
      tidalController.repeat();
    });
    addHotkey("control+w", async function () {
      const url = SharingService.getUniversalLink(getTrackURL());
      clipboard.writeText(url);
      new Notification({
        title: `Universal link generated: `,
        body: `URL copied to clipboard: ${url}`,
      }).show();
    });
  }

  // always add the hotkey for the settings window
  addHotkey("control+=", function () {
    ipcRenderer.send(globalEvents.showSettings);
  });
  addHotkey("control+0", function () {
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
    ipcRenderer.on("globalEvent", (_event, args) => {
      switch (args) {
        case globalEvents.playPause:
        case globalEvents.play:
        case globalEvents.pause:
          tidalController.playPause();
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
        default:
          break;
      }
    });
  });
}

/**
 * Convert the duration from MM:SS to seconds
 * @param {*} duration
 */
function convertDuration(duration: string) {
  const parts = duration.split(":");
  return parseInt(parts[1]) + 60 * parseInt(parts[0]);
}

/**
 * Update Tidal-hifi's media info
 *
 * @param {*} mediaInfo
 */
function updateMediaInfo(mediaInfo: MediaInfo, notify: boolean) {
  if (mediaInfo) {
    currentMediaInfo = mediaInfo;
    ipcRenderer.send(globalEvents.updateInfo, mediaInfo);
    updateMpris(mediaInfo);
    updateListenBrainz(mediaInfo);
    if (notify) {
      sendNotification(mediaInfo);
    }
  }
}

/**
 * send a desktop notification if enabled in settings
 * @param mediaInfo
 * @param notify Whether to notify
 */
async function sendNotification(mediaInfo: MediaInfo) {
  if (settingsStore.get(settings.notifications)) {
    if (currentNotification) {
      currentNotification.close();
    }
    currentNotification = new Notification({
      title: mediaInfo.title,
      body: mediaInfo.artists,
      icon: mediaInfo.icon,
    });
    currentNotification.show();
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
      const events = {
        next: "next",
        previous: "previous",
        pause: "pause",
        playpause: "playpause",
        stop: "stop",
        play: "play",
        loopStatus: "repeat",
        shuffle: "shuffle",
        seek: "seek",
      } as { [key: string]: string };
      Object.keys(events).forEach(function (eventName) {
        player.on(eventName, function () {
          const eventValue = events[eventName];
          switch (events[eventValue]) {
            case events.playpause:
              tidalController.playPause();
              break;
            case events.next:
              tidalController.next();
              break;
            case events.previous:
              tidalController.previous();
              break;
            case events.pause:
              tidalController.pause();
              break;
            case events.stop:
              tidalController.stop();
              break;
            case events.play:
              tidalController.play();
              break;
            case events.loopStatus:
              tidalController.repeat();
              break;
            case events.shuffle:
              tidalController.toggleShuffle();
              break;
          }
        });
      });
      // Override get position function
      player.getPosition = function () {
        return tidalController.getCurrentPositionInSeconds();
      };
      player.on("quit", function () {
        app.quit();
      });
    } catch (exception) {
      Logger.log("MPRIS player api not working", exception);
    }
  }
}

function updateMpris(mediaInfo: MediaInfo) {
  if (player) {
    player.metadata = {
      ...player.metadata,
      ...{
        "xesam:title": mediaInfo.title,
        "xesam:artist": [mediaInfo.artists],
        "xesam:album": mediaInfo.album,
        "mpris:artUrl": mediaInfo.image,
        "mpris:length": convertDuration(mediaInfo.duration) * 1000 * 1000,
        "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + tidalController.getTrackId(),
      },
      ...ObjectToDotNotation(mediaInfo, "custom:"),
    };
    player.playbackStatus = mediaInfo.status === MediaStatus.paused ? "Paused" : "Playing";
  }
}

/**
 * Update the listenbrainz service with new data based on a few conditions
 */
function updateListenBrainz(mediaInfo: MediaInfo) {
  if (settingsStore.get(settings.ListenBrainz.enabled)) {
    const oldData = ListenBrainzStore.get(ListenBrainzConstants.oldData) as StoreData;
    if (
      (!oldData && mediaInfo.status === MediaStatus.playing) ||
      (oldData && oldData.title !== mediaInfo.title)
    ) {
      if (!scrobbleWaitingForDelay) {
        scrobbleWaitingForDelay = true;
        clearTimeout(currentListenBrainzDelayId);
        currentListenBrainzDelayId = setTimeout(
          () => {
            ListenBrainz.scrobble(
              mediaInfo.title,
              mediaInfo.artists,
              mediaInfo.status,
              convertDuration(mediaInfo.duration)
            );
            scrobbleWaitingForDelay = false;
          },
          settingsStore.get(settings.ListenBrainz.delay) ?? 0
        );
      }
    }
  }
}

/**
 * Checks if Tidal is playing a video or song by grabbing the "a" element from the title.
 * If it's a song it returns the track URL, if not it will return undefined
 */
function getTrackURL() {
  const id = tidalController.getTrackId();
  return `https://tidal.com/browse/track/${id}`;
}

/**
 * Watch for song changes and update title + notify
 */
setInterval(function () {
  const title = tidalController.getTitle();
  const artistsArray = tidalController.getArtists();
  const artistsString = tidalController.getArtistsString();
  const songDashArtistTitle = `${title} - ${artistsString}`;
  const staticTitle = "TIDAL Hi-Fi";
  const titleOrArtistsChanged = currentSong !== songDashArtistTitle;
  const current = tidalController.getCurrentTime();
  const currentStatus = tidalController.getCurrentlyPlayingStatus();
  const shuffleState = tidalController.getCurrentShuffleState();
  const repeatState = tidalController.getCurrentRepeatState();

  const playStateChanged = currentStatus != currentlyPlaying;
  const shuffleStateChanged = shuffleState != currentShuffleState;
  const repeatStateChanged = repeatState != currentRepeatState;

  const hasStateChanged = playStateChanged || shuffleStateChanged || repeatStateChanged;

  // update info if song changed or was just paused/resumed
  if (titleOrArtistsChanged || hasStateChanged) {
    if (playStateChanged) currentlyPlaying = currentStatus;
    if (shuffleStateChanged) currentShuffleState = shuffleState;
    if (repeatStateChanged) currentRepeatState = repeatState;

    skipArtistsIfFoundInSkippedArtistsList(artistsArray);
    const album = tidalController.getAlbumName();
    const duration = tidalController.getDuration();
    const options: MediaInfo = {
      title,
      artists: artistsString,
      album: album,
      playingFrom: tidalController.getPlayingFrom(),
      status: currentStatus,
      url: getTrackURL(),
      current,
      currentInSeconds: convertDurationToSeconds(current),
      duration,
      durationInSeconds: convertDurationToSeconds(duration),
      image: "",
      icon: "",
      favorite: tidalController.isFavorite(),

      player: {
        status: currentStatus,
        shuffle: shuffleState,
        repeat: repeatState,
      },
    };

    // update title, url and play info with new info
    settingsStore.get(settings.staticWindowTitle)
      ? setTitle(staticTitle)
      : setTitle(songDashArtistTitle);
    getTrackURL();
    currentSong = songDashArtistTitle;
    tidalController.setPlayStatus(currentStatus);

    const image = tidalController.getSongIcon();

    new Promise<void>((resolve) => {
      if (image.startsWith("http")) {
        options.image = image;
        downloadFile(image, notificationPath).then(
          () => {
            options.icon = notificationPath;
            resolve();
          },
          () => {
            // if the image can't be downloaded then continue without it
            resolve();
          }
        );
      } else {
        // if the image can't be found on the page continue without it
        resolve();
      }
    }).then(() => {
      updateMediaInfo(options, titleOrArtistsChanged);
    });
  } else {
    // just update the time
    updateMediaInfo(
      { ...currentMediaInfo, ...{ current, currentInSeconds: convertDurationToSeconds(current) } },
      false
    );
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
}, getUpdateFrequency());

addMPRIS();
addCustomCss(app);
addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
