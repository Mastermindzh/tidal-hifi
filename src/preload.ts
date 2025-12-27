import { app, dialog, Notification } from "@electron/remote";
import { clipboard, ipcRenderer } from "electron";
import Player from "mpris-service";
import { tidalControllers } from "./constants/controller";
import { globalEvents } from "./constants/globalEvents";
import { settings } from "./constants/settings";
import { downloadImage } from "./features/icon/downloadImage";
import { ListenBrainz } from "./features/listenbrainz/listenbrainz";
import { Logger } from "./features/logger";
import { addCustomCss } from "./features/theming/theming";
import { getTrackURL, getUniversalLink } from "./features/tidal/url";
import { convertDurationToSeconds } from "./features/time/parse";
import { getEmptyMediaInfo, MediaInfo } from "./models/mediaInfo";
import { MediaStatus } from "./models/mediaStatus";
import { addHotkey } from "./scripts/hotkeys";
import { ObjectToDotNotation } from "./scripts/objectUtilities";
import { settingsStore } from "./scripts/settings";
import { setTitle } from "./scripts/window-functions";
import { TidalApiController } from "./TidalControllers/apiController/TidalApiController";
import { DomControllerOptions } from "./TidalControllers/DomController/DomControllerOptions";
import { getDomUpdateFrequency } from "./TidalControllers/DomController/domUpdateFrequency";
import { DomTidalController } from "./TidalControllers/DomController/DomTidalController";
import {
  MediaSessionController,
  MediaSessionControllerOptions,
} from "./TidalControllers/MediaSessionController/MediaSessionController";
import { TidalController } from "./TidalControllers/TidalController";

const albumArtPath = `${app.getPath("userData")}/current.jpg`;
const staticTitle = "TIDAL Hi-Fi";

let currentSong = "";
let player: Player;
let currentPlayingNowDelayId: ReturnType<typeof setTimeout>;
let currentTrackKey = ""; // title + album + artists
let currentTrackScrobbled = false;
let currentTrackDuration = 0;
let lastKnownPosition = 0; // Track position to detect restarts

/**
 * Execute a "playing_now" operation with delay, cancelling any pending "playing_now" operations
 */
function executePlayingNowWithDelay(operation: () => Promise<void> | void): void {
  // Cancel any pending "playing_now" operation
  clearTimeout(currentPlayingNowDelayId);

  currentPlayingNowDelayId = setTimeout(
    async () => {
      try {
        await operation();
      } catch (error) {
        Logger.log("ListenBrainz playing_now error:", { error: JSON.stringify(error) });
      }
    },
    settingsStore.get(settings.ListenBrainz.delay) ?? 0,
  );
}

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
    const mediaSessionControllerOptions: MediaSessionControllerOptions = {
      refreshInterval: getDomUpdateFrequency(
        settingsStore.get<string, number>(settings.updateFrequency),
      ),
    };
    controllerOptions = mediaSessionControllerOptions;
    Logger.log("MediaSessionController initialized");
    break;
  }

  default: {
    tidalController = new DomTidalController();
    const domControllerOptions: DomControllerOptions = {
      refreshInterval: getDomUpdateFrequency(
        settingsStore.get<string, number>(settings.updateFrequency),
      ),
    };
    controllerOptions = domControllerOptions;
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

    addHotkey("control+u", function () {
      // reloading window without cache should show the update bar if applicable
      window.location.reload();
    });

    addHotkey("control+r", function () {
      tidalController.repeat();
    });
    addHotkey("delete", function () {});
    addHotkey("control+w", async function () {
      const url = getUniversalLink(getTrackURL(tidalController.getTrackId()));
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
 * Update Tidal-hifi's media info
 *
 * @param {*} mediaInfo
 */
function updateMediaInfo(mediaInfo: MediaInfo, notify: boolean) {
  if (mediaInfo) {
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
      icon: mediaInfo.localAlbumArt || mediaInfo.image || mediaInfo.icon,
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
        "mpris:length": convertDurationToSeconds(mediaInfo.duration) * 1000 * 1000,
        "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + tidalController.getTrackId(),
      },
      ...ObjectToDotNotation(mediaInfo, "custom:"),
    };
    player.playbackStatus = mediaInfo.status === MediaStatus.paused ? "Paused" : "Playing";
  }
}

/**
 * Update the listenbrainz service with new data based on ListenBrainz guidelines:
 * - Send "playing_now" when a new song starts
 * - Send "single" (scrobble) after half duration or 4 minutes, whichever is sooner
 */
function updateListenBrainz(mediaInfo: MediaInfo) {
  if (
    settingsStore.get(settings.ListenBrainz.enabled) &&
    mediaInfo.status === MediaStatus.playing
  ) {
    const trackKey = `${mediaInfo.title}|${mediaInfo.album}|${mediaInfo.artists}`;
    const currentInSeconds = mediaInfo.currentInSeconds ?? 0;
    const durationInSeconds =
      mediaInfo.durationInSeconds ?? convertDurationToSeconds(mediaInfo.duration);

    // Check if this is a new track or if the same track has restarted
    const hasRestarted = trackKey === currentTrackKey && currentInSeconds < lastKnownPosition - 30;

    if (trackKey !== currentTrackKey || hasRestarted) {
      currentTrackKey = trackKey;
      currentTrackScrobbled = false;
      currentTrackDuration = durationInSeconds;

      // Send "playing_now" for new track, cancelling any pending old "playing_now" operations
      executePlayingNowWithDelay(() => {
        return ListenBrainz.sendPlayingNow(
          mediaInfo.title,
          mediaInfo.artists,
          mediaInfo.album,
          durationInSeconds,
        );
      });
    } else if (!currentTrackScrobbled) {
      // Check if we should scrobble (half duration or 4 minutes, whichever is sooner)
      const scrobbleThreshold = Math.min(currentTrackDuration / 2, 240);

      if (currentInSeconds >= scrobbleThreshold) {
        currentTrackScrobbled = true;

        // Send "single" listen (actual scrobble) - no delay needed due to natural listening time throttling
        try {
          ListenBrainz.scrobbleSingle(
            mediaInfo.title,
            mediaInfo.artists,
            mediaInfo.album,
            currentTrackDuration,
          );
          Logger.log("scrobbled single listen", {
            track: trackKey,
            playedSeconds: currentInSeconds,
            threshold: scrobbleThreshold,
          });
        } catch (error) {
          Logger.log("ListenBrainz scrobble error:", { error: JSON.stringify(error) });
        }
      }
    }

    // Update last known position for restart detection
    lastKnownPosition = currentInSeconds;
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
      const downloadedImagePath = await downloadImage(imageUrlToDownload, albumArtPath);
      currentMediaInfo.localAlbumArt = downloadedImagePath;
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
