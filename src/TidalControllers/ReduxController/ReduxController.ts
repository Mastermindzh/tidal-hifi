import { Logger } from "../../features/logger";
import { getCoverURL } from "../../features/tidal/url";
import { convertSecondsToClockFormat } from "../../features/time/parse";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState } from "../../models/repeatState";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { getElement } from "../DomController/domHelpers";
import type { TidalController } from "../TidalController";
import type { ReduxControllerOptions } from "./ReduxControllerOptions";
import { ReduxStoreActions as Actions } from "./ReduxStoreActions";
import type { ReduxStoreType } from "./ReduxStoreType";

function scanAllElementsForStore() {
  const elements = globalThis.document.body.querySelectorAll("*");

  for (const element of elements) {
    const fiberKey = Object.keys(element).find((k) => k.startsWith("__reactFiber"));
    if (!fiberKey) continue;

    let fiber = (element as any)[fiberKey];
    while (fiber) {
      const store = fiber.memoizedProps?.store;
      if (store?.dispatch) return store;
      fiber = fiber.return;
    }
  }

  return null;
}

export class ReduxController implements TidalController<ReduxControllerOptions> {
  private updateSubscriber: (state: Partial<MediaInfo>) => void;
  private reduxStore: {
    dispatch: (action: { type: string; payload?: object | number }) => void;
    getState: () => ReduxStoreType;
  } = null;

  /**
   * Get a player element
   */
  getPlayer() {
    const player = getElement("player") as HTMLVideoElement;
    return player || null;
  }

  isStoreAvailable(): boolean {
    if (this.reduxStore) {
      return true;
    }

    Logger.log("Looking for Redux store in DOM...");
    this.reduxStore = scanAllElementsForStore();
    if (this.reduxStore) {
      Logger.log(`Found the Redux store!`);
      return true;
    }
    return false;
  }

  private dispatchAction(action: string, payload?: object | number): void {
    if (this.isStoreAvailable()) {
      this.reduxStore.dispatch({ type: action, payload: payload });
    }
  }

  private useSelector<T>(selector: (state: ReduxStoreType) => T): T {
    if (this.isStoreAvailable()) {
      return selector(this.reduxStore.getState());
    }
    return null;
  }

  bootstrap(options: ReduxControllerOptions) {
    const constrainedInterval = constrainPollingInterval(options.refreshInterval);
    setInterval(async () => {
      const current = this.getCurrentTime();
      const duration = this.getDuration();

      const updatedInfo: MediaInfo = {
        trackId: this.getTrackId(),
        title: this.getTitle(),
        album: this.getAlbumName(),
        artists: this.getArtistsString(),
        artistsArray: this.getArtists(),
        current: convertSecondsToClockFormat(current),
        currentInSeconds: current,
        duration: convertSecondsToClockFormat(duration),
        durationInSeconds: duration,
        favorite: this.isFavorite(),
        icon: this.getSongIcon(),
        image: this.getSongImage(),
        player: {
          status: this.getCurrentlyPlayingStatus(),
          shuffle: this.getCurrentShuffleState(),
          repeat: this.getCurrentRepeatState(),
        },
        playingFrom: this.getPlayingFrom(),
        status: this.getCurrentlyPlayingStatus(),
        url: this.getTrackUrl(),
      };
      this.updateSubscriber(updatedInfo);
    }, constrainedInterval);
  }

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void) {
    this.updateSubscriber = callback;
  }

  getTrackUrl() {
    return this.useSelector(
      (state) => state.entities.tracks.entities[this.getTrackId()].attributes.externalLinks[0].href,
    );
  }

  getAlbumName() {
    return this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()].item.album.title,
    );
  }

  getArtists() {
    const artists = this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()].item.artists,
    );
    return artists.map((artist) => artist.name);
  }

  getArtistsString() {
    const artists = this.getArtists();
    if (artists.length > 0) {
      return artists.join(", ");
    }
    return "unknown artist(s)";
  }

  getCurrentRepeatState() {
    const repeatMode = this.useSelector((state) => state.playQueue.repeatMode);
    if (repeatMode === 1) {
      return RepeatState.all;
    }
    if (repeatMode === 2) {
      return RepeatState.single;
    }
    return RepeatState.off;
  }

  getCurrentShuffleState() {
    return this.useSelector((state) => state.playQueue.shuffleModeEnabled);
  }

  getCurrentTime() {
    // Redux does not store current time, so we get it from the player element
    const player = this.getPlayer();
    if (!player) return 0;
    const time = Math.round(player.currentTime);
    return Number.isFinite(time) ? time : 0;
  }

  setCurrentTime(value: number) {
    this.dispatchAction(Actions.seek, value);
  }

  getVolume() {
    return this.useSelector((state) => state.playbackControls.volume) / 100;
  }

  setVolume(value: number) {
    this.dispatchAction(Actions.setVolume, { volume: value * 100 });
  }

  getDuration() {
    console.log(this.useSelector((state) => state.playbackControls.playbackContext.actualDuration));
    return this.useSelector((state) => state.playbackControls.playbackContext.actualDuration);
  }

  getCurrentlyPlayingStatus() {
    const status = this.useSelector((state) => state.playbackControls.playbackState);
    if (status === "PLAYING") {
      return MediaStatus.playing;
    }
    return MediaStatus.paused;
  }

  getPlayingFrom() {
    return this.useSelector((state) => state.playQueue.sourceName);
  }

  getSongIcon() {
    return getCoverURL(
      this.useSelector((state) => state.content.mediaItems[this.getTrackId()].item.album.cover),
      80,
    );
  }

  getSongImage() {
    return getCoverURL(
      this.useSelector((state) => state.content.mediaItems[this.getTrackId()].item.album.cover),
    );
  }

  getTitle() {
    return this.useSelector((state) => state.content.mediaItems[this.getTrackId()].item.title);
  }

  getTrackId() {
    return this.useSelector((state) => state.playbackControls.mediaProduct.productId);
  }

  isFavorite() {
    return this.useSelector((state) =>
      state.favorites.tracks.includes(parseInt(this.getTrackId())),
    );
  }

  playPause() {
    if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.dispatchAction(Actions.play);
  }

  pause() {
    this.dispatchAction(Actions.pause);
  }

  stop() {
    this.pause();
  }

  toggleFavorite() {
    this.dispatchAction(Actions.toggleFavorite, {
      from: "heart",
      items: [{ itemId: this.getTrackId(), itemType: "track" }],
    });
  }

  back() {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }

  forward() {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }

  repeat() {
    this.dispatchAction(Actions.toggleRepeat);
  }

  next() {
    this.dispatchAction(Actions.next);
  }

  previous() {
    this.dispatchAction(Actions.previous);
  }

  toggleShuffle() {
    this.dispatchAction(Actions.toggleShuffle);
  }
}
