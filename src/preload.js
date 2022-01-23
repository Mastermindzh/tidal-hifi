const { setTitle } = require("./scripts/window-functions");
const { dialog, process, Notification } = require("electron").remote;
const { store, settings } = require("./scripts/settings");
const { ipcRenderer } = require("electron");
const { app } = require("electron").remote;
const { downloadFile } = require("./scripts/download");
const statuses = require("./constants/statuses");
const hotkeys = require("./scripts/hotkeys");
const globalEvents = require("./constants/globalEvents");
const notificationPath = `${app.getPath("userData")}/notification.jpg`;
let currentSong = "";
let player;
let currentPlayStatus = statuses.paused;
let progressBarTime;
let currentTimeChanged = false;
let currentTime;
let currentURL = undefined;

const elements = {
  play: '*[data-test="play"]',
  pause: '*[data-test="pause"]',
  next: '*[data-test="next"]',
  previous: 'button[data-test="previous"]',
  title: '*[data-test^="footer-track-title"]',
  artists: '*[data-test^="grid-item-detail-text-title-artist"]',
  home: '*[data-test="menu--home"]',
  back: '[class^="backwardButton"]',
  forward: '[class^="forwardButton"]',
  search: '[class^="searchField"]',
  shuffle: '*[data-test="shuffle"]',
  repeat: '*[data-test="repeat"]',
  block: '[class="blockButton"]',
  account: '*[data-test^="profile-image-button"]',
  settings: '*[data-test^="open-settings"]',
  media: '*[data-test="current-media-imagery"]',
  image: "img",
  current: '*[data-test="current-time"]',
  duration: '*[data-test="duration-time"]',
  bar: '*[data-test="progress-bar"]',
  footer: "#footerPlayer",
  album_header_title: '.header-details [data-test="title"]',
  playing_title: 'span[data-test="table-cell-title"].css-geqnfr',
  album_name_cell: '[data-test="table-cell-album"]',
  tracklist_row: '[data-test="tracklist-row"]',

  /**
   * Get an element from the dom
   * @param {*} key key in elements object to fetch
   */
  get: function (key) {
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

  getArtists: function () {
    const footer = this.get("footer");

    if (footer) {
      const artists = footer.querySelector(this["artists"]);
      if (artists) {
        return artists.innerText;
      }
    }

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
      if (currentPlayStatus === statuses.playing) {
        const row = window.document.querySelector(this.playing_title).closest(this.tracklist_row);
        if (row) {
          return row.querySelector(this.album_name_cell).textContent;
        }
      }
    }

    return "";
  },

  /**
   * Shorthand function to get the text of a dom element
   * @param {*} key key in elements object to fetch
   */
  getText: function (key) {
    const element = this.get(key);
    return element ? element.textContent : "";
  },

  /**
   * Shorthand function to click a dom element
   * @param {*} key key in elements object to fetch
   */
  click: function (key) {
    this.get(key).click();
    return this;
  },

  /**
   * Shorthand function to focus a dom element
   * @param {*} key key in elements object to fetch
   */
  focus: function (key) {
    return this.get(key).focus();
  },
};

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
 * Add hotkeys for when tidal is focused
 * Reflects the desktop hotkeys found on:
 * https://defkey.com/tidal-desktop-shortcuts
 */
function addHotKeys() {
  if (store.get(settings.enableCustomHotkeys)) {
    hotkeys.add("Control+p", function () {
      elements.click("account").click("settings");
    });
    hotkeys.add("Control+l", function () {
      handleLogout();
    });

    hotkeys.add("Control+h", function () {
      elements.click("home");
    });

    hotkeys.add("backspace", function () {
      elements.click("back");
    });

    hotkeys.add("shift+backspace", function () {
      elements.click("forward");
    });

    hotkeys.add("control+u", function () {
      // reloading window without cache should show the update bar if applicable
      window.location.reload(true);
    });

    hotkeys.add("control+r", function () {
      elements.click("repeat");
    });
  }

  // always add the hotkey for the settings window
  hotkeys.add("control+=", function () {
    ipcRenderer.send(globalEvents.showSettings);
  });
  hotkeys.add("control+0", function () {
    ipcRenderer.send(globalEvents.showSettings);
  });
}

/**
 * This function will ask the user whether he/she wants to log out.
 * It will log the user out if he/she selects "yes"
 */
function handleLogout() {
  const logoutOptions = ["Cancel", "Yes, please", "No, thanks"];

  dialog.showMessageBox(
    null,
    {
      type: "question",
      title: "Logging out",
      message: "Are you sure you want to log out?",
      buttons: logoutOptions,
      defaultId: 2,
    },
    function (response) {
      if (logoutOptions.indexOf("Yes, please") == response) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key.startsWith("_TIDAL_activeSession")) {
            window.localStorage.removeItem(key);
            i = window.localStorage.length + 1;
          }
        }
        window.location.reload();
      }
    }
  );
}

