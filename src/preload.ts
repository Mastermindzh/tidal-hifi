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
import { TidalController } from "./TidalControllers/MediaController";

const notificationPath = `${app.getPath("userData")}/notification.jpg`;
let currentSong = "";
let player: Player;
let currentPlayStatus = MediaStatus.paused;
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

const elements = {
  play: '*[data-test="play"]',
  pause: '*[data-test="pause"]',
  next: '*[data-test="next"]',
  previous: 'button[data-test="previous"]',
  title: '*[data-test^="footer-track-title"]',
  artists: '*[data-test^="grid-item-detail-text-title-artist"]',
  home: '*[data-test="menu--home"]',
  back: '[title^="Back"]',
  forward: '[title^="Next"]',
  search: '[class^="searchField"]',
  shuffle: '*[data-test="shuffle"]',
  repeat: '*[data-test="repeat"]',
  account: '*[data-test^="profile-image-button"]',
  settings: '*[data-test^="sidebar-menu-button"]',
  openSettings: '*[data-test^="open-settings"]',
  media: '*[data-test="current-media-imagery"]',
  image: "img",
  current: '*[data-test="current-time"]',
  duration: '*[class^=playbackControlsContainer] *[data-test="duration"]',
  bar: '*[data-test="progress-bar"]',
  footer: "#footerPlayer",
  mediaItem: "[data-type='mediaItem']",
  album_header_title: '*[class^="playingFrom"] span:nth-child(2)',
  playing_from: '*[class^="playingFrom"] span:nth-child(2)',
  queue_album: "*[class^=playQueueItemsContainer] *[class^=groupTitle] span:nth-child(2)",
  currentlyPlaying: "[class^='isPlayingIcon'], [data-test-is-playing='true']",
  album_name_cell: '[class^="album"]',
  tracklist_row: '[data-test="tracklist-row"]',
  volume: '*[data-test="volume"]',
  favorite: '*[data-test="footer-favorite-button"]',
  /**
   * Get an element from the dom
   * @param {*} key key in elements object to fetch
   */
  get: function (key: string) {
    return window.document.querySelector(this[key.toLowerCase()]);
  },

  /**
   * Get the icon of the current media
   */
  getSongIcon: function () {
    const figure = this.get("media");

    if (figure) {
      const mediaElement = figure.querySelector(this["image"]);
      if (mediaElement) {
        return mediaElement.src.replace("80x80", "640x640");
      }
    }

    return "";
  },

  /**
   * returns an array of all artists in the current media
   * @returns {Array} artists
   */
  getArtistsArray: function () {
    const footer = this.get("footer");

    if (footer) {
      const artists = footer.querySelectorAll(this.artists);
      if (artists) return Array.from(artists).map((artist) => (artist as HTMLElement).textContent);
    }
    return [];
  },

  /**
   * unify the artists array into a string separated by commas
   * @param {Array} artistsArray
   * @returns {String} artists
   */
  getArtistsString: function (artistsArray: string[]) {
    if (artistsArray.length > 0) return artistsArray.join(", ");
    return "unknown artist(s)";
  },

  getAlbumName: function () {
    //If listening to an album, get its name from the header title
    if (window.location.href.includes("/album/")) {
      const albumName = window.document.querySelector(this.album_header_title);
      if (albumName) {
        return albumName.textContent;
      }
      //If listening to a playlist or a mix, get album name from the list
    } else if (
      window.location.href.includes("/playlist/") ||
      window.location.href.includes("/mix/")
    ) {
      if (currentPlayStatus === MediaStatus.playing) {
        // find the currently playing element from the list (which might be in an album icon), traverse back up to the mediaItem (row) and select the album cell.
        // document.querySelector("[class^='isPlayingIcon'], [data-test-is-playing='true']").closest('[data-type="mediaItem"]').querySelector('[class^="album"]').textContent
        const row = window.document.querySelector(this.currentlyPlaying).closest(this.mediaItem);
        if (row) {
          return row.querySelector(this.album_name_cell).textContent;
        }
      }
    }

    // see whether we're on the queue page and get it from there
    const queueAlbumName = elements.getText("queue_album");
    if (queueAlbumName) {
      return queueAlbumName;
    }

    return "";
  },

  isMuted: function () {
    return this.get("volume").getAttribute("aria-checked") === "false"; // it's muted if aria-checked is false
  },

  isFavorite: function () {
    return this.get("favorite").getAttribute("aria-checked") === "true";
  },

  /**
   * Shorthand function to get the text of a dom element
   * @param {*} key key in elements object to fetch
   */
  getText: function (key: string) {
    const element = this.get(key);
    return element ? element.textContent : "";
  },

  /**
   * Shorthand function to click a dom element
   * @param {*} key key in elements object to fetch
   */
  click: function (key: string) {
    this.get(key).click();
    return this;
  },

  /**
   * Shorthand function to focus a dom element
   * @param {*} key key in elements object to fetch
   */
  focus: function (key: string) {
    return this.get(key).focus();
  },
};

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
    addHotkey("Control+p", function () {
      elements.click("settings");
      setTimeout(() => {
        elements.click("openSettings");
      }, 100);
    });
    addHotkey("Control+l", function () {
      handleLogout();
    });

    addHotkey("Control+a", function () {
      elements.click("favorite");
    });

    addHotkey("Control+h", function () {
      tidalController.goToHome();
    });

    addHotkey("backspace", function () {
      elements.click("back");
    });

    addHotkey("shift+backspace", function () {
      elements.click("forward");
    });

    addHotkey("control+u", function () {
      // reloading window without cache should show the update bar if applicable
      window.location.reload();
    });

    addHotkey("control+r", function () {
      elements.click("repeat");
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
          elements.click("next");
          break;
        case globalEvents.previous:
          elements.click("previous");
          break;
        case globalEvents.toggleFavorite:
          elements.click("favorite");
          break;
        case globalEvents.toggleShuffle:
          elements.click("shuffle");
          break;
        case globalEvents.toggleRepeat:
          elements.click("repeat");
          break;
        default:
          break;
      }
    });
  });
}

