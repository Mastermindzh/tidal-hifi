import { app, dialog, Notification } from "@electron/remote";
import { clipboard, ipcRenderer } from "electron";
import fs from "fs";
import Player from "mpris-service";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import { Songwhip } from "./features/songwhip/songwhip";
import {
  ListenBrainz,
  ListenBrainzConstants,
  ListenBrainzStore,
} from "./features/listenbrainz/listenbrainz";
import { Options } from "./models/options";
import { downloadFile } from "./scripts/download";
import { addHotkey } from "./scripts/hotkeys";
import { settingsStore } from "./scripts/settings";
import { setTitle } from "./scripts/window-functions";
import { StoreData } from "./features/listenbrainz/models/storeData";
import { MediaStatus } from "./models/mediaStatus";
import { Logger } from "./features/logger";

const notificationPath = `${app.getPath("userData")}/notification.jpg`;
const appName = "Tidal Hifi";
let currentSong = "";
let player: Player;
let currentPlayStatus = MediaStatus.paused;

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
  account: '*[class^="profileOptions"]',
  settings: '*[data-test^="open-settings"]',
  media: '*[data-test="current-media-imagery"]',
  image: "img",
  current: '*[data-test="current-time"]',
  duration: '*[data-test="duration"]',
  bar: '*[data-test="progress-bar"]',
  footer: "#footerPlayer",
  mediaItem: "[data-type='mediaItem']",
  album_header_title: '.header-details [data-test="title"]',
  currentlyPlaying: "[class^='isPlayingIcon'], [data-test-is-playing='true']",
  album_name_cell: '[class^="album"]',
  tracklist_row: '[data-test="tracklist-row"]',
  volume: '*[data-test="volume"]',
  /**
   * Get an element from the dom
   * @param {*} key key in elements object to fetch
   */
  get: function (key: string) {
    return window.document.querySelector(this[key.toLowerCase()]);
  },

  /**
   * Get the icon of the current song
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
   * returns an array of all artists in the current song
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

    return "";
  },

  isMuted: function () {
    return this.get("volume").getAttribute("aria-checked") === "false"; // it's muted if aria-checked is false
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

function addCustomCss() {
  window.addEventListener("DOMContentLoaded", () => {
    const selectedTheme = settingsStore.get<string, string>(settings.theme);
    if (selectedTheme !== "none") {
      const userThemePath = `${app.getPath("userData")}/themes/${selectedTheme}`;
      const resourcesThemePath = `${process.resourcesPath}/${selectedTheme}`;
      const themeFile = fs.existsSync(userThemePath) ? userThemePath : resourcesThemePath;
      fs.readFile(themeFile, "utf-8", (err, data) => {
        if (err) {
          Logger.alert("An error ocurred reading the theme file.", err, alert);
          return;
        }

        const themeStyle = document.createElement("style");
        themeStyle.innerHTML = data;
        document.head.appendChild(themeStyle);
      });
    }

    // read customCSS (it will override the theme)
    const style = document.createElement("style");
    style.innerHTML = settingsStore.get<string, string[]>(settings.customCSS).join("\n");
    document.head.appendChild(style);
  });
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
 * Play or pause the current song
 */
function playPause() {
  const play = elements.get("play");

  if (play) {
    elements.click("play");
  } else {
    elements.click("pause");
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
      elements.click("account");
      setTimeout(() => {
        elements.click("settings");
      }, 100);
    });
    addHotkey("Control+l", function () {
      handleLogout();
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
      // reloading window without cache should show the update bar if applicable
      window.location.reload();
    });

    addHotkey("control+r", function () {
      elements.click("repeat");
    });
    addHotkey("control+w", async function () {
      const result = await ipcRenderer.invoke(globalEvents.whip, getTrackURL());
      const url = Songwhip.getWhipUrl(result);
      clipboard.writeText(url);
      new Notification({
        title: `Successfully whipped: `,
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
          playPause();
          break;
        case globalEvents.next:
          elements.click("next");
          break;
        case globalEvents.previous:
          elements.click("previous");
          break;
        case globalEvents.play:
          elements.click("play");
          break;
        case globalEvents.pause:
          elements.click("pause");
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
 * @param {*} options
 */
function updateMediaInfo(options: Options, notify: boolean) {
  if (options) {
    ipcRenderer.send(globalEvents.updateInfo, options);
    if (settingsStore.get(settings.notifications) && notify) {
      new Notification({ title: options.title, body: options.artists, icon: options.icon }).show();
    }
    updateMpris(options);
    updateListenBrainz(options);
  }
}

function updateMpris(options: Options) {
  if (player) {
    player.metadata = {
      ...player.metadata,
      ...{
        "xesam:title": options.title,
        "xesam:artist": [options.artists],
        "xesam:album": options.album,
        "mpris:artUrl": options.image,
        "mpris:length": convertDuration(options.duration) * 1000 * 1000,
        "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + getTrackID(),
      },
    };
    player.playbackStatus = options.status === MediaStatus.paused ? "Paused" : "Playing";
  }
}

function updateListenBrainz(options: Options) {
  if (settingsStore.get(settings.ListenBrainz.enabled)) {
    const oldData = ListenBrainzStore.get(ListenBrainzConstants.oldData) as StoreData;
    if (
      (!oldData && options.status === MediaStatus.playing) ||
      (oldData && oldData.title !== options.title)
    ) {
      ListenBrainz.scrobble(
        options.title,
        options.artists,
        options.status,
        convertDuration(options.duration)
      );
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

function updateMediaSession(options: Options) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: options.title,
      artist: options.artists,
      album: options.album,
      artwork: [
        {
          src: options.icon,
          sizes: "640x640",
          type: "image/png",
        },
      ],
    });
  }
}

/**
 * Watch for song changes and update title + notify
 */
setInterval(function () {
  const title = elements.getText("title");
  const artistsArray = elements.getArtistsArray();
  const artistsString = elements.getArtistsString(artistsArray);
  skipArtistsIfFoundInSkippedArtistsList(artistsArray);

  const album = elements.getAlbumName();
  const current = elements.getText("current");
  const duration = elements.getText("duration");
  const songDashArtistTitle = `${title} - ${artistsString}`;
  const currentStatus = getCurrentlyPlayingStatus();
  const options = {
    title,
    artists: artistsString,
    album: album,
    status: currentStatus,
    url: getTrackURL(),
    current,
    duration,
    "app-name": appName,
    image: "",
    icon: "",
  };

  const titleOrArtistsChanged = currentSong !== songDashArtistTitle;

  // update title, url and play info with new info
  setTitle(songDashArtistTitle);
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
    if (titleOrArtistsChanged) {
      updateMediaSession(options);
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
      return convertDuration(elements.getText("current")) * 1000 * 1000;
    };

    player.on("quit", function () {
      app.quit();
    });
  } catch (exception) {
    console.log("player api not working");
  }
}
addCustomCss();
addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