function addFullScreenListeners() {
  window.document.addEventListener("fullscreenchange", (event) => {
    ipcRenderer.send(globalEvents.refreshMenuBar);
  });
}

/**
 * Add ipc event listeners.
 * Some actions triggered outside of the site need info from the site.
 */
function addIPCEventListeners() {
  window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("globalEvent", (event, args) => {
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
      }
    });
  });
}

/**
 * Update the current status of tidal (e.g playing or paused)
 */
function getCurrentlyPlayingStatus() {
  let pause = elements.get("pause");
  let status = undefined;

  // if pause button is visible tidal is playing
  if (pause) {
    status = statuses.playing;
  } else {
    status = statuses.paused;
  }
  return status;
}

/**
 * Convert the duration from MM:SS to seconds
 * @param {*} duration
 */
function convertDuration(duration) {
  const parts = duration.split(":");
  return parseInt(parts[1]) + 60 * parseInt(parts[0]);
}

/**
 * Update Tidal-hifi's media info
 *
 * @param {*} options
 */
function updateMediaInfo(options, notify) {
  if (options) {
    ipcRenderer.send(globalEvents.updateInfo, options);
    if (store.get(settings.notifications) && notify) {
      new Notification({ title: options.title, body: options.message, icon: options.icon }).show();
    }
    if (player) {
      player.metadata = {
        ...player.metadata,
        ...{
          "xesam:title": options.title,
          "xesam:artist": [options.message],
          "xesam:album": options.album,
          "mpris:artUrl": options.image,
          "mpris:length": convertDuration(options.duration) * 1000 * 1000,
        },
      };
      player.playbackStatus = options.status == statuses.paused ? "Paused" : "Playing";
    }
  }
}

/**
 * Checks if Tidal is playing a video or song by grabbing the "a" element from the title.
 * If it's a song it sets the track URL as currentURL, If it's a video it will set currentURL to undefined.
 */
function updateURL() {
  const URLelement = elements.get("title").querySelector("a");
  switch (URLelement) {
    case null:
      currentURL = undefined;
      break;
    default:
      const id = URLelement.href.replace(/[^0-9]/g, "");
      currentURL = `https://tidal.com/browse/track/${id}`;
      break;
  }
}

/**
 * Watch for song changes and update title + notify
 */
setInterval(function () {
  const title = elements.getText("title");
  const artists = elements.getArtists();
  const album = elements.getAlbumName();
  const current = elements.getText("current");
  const duration = elements.getText("duration");
  const appName = "Tidal Hifi";
  const progressBarcurrentTime = elements.get("bar").getAttribute("aria-valuenow");
  const songDashArtistTitle = `${title} - ${artists}`;
  const currentStatus = getCurrentlyPlayingStatus();
  const options = {
    title,
    message: artists,
    album: album,
    status: currentStatus,
    url: currentURL,
    current: current,
    duration: duration,
    "app-name": appName,
  };

  const playStatusChanged = currentStatus !== currentPlayStatus;
  const progressBarTimeChanged = progressBarcurrentTime !== progressBarTime;
  const titleOrArtistChanged = currentSong !== songDashArtistTitle;

  if (titleOrArtistChanged || playStatusChanged || progressBarTimeChanged || currentTimeChanged) {
    // update title, url and play info with new info
    setTitle(songDashArtistTitle);
    updateURL();
    currentSong = songDashArtistTitle;
    currentPlayStatus = currentStatus;

    // check progress bar value and make sure current stays up to date after switch
    if (progressBarTime != progressBarcurrentTime && !titleOrArtistChanged) {
      progressBarTime = progressBarcurrentTime;
      currentTime = options.current;
      options.duration = duration;
      currentTimeChanged = true;
    }

    if (currentTimeChanged) {
      if (options.current == currentTime && currentStatus != "paused") return;
      currentTime = options.current;
      currentTimeChanged = false;
    }

    // make sure current is set to 0 if title changes
    if (titleOrArtistChanged) {
      options.current = "0:00";
      currentTime = options.current;
      progressBarTime = progressBarcurrentTime;
    }

    const image = elements.getSongIcon();

    new Promise((resolve) => {
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
    }).then(
      () => {
        updateMediaInfo(options, titleOrArtistChanged);
      },
      () => {}
    );
  }
}, 200);

if (process.platform === "linux" && store.get(settings.mpris)) {
  try {
    const Player = require("mpris-service");
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
    var events = {
      next: "next",
      previous: "previous",
      pause: "pause",
      playpause: "playpause",
      stop: "stop",
      play: "play",
      loopStatus: "repeat",
      shuffle: "shuffle",
      seek: "seek",
    };
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

addHotKeys();
addIPCEventListeners();
addFullScreenListeners();