/**
 * Update the current status of tidal (e.g playing or paused)
 */
function getCurrentlyPlayingStatus() {
  const pause = elements.get("pause");
  let status = undefined;

  // if pause button is visible tidal is playing
  if (pause) {
    status = MediaStatus.playing;
  } else {
    status = MediaStatus.paused;
  }
  return status;
}

function getCurrentShuffleState() {
  const shuffle = elements.get("shuffle");
  return shuffle?.getAttribute("aria-checked") === "true";
}

function getCurrentRepeatState() {
  const repeat = elements.get("repeat");
  switch (repeat?.getAttribute("data-type")) {
    case "button__repeatAll":
      return RepeatState.all;
    case "button__repeatSingle":
      return RepeatState.single;
    default:
      return RepeatState.off;
  }
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
            default:
              elements.click(eventValue);
          }
        });
      });
      // Override get position function
      player.getPosition = function () {
        return convertDuration(elements.getText("current")) * 1000 * 1000;
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
        "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + getTrackID(),
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
  const id = getTrackID();
  return `https://tidal.com/browse/track/${id}`;
}

function getTrackID() {
  const URLelement = elements.get("title").querySelector("a");
  if (URLelement !== null) {
    const id = URLelement.href.replace(/\D/g, "");
    return id;
  }

  return window.location;
}

/**
 * Watch for song changes and update title + notify
 */
setInterval(function () {
  const title = elements.getText("title");
  const artistsArray = elements.getArtistsArray();
  const artistsString = elements.getArtistsString(artistsArray);
  const songDashArtistTitle = `${title} - ${artistsString}`;
  const staticTitle = "TIDAL Hi-Fi";
  const titleOrArtistsChanged = currentSong !== songDashArtistTitle;
  const current = elements.getText("current");
  const currentStatus = getCurrentlyPlayingStatus();
  const shuffleState = getCurrentShuffleState();
  const repeatState = getCurrentRepeatState();

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
    const album = elements.getAlbumName();
    const duration = elements.getText("duration");
    const options: MediaInfo = {
      title,
      artists: artistsString,
      album: album,
      playingFrom: elements.getText("playing_from"),
      status: currentStatus,
      url: getTrackURL(),
      current,
      currentInSeconds: convertDurationToSeconds(current),
      duration,
      durationInSeconds: convertDurationToSeconds(duration),
      image: "",
      icon: "",
      favorite: elements.isFavorite(),

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
    currentPlayStatus = currentStatus;

    const image = elements.getSongIcon();

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
          elements.click("next");
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
