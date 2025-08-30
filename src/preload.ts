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

const notificationPath = `${app.getPath("userData")}/notification.jpg`;
let player: Player;
let currentListenBrainzDelayId: ReturnType<typeof setTimeout>;
let scrobbleWaitingForDelay = false;

let lastProcessedTrackId = "";
let currentMediaInfo: MediaInfo | null = null;
let currentNotification: Electron.Notification;
let cachedBearerToken: string | null = null;

// bearer token from main
ipcRenderer.on('bearer-token-intercepted', (_event, token: string) => {
  cachedBearerToken = token;
});

function getAuthToken() {
  return cachedBearerToken;
}

// gets all media info from TIDAL API
async function getMediaInfoFromAPI(trackId: string) {
  const token = getAuthToken();
  if (!trackId || !token) return null;

  // try to find country code from current URL, fallback to US
  const currentUrl = window.location.href;
  const countryMatch = currentUrl.match(/[?&]country=([A-Z]{2})/i);
  const countryCode = countryMatch ? countryMatch[1].toUpperCase() : 'US';

  const url = `https://tidal.com/v1/tracks/${trackId}?countryCode=${countryCode}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'authorization': token },
    });

    if (!response.ok) {
      Logger.log("Track API request failed", {
        status: response.status,
        trackId
      });
      return null;
    }

    const data = await response.json();
    const artistsString = data.artists.map((artist: { name: string }) => artist.name).join(', ');

    return {
      title: data.title,
      artists: artistsString,
      artistsArray: data.artists.map((artist: { name: string }) => artist.name),
      album: data.album.title,
    };
  } catch (error) {
    Logger.log("Failed to fetch track info from API", {
      error: error.message,
      trackId
    });
    return null;
  }
}

const elements = {
  play: '*[data-test="play"]',
  pause: '*[data-test="pause"]',
  next: '*[data-test="next"]',
  previous: 'button[data-test="previous"]',
  title: '*[data-test^="footer-track-title"]',
  home: '*[data-test="menu--home"]',
  back: '[title^="Back"]',
  forward: '[title^="Next"]',
  search: '[class^="searchField"]',
  shuffle: '*[data-test="shuffle"]',
  repeat: '*[data-test="repeat"]',
  media: '*[data-test="current-media-imagery"]',
  image: "img",
  current: '*[data-test="current-time"]',
  duration: '*[class^=_playbackControlsContainer] *[data-test="duration"]',
  playing_from: '*[class^="_playingFrom"] span:nth-child(2)',
  volume: '*[data-test="volume"]',
  favorite: '*[data-test="footer-favorite-button"]',

  get: function (key: string) {
    return window.document.querySelector(this[key.toLowerCase()]);
  },

  getSongIcon: function () {
    const figure = this.get("media");
    if (figure) {
      const mediaElement = figure.querySelector(this["image"]);
      if (mediaElement) return mediaElement.src.replace("80x80", "640x640");
    }
    return "";
  },

  isMuted: function () {
    return this.get("volume")?.getAttribute("aria-checked") === "false";
  },

  isFavorite: function () {
    return this.get("favorite")?.getAttribute("aria-checked") === "true";
  },

  getText: function (key: string) {
    const element = this.get(key);
    return element ? element.textContent : "";
  },

  click: function (key: string) {
    this.get(key)?.click();
    return this;
  },
};

function getUpdateFrequency() {
  const storeValue = settingsStore.get<string, number>(settings.updateFrequency);
  return !isNaN(storeValue) ? storeValue : 500;
}

function playPause() {
  elements.get("play") ? elements.click("play") : elements.click("pause");
}

// Clear ListenBrainz store on startup
ListenBrainzStore.clear();

/**
 * Add hotkeys for when tidal is focused
 */
function addHotKeys() {
  if (settingsStore.get(settings.enableCustomHotkeys)) {
    addHotkey("Control+a", function () {
      elements.click("favorite");
    });

    addHotkey("Control+h", function () {
      elements.click("home");
    });

    addHotkey("backspace", function () {
      elements.click("back");
    });

    addHotkey("shift+backspace", function () {
      elements.click("forward");
    });

    addHotkey("control+u", function () {
      window.location.reload();
    });

    addHotkey("control+r", function () {
      elements.click("repeat");
    });

    addHotkey("control+w", async function () {
      const url = await ipcRenderer.invoke(globalEvents.getUniversalLink, getTrackURL());
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

function addFullScreenListeners() {
  window.document.addEventListener("fullscreenchange", () => {
    ipcRenderer.send(globalEvents.refreshMenuBar);
  });
}

/**
 * Add ipc event listeners.
 */
function addIPCEventListeners() {
  window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("globalEvent", (_event, args) => {
      switch (args) {
        case globalEvents.playPause:
        case globalEvents.play:
        case globalEvents.pause:
          playPause();
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

function getCurrentlyPlayingStatus() {
  return elements.get("pause") ? MediaStatus.playing : MediaStatus.paused;
}

function getCurrentShuffleState() {
  return elements.get("shuffle")?.getAttribute("aria-checked") === "true";
}

function getCurrentRepeatState() {
  switch (elements.get("repeat")?.getAttribute("data-type")) {
    case "button__repeatAll": return RepeatState.all;
    case "button__repeatSingle": return RepeatState.single;
    default: return RepeatState.off;
  }
}

function updateMediaInfo(mediaInfo: MediaInfo, notify: boolean) {
  if (mediaInfo) {
    currentMediaInfo = mediaInfo;
    ipcRenderer.send(globalEvents.updateInfo, mediaInfo);
    updateMpris(mediaInfo);
    updateListenBrainz(mediaInfo);
    if (notify) sendNotification(mediaInfo);
  }
}

async function sendNotification(mediaInfo: MediaInfo) {
  if (settingsStore.get(settings.notifications)) {
    currentNotification?.close();
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
              playPause();
              break;
            default:
              elements.click(eventValue);
          }
        });
      });

      // Override get position function
      player.getPosition = function () {
        return convertDurationToSeconds(elements.getText("current")) * 1000 * 1000;
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
        "xesam:url": mediaInfo.url,
        "mpris:artUrl": mediaInfo.image,
        "mpris:length": convertDurationToSeconds(mediaInfo.duration) * 1000 * 1000,
        "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + getTrackID(),
      },
      ...ObjectToDotNotation(mediaInfo, "custom:"),
    };
    player.playbackStatus = mediaInfo.status === MediaStatus.paused ? "Paused" : "Playing";
  }
}

/**
 * Update the listenbrainz service with new data
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
              convertDurationToSeconds(mediaInfo.duration)
            );
            scrobbleWaitingForDelay = false;
          },
          settingsStore.get(settings.ListenBrainz.delay) ?? 0
        );
      }
    }
  }
}

function getTrackURL() {
  const id = getTrackID();
  return id ? `https://tidal.com/browse/track/${id}` : "";
}

