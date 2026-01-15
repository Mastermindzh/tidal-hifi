import { convertSecondsToClockFormat } from "../../features/time/parse";
import { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState } from "../../models/repeatState";
import { TidalController } from "../TidalController";
import { DomControllerOptions } from "./DomControllerOptions";
import { getTrackURL } from "../../features/tidal/url";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { UI_SELECTORS } from "./constants";
import { clickElement, getElement, getElementAttribute, getElementText } from "./domHelpers";

export class DomTidalController implements TidalController<DomControllerOptions> {
  private updateSubscriber: (state: Partial<MediaInfo>) => void;
  private currentlyPlaying = MediaStatus.paused;
  private currentRepeatState: RepeatState = RepeatState.off;
  private currentShuffleState = false;

  /**
   * Get a player element
   */
  _getPlayer() {
    return getElement("player") as HTMLVideoElement;
  }

  /**
   * Get the icon of the current media
   */
  _getSongIcon() {
    const figure = getElement("media");

    if (figure) {
      const mediaElement = figure.querySelector(UI_SELECTORS.image);
      if (mediaElement instanceof HTMLVideoElement) {
        return mediaElement.src.replace("80x80", "640x640");
      }
    }

    return "";
  }

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void) {
    this.updateSubscriber = callback;
  }

  bootstrap(options: DomControllerOptions) {
    const constrainedInterval = constrainPollingInterval(options.refreshInterval);
    setInterval(async () => {
      const title = this.getTitle();
      const artistsArray = this.getArtists();
      const artistsString = this.getArtistsString();

      const current = this.getCurrentTime();
      const currentStatus = this.getCurrentlyPlayingStatus();
      const shuffleState = this.getCurrentShuffleState();
      const repeatState = this.getCurrentRepeatState();

      const playStateChanged = currentStatus != this.currentlyPlaying;
      const shuffleStateChanged = shuffleState != this.currentShuffleState;
      const repeatStateChanged = repeatState != this.currentRepeatState;

      if (playStateChanged) this.currentlyPlaying = currentStatus;
      if (shuffleStateChanged) this.currentShuffleState = shuffleState;
      if (repeatStateChanged) this.currentRepeatState = repeatState;

      const album = this.getAlbumName();
      const duration = this.getDuration();
      const updatedInfo = {
        title,
        artists: artistsString,
        artistsArray,
        album: album,
        playingFrom: this.getPlayingFrom(),
        status: currentStatus,
        url: getTrackURL(this.getTrackId()),
        current: convertSecondsToClockFormat(current),
        currentInSeconds: current,
        duration: convertSecondsToClockFormat(duration),
        durationInSeconds: duration,
        image: this.getSongIcon(),
        icon: this.getSongIcon(),
        favorite: this.isFavorite(),
        player: {
          status: currentStatus,
          shuffle: shuffleState,
          repeat: repeatState,
        },
      };

      this.updateSubscriber(updatedInfo);
    }, constrainedInterval);
  }

  playPause() {
    const playing = this.getCurrentlyPlayingStatus();

    if (playing === MediaStatus.playing) {
      this.pause()
    } else {
      this.play();
    }
  };

  toggleFavorite() {
    clickElement("favorite");
  }

  back() {
    clickElement("back");
  }
  forward() {
    clickElement("forward");
  }
  repeat() {
    clickElement("repeat");
  }

  next() {
    clickElement("next");
  }
  previous() {
    clickElement("previous");
  }
  toggleShuffle() {
    clickElement("shuffle");
  }
  getCurrentlyPlayingStatus() {
    if (this._getPlayer().paused) {
      return MediaStatus.paused;
    } else {
      return MediaStatus.playing;
    }
  }

  getCurrentShuffleState() {
    return getElementAttribute("shuffle", "aria-checked") === "true";
  }

  getCurrentRepeatState() {
    switch (getElementAttribute("repeat","data-type")) {
      case "button__repeatAll":
        return RepeatState.all;
      case "button__repeatSingle":
        return RepeatState.single;
      default:
        return RepeatState.off;
    }
  }

  play() {
    // Only play if not already playing
    if (this.getCurrentlyPlayingStatus() !== MediaStatus.playing) {
      this._getPlayer().play();
    }
  }
  pause() {
    // Only pause if currently playing
    if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
      this._getPlayer().pause();
    }
  }
  stop() {
    this.pause();
  }

  getTrackId() {
    const linkElement = getElement("title").querySelector("a");
    if (linkElement !== null) {
      return linkElement.href.replace(/\D/g, "");
    }

    return window.location.toString();
  }

  getCurrentTime() {
    return Math.round(this._getPlayer().currentTime);
  }
  setCurrentTime(time: number) {
    this._getPlayer().currentTime = Math.max(Math.min(time, this.getDuration()), 0);
  }
  getDuration() {
    return Math.round(this._getPlayer().duration);
  }
  getVolume() {
    return this._getPlayer().volume;
  }
  setVolume(volume: number) {
    // This doesn't update the value of the native range input displayed in the UI.
    this._getPlayer().volume = Math.max(Math.min(volume, 1), 0);
  }

  getAlbumName() {
    try {
      //If listening to an album, get its name from the header title
      if (globalThis.location.href.includes("/album/")) {
        const albumName = globalThis.document.querySelector(UI_SELECTORS.album_header_title);
        if (albumName) {
          return albumName.textContent;
        }
        //If listening to a playlist or a mix, get the album name from the list
      } else if (
        globalThis.location.href.includes("/playlist/") ||
        globalThis.location.href.includes("/mix/")
      ) {
        if (this.currentlyPlaying === MediaStatus.playing) {
          // find the currently playing element from the list (which might be in an album icon), traverse back up to the mediaItem (row) and select the album cell.
          // document.querySelector("[class^='isPlayingIcon'], [data-test-is-playing='true']").closest('[data-type="mediaItem"]').querySelector('[class^="album"]').textContent
          const row = window.document
            .querySelector(this.currentlyPlaying)
            .closest(UI_SELECTORS.mediaItem);
          if (row) {
            return row.querySelector(UI_SELECTORS.album_name_cell).textContent;
          }
        }
      }

      // see whether we're on the queue page and get it from there
      const queueAlbumName = getElementText("queue_album");
      if (queueAlbumName) {
        return queueAlbumName;
      }

      return "";
    } catch {
      return "";
    }
  }
  getTitle() {
    return getElementText("title");
  }
  getArtists() {
    const footer = getElement("footer");

    if (footer) {
      const artists = footer.querySelectorAll(UI_SELECTORS.artists);
      if (artists)
        return Array.from(artists).map((artist) => artist.textContent);
    }
    return [];
  }

  getArtistsString() {
    const artistsArray = this.getArtists();
    if (artistsArray.length > 0) return artistsArray.join(", ");
    return "unknown artist(s)";
  }
  getPlayingFrom() {
    return getElementText("playing_from");
  }

  isFavorite() {
    return getElementAttribute("favorite", "aria-checked") === "true";
  }
  getSongIcon() {
    return this._getSongIcon();
  }
  getSongImage() {
    return this._getSongIcon();
  }
}
