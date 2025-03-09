import { convertDurationToSeconds } from "../../features/time/parse";
import { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState } from "../../models/repeatState";
import { TidalController } from "../TidalController";
import { DomControllerOptions } from "./DomControllerOptions";

export class DomTidalController implements TidalController<DomControllerOptions> {
  private updateSubscriber: (state: Partial<MediaInfo>) => void;
  private currentlyPlaying = MediaStatus.paused;
  private currentRepeatState: RepeatState = RepeatState.off;
  private currentShuffleState = false;

  private readonly elements = {
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
      return globalThis.document.querySelector(this[key.toLowerCase()]);
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
        if (artists)
          return Array.from(artists).map((artist) => (artist as HTMLElement).textContent);
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
      if (globalThis.location.href.includes("/album/")) {
        const albumName = globalThis.document.querySelector(this.album_header_title);
        if (albumName) {
          return albumName.textContent;
        }
        //If listening to a playlist or a mix, get album name from the list
      } else if (
        globalThis.location.href.includes("/playlist/") ||
        globalThis.location.href.includes("/mix/")
      ) {
        if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
          // find the currently playing element from the list (which might be in an album icon), traverse back up to the mediaItem (row) and select the album cell.
          // document.querySelector("[class^='isPlayingIcon'], [data-test-is-playing='true']").closest('[data-type="mediaItem"]').querySelector('[class^="album"]').textContent
          const row = window.document.querySelector(this.currentlyPlaying).closest(this.mediaItem);
          if (row) {
            return row.querySelector(this.album_name_cell).textContent;
          }
        }
      }

      // see whether we're on the queue page and get it from there
      const queueAlbumName = this.getText("queue_album");
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

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void {
    this.updateSubscriber = callback;
  }

  bootstrap(options: DomControllerOptions): void {
    /**
     * Checks if Tidal is playing a video or song by grabbing the "a" element from the title.
     * If it's a song it returns the track URL, if not it will return undefined
     */
    const getTrackURL = () => {
      const id = this.getTrackId();
      return `https://tidal.com/browse/track/${id}`;
    };

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
        url: getTrackURL(),
        current,
        currentInSeconds: convertDurationToSeconds(current),
        duration,
        durationInSeconds: convertDurationToSeconds(duration),
        image: this.getSongIcon(),
        favorite: this.isFavorite(),
        player: {
          status: currentStatus,
          shuffle: shuffleState,
          repeat: repeatState,
        },
      };

      this.updateSubscriber(updatedInfo);
    }, options.refreshInterval);
  }

  playPause = (): void => {
    const play = this.elements.get("play");

    if (play) {
      this.elements.click("play");
    } else {
      this.elements.click("pause");
    }
  };

  goToHome(): void {
    this.elements.click("home");
  }

  openSettings(): void {
    this.elements.click("settings");
    setTimeout(() => {
      this.elements.click("openSettings");
    }, 100);
  }

  toggleFavorite(): void {
    this.elements.click("favorite");
  }

  back(): void {
    this.elements.click("back");
  }
  forward(): void {
    this.elements.click("forward");
  }
  repeat(): void {
    this.elements.click("repeat");
  }

  next(): void {
    this.elements.click("next");
  }
  previous(): void {
    this.elements.click("previous");
  }
  toggleShuffle(): void {
    this.elements.click("shuffle");
  }
  getCurrentlyPlayingStatus() {
    const pause = this.elements.get("pause");

    // if pause button is visible tidal is playing
    if (pause) {
      return MediaStatus.playing;
    } else {
      return MediaStatus.paused;
    }
  }

  getCurrentShuffleState() {
    const shuffle = this.elements.get("shuffle");
    return shuffle?.getAttribute("aria-checked") === "true";
  }

  getCurrentRepeatState() {
    const repeat = this.elements.get("repeat");
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
    this.playPause();
  }
  pause(): void {
    this.playPause();
  }
  stop(): void {
    this.playPause();
  }

  getCurrentPosition() {
    return this.elements.getText("current");
  }
  getCurrentPositionInSeconds(): number {
    return convertDurationToSeconds(this.getCurrentPosition());
  }

  getTrackId(): string {
    const URLelement = this.elements.get("title").querySelector("a");
    if (URLelement !== null) {
      const id = URLelement.href.replace(/\D/g, "");
      return id;
    }

    return window.location.toString();
  }

  getCurrentTime(): string {
    return this.elements.getText("current");
  }
  getDuration(): string {
    return this.elements.getText("duration");
  }

  getAlbumName(): string {
    return this.elements.getAlbumName();
  }
  getTitle(): string {
    return this.elements.getText("title");
  }
  getArtists(): string[] {
    return this.elements.getArtistsArray();
  }

  getArtistsString(): string {
    return this.elements.getArtistsString(this.getArtists());
  }
  getPlayingFrom(): string {
    return this.elements.getText("playing_from");
  }

  isFavorite(): boolean {
    return this.elements.isFavorite();
  }
  getSongIcon(): string {
    return this.elements.getSongIcon();
  }
}