function getTrackID() {
  const URLelement = elements.get("title")?.querySelector("a");
  if (URLelement) {
    return URLelement.href.split('/track/')[1];
  }
  return "";
}

function skipArtistsIfFoundInSkippedArtistsList(artists: string[]) {
  const skippedArtists = settingsStore.get<string, string[]>(settings.skippedArtists);
  const shouldSkip = settingsStore.get(settings.skipArtists);

  if (shouldSkip && skippedArtists?.length > 0) {
    const foundArtist = artists.some((artist) => skippedArtists.includes(artist));
    if (foundArtist) {
      Logger.log("Skipping track due to artist being in skip list", {
        artists,
        trackId: lastProcessedTrackId
      });
      elements.click("next");
    }
  }
}

/**
 * The main loop, using a robust track ID-based approach.
 */
setInterval(async function () {
  const trackId = getTrackID();
  const currentStatus = getCurrentlyPlayingStatus();

  // new song is playing, get all data from API.
  if (trackId && trackId !== lastProcessedTrackId) {
    const mediaData = await getMediaInfoFromAPI(trackId);
    if (!mediaData) return; // API call failed, will retry next interval

    lastProcessedTrackId = trackId;
    const { title, artists, artistsArray, album } = mediaData;

    skipArtistsIfFoundInSkippedArtistsList(artistsArray);

    const songDashArtistTitle = `${title} - ${artists}`;
    const staticTitle = "TIDAL Hi-Fi";
    const shouldUseStaticTitle = settingsStore.get(settings.staticWindowTitle);
    shouldUseStaticTitle ? setTitle(staticTitle) : setTitle(songDashArtistTitle);

    const options: MediaInfo = {
      title,
      artists,
      album,
      playingFrom: elements.getText("playing_from"),
      status: currentStatus,
      url: getTrackURL(),
      current: elements.getText("current"),
      currentInSeconds: convertDurationToSeconds(elements.getText("current")),
      duration: elements.getText("duration"),
      durationInSeconds: convertDurationToSeconds(elements.getText("duration")),
      image: "",
      icon: "",
      favorite: elements.isFavorite(),
      player: {
        status: currentStatus,
        shuffle: getCurrentShuffleState(),
        repeat: getCurrentRepeatState(),
      },
    };

    const image = elements.getSongIcon();

    new Promise<void>((resolve) => {
      if (image.startsWith("http")) {
        options.image = image;
        downloadFile(image, notificationPath).then(
          () => {
            options.icon = notificationPath;
            resolve();
          },
          () => resolve() // resolve even if download fails
        );
      } else {
        resolve();
      }
    }).then(() => {
      updateMediaInfo(options, true); // notify for new song
    });
    return; // end here since we just did a full update
  }

  // Same song, but state might have changed (e.g., pause/play, time update).
  if (currentMediaInfo && trackId === lastProcessedTrackId) {
    const playStateChanged = currentMediaInfo.status !== currentStatus;
    const timeChanged = currentMediaInfo.current !== elements.getText("current");

    if (playStateChanged || timeChanged) {
      const updatedInfo = {
        ...currentMediaInfo,
        status: currentStatus,
        player: { ...currentMediaInfo.player, status: currentStatus },
        current: elements.getText("current"),
        currentInSeconds: convertDurationToSeconds(elements.getText("current")),
      };
      updateMediaInfo(updatedInfo, false); // No notification for simple state change
    }
  }
}, getUpdateFrequency());

// Initial setup calls
addMPRIS();
addCustomCss(app);
addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
