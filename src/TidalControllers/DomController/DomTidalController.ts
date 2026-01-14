import { convertSecondsToClockFormat } from "../../features/time/parse";
import { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState } from "../../models/repeatState";
import { TidalController } from "../TidalController";
import { DomControllerOptions } from "./DomControllerOptions";
import { getTrackURL } from "../../features/tidal/url";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { UI_SELECTORS } from "./constants";
import {click, get, getText} from "./DomHelpers";

/**
 * Get a player element
 */
function getPlayer() {
  return get("player") as HTMLVideoElement;
}

/**
 * Get the icon of the current media
 */
function getSongIcon() {
  const figure = get("media");

  if (figure) {
    const mediaElement = figure.querySelector(UI_SELECTORS.image) as HTMLImageElement;
    if (mediaElement) {
      return mediaElement.src.replace("80x80", "640x640");
    }
  }

  return "";
}

/**
 * returns an array of all artists in the current media
 * @returns array of artists
 */
function getArtistsArray() {
  const footer = get("footer");

  if (footer) {
    const artists = footer.querySelectorAll(UI_SELECTORS.artists);
    if (artists)
      return Array.from(artists).map((artist) => (artist as HTMLElement).textContent);
  }
  return [];
}

/**
 * unify the artists array into a string separated by commas
 * @param {Array} artistsArray
 * @returns {String} artists
 */
function getArtistsString(artistsArray: string[]): string {
  if (artistsArray.length > 0) return artistsArray.join(", ");
  return "unknown artist(s)";
}

// function isMuted() {
//   return get("volume").getAttribute("aria-checked") === "false"; // it's muted if aria-checked is false
// }

export class DomTidalController implements TidalController<DomControllerOptions> {
  private updateSubscriber: (state: Partial<MediaInfo>) => void;
  private currentlyPlaying = MediaStatus.paused;
  private currentRepeatState: RepeatState = RepeatState.off;
  private currentShuffleState = false;

  private _getAlbumName() {
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
      const queueAlbumName = getText("queue_album");
      if (queueAlbumName) {
        return queueAlbumName;
      }

      return "";
    } catch {
      return "";
    }
  }

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void {
    this.updateSubscriber = callback;
  }

  bootstrap(options: DomControllerOptions): void {
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

  playPause = (): void => {
    const playing = this.getCurrentlyPlayingStatus();

    if (playing === MediaStatus.playing) {
      this.pause()
    } else {
      this.play();
    }
  };

  toggleFavorite(): void {
    click("favorite");
  }

  back(): void {
    click("back");
  }
  forward(): void {
    click("forward");
  }
  repeat(): void {
    click("repeat");
  }

  next(): void {
    click("next");
  }
  previous(): void {
    click("previous");
  }
  toggleShuffle(): void {
    click("shuffle");
  }
  getCurrentlyPlayingStatus() {
    if (getPlayer().paused) {
      return MediaStatus.paused;
    } else {
      return MediaStatus.playing;
    }
  }

  getCurrentShuffleState() {
    const shuffle = get("shuffle");
    return shuffle?.getAttribute("aria-checked") === "true";
  }

  getCurrentRepeatState() {
    const repeat = get("repeat");
    switch (repeat?.getAttribute("data-type")) {
      case "button__repeatAll":
        return RepeatState.all;
      case "button__repeatSingle":
        return RepeatState.single;
      default:
        return RepeatState.off;
    }
  }

  play(): void {
    // Only play if not already playing
    if (this.getCurrentlyPlayingStatus() !== MediaStatus.playing) {
      getPlayer().play();
    }
  }
  pause(): void {
    // Only pause if currently playing
    if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
      getPlayer().pause();
    }
  }
  stop(): void {
    this.pause();
  }

  getTrackId(): string {
    const LinkElement = get("title").querySelector("a");
    if (LinkElement !== null) {
      return LinkElement.href.replace(/\D/g, "");
    }

    return window.location.toString();
  }

  getCurrentTime(): number {
    return Math.round(getPlayer().currentTime);
  }
  setCurrentTime(time: number): void {
    getPlayer().currentTime = Math.max(Math.min(time, this.getDuration()), 0);
  }
  getDuration(): number {
    return Math.round(getPlayer().duration);
  }
  getVolume(): number {
    return getPlayer().volume;
  }
  setVolume(volume: number) {
    // This doesn't update the value of the native range input displayed in the UI.
    getPlayer().volume = Math.max(Math.min(volume, 1), 0);
  }

  getAlbumName(): string {
    return this._getAlbumName();
  }
  getTitle(): string {
    return getText("title");
  }
  getArtists(): string[] {
    return getArtistsArray();
  }

  getArtistsString(): string {
    return getArtistsString(this.getArtists());
  }
  getPlayingFrom(): string {
    return getText("playing_from");
  }

  isFavorite(): boolean {
    return get("favorite").getAttribute("aria-checked") === "true";
  }
  getSongIcon(): string {
    return getSongIcon();
  }
  getSongImage(): string {
    return getSongIcon();
  }
}
