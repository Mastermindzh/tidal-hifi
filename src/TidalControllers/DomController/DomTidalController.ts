import { getTrackURL } from "../../features/tidal/url";
import { convertSecondsToClockFormat } from "../../features/time/parse";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState, type RepeatStateType } from "../../models/repeatState";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import type { TidalController } from "../TidalController";
import { UI_SELECTORS } from "./constants";
import type { DomControllerOptions } from "./DomControllerOptions";
import { clickElement, getElement, getElementAttribute, getElementText } from "./domHelpers";

export class DomTidalController implements TidalController<DomControllerOptions> {
  private updateSubscriber: (state: Partial<MediaInfo>) => void;
  private currentlyPlaying = MediaStatus.paused;
  private currentRepeatState: RepeatStateType = RepeatState.off;
  private currentShuffleState = false;

  /**
   * Get a player element
   */
  getPlayer() {
    const player = getElement("player") as HTMLVideoElement;
    return player || null;
  }

  /**
   * Get the icon of the current media
   */
  getMedia() {
    const figure = getElement("media");

    if (figure) {
      const mediaElement = figure.querySelector(UI_SELECTORS.image);
      if (mediaElement instanceof HTMLImageElement) {
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

      const playStateChanged = currentStatus !== this.currentlyPlaying;
      const shuffleStateChanged = shuffleState !== this.currentShuffleState;
      const repeatStateChanged = repeatState !== this.currentRepeatState;

      if (playStateChanged) this.currentlyPlaying = currentStatus;
      if (shuffleStateChanged) this.currentShuffleState = shuffleState;
      if (repeatStateChanged) this.currentRepeatState = repeatState;

      const album = this.getAlbumName();
      const duration = this.getDuration();
      const volume = this.getVolume();

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
        trackId: this.getTrackId(),
        volume: volume,
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
      this.pause();
    } else {
      this.play();
    }
  }

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
    const player = this.getPlayer();
    if (!player) return MediaStatus.paused;
    return player.paused ? MediaStatus.paused : MediaStatus.playing;
  }

  getCurrentShuffleState() {
    return getElementAttribute("shuffle", "aria-checked") === "true";
  }

  getCurrentRepeatState() {
    switch (getElementAttribute("repeat", "data-type")) {
      case "button__repeatAll":
        return RepeatState.all;
      case "button__repeatSingle":
        return RepeatState.single;
      default:
        return RepeatState.off;
    }
  }

  play() {
    const player = this.getPlayer();
    if (!player) return;
    // Only play if not already playing
    if (this.getCurrentlyPlayingStatus() !== MediaStatus.playing) {
      player.play();
    }
  }
  pause() {
    const player = this.getPlayer();
    if (!player) return;
    // Only pause if currently playing
    if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
      player.pause();
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
    const player = this.getPlayer();
    if (!player) return 0;
    const time = Math.round(player.currentTime);
    return Number.isFinite(time) ? time : 0;
  }
  setCurrentTime(time: number) {
    const player = this.getPlayer();
    if (!player || !Number.isFinite(time)) return;
    player.currentTime = Math.max(Math.min(time, this.getDuration()), 0);
  }
  getDuration() {
    const player = this.getPlayer();
    if (!player) return 0;
    const duration = Math.round(player.duration);
    return Number.isFinite(duration) ? duration : 0;
  }
  getVolume() {
    const player = this.getPlayer();
    if (!player) return 1.0;
    const volume = player.volume;
    return Number.isFinite(volume) ? volume : 1.0;
  }
  setVolume(volume: number) {
    const player = this.getPlayer();
    if (!player || !Number.isFinite(volume)) return;
    // This doesn't update the value of the native range input displayed in the UI.
    player.volume = Math.max(Math.min(volume, 1), 0);
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
      if (artists) return Array.from(artists).map((artist) => artist.textContent);
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
    return this.getMedia();
  }
  getSongImage() {
    return this.getMedia();
  }
}
