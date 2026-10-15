import { Logger } from "../../features/logger";
import { getCoverURL } from "../../features/tidal/url";
import { convertSecondsToClockFormat } from "../../features/time/parse";
import type { AudioQuality } from "../../models/audioQuality";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import type { PlayMediaRequest } from "../../models/playableMedia";
import { RepeatState } from "../../models/repeatState";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { getActivePlayer } from "../DomController/domHelpers";
import { playMediaViaDom } from "../DomController/playMedia";
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
  private updateSubscriber!: (state: Partial<MediaInfo>) => void;
  private pollingIntervalId?: ReturnType<typeof setInterval>;
  private reduxStore: {
    dispatch: (action: { type: string; payload?: object | number }) => void;
    getState: () => ReduxStoreType;
  } | null = null;

  /**
   * Get a player element
   */
  getPlayer() {
    return getActivePlayer();
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
    if (this.isStoreAvailable() && this.reduxStore) {
      this.reduxStore.dispatch({ type: action, payload: payload });
    }
  }

  private useSelector<T>(selector: (state: ReduxStoreType) => T, fallback: T): T {
    if (this.isStoreAvailable() && this.reduxStore) {
      try {
        const value = selector(this.reduxStore.getState());
        return value ?? fallback;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  bootstrap(options: ReduxControllerOptions) {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }
    const constrainedInterval = constrainPollingInterval(options.refreshInterval);
    this.pollingIntervalId = setInterval(async () => {
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
        volume: this.getVolume(),
        player: {
          status: this.getCurrentlyPlayingStatus(),
          shuffle: this.getCurrentShuffleState(),
          repeat: this.getCurrentRepeatState(),
        },
        playingFrom: this.getPlayingFrom(),
        status: this.getCurrentlyPlayingStatus(),
        url: this.getTrackUrl(),
        audioQuality: this.getAudioQuality(),
      };
      this.updateSubscriber(updatedInfo);
    }, constrainedInterval);
  }

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void) {
    this.updateSubscriber = callback;
  }

  getTrackUrl() {
    return this.useSelector(
      (state) =>
        state.entities.tracks.entities[this.getTrackId()]?.attributes?.externalLinks?.[0]?.href,
      "",
    );
  }

  getAlbumName() {
    return this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()]?.item?.album?.title,
      "",
    );
  }

  getArtists() {
    const artists = this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()]?.item?.artists,
      [],
    );
    return artists ? artists.map((artist) => artist.name) : [];
  }

  getArtistsString() {
    const artists = this.getArtists();
    if (artists.length > 0) {
      return artists.join(", ");
    }
    return "unknown artist(s)";
  }

  getCurrentRepeatState() {
    const repeatMode = this.useSelector((state) => state.playQueue.repeatMode, 0);
    if (repeatMode === 1) {
      return RepeatState.all;
    }
    if (repeatMode === 2) {
      return RepeatState.single;
    }
    return RepeatState.off;
  }

  getCurrentShuffleState() {
    return this.useSelector((state) => state.playQueue.shuffleModeEnabled, false);
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
    return this.useSelector((state) => state.playbackControls.volume, 100) / 100;
  }

  setVolume(value: number) {
    this.dispatchAction(Actions.setVolume, { volume: value * 100 });
  }

  getDuration() {
    const duration = this.useSelector(
      (state) => state.playbackControls.playbackContext.actualDuration,
      0,
    );
    return typeof duration === "number" && Number.isFinite(duration) ? duration : 0;
  }

  getAudioQuality(): AudioQuality | undefined {
    const ctx = this.useSelector((state) => state.playbackControls.playbackContext, undefined);
    if (!ctx) return undefined;
    const quality = typeof ctx.actualAudioQuality === "string" ? ctx.actualAudioQuality : undefined;
    const bitDepth =
      typeof ctx.bitDepth === "number" && Number.isFinite(ctx.bitDepth) ? ctx.bitDepth : undefined;
    const sampleRate =
      typeof ctx.sampleRate === "number" && Number.isFinite(ctx.sampleRate)
        ? ctx.sampleRate
        : undefined;
    const codec = typeof ctx.codec === "string" ? ctx.codec : undefined;
    if (!quality && bitDepth === undefined && sampleRate === undefined && !codec) {
      return undefined;
    }
    return { quality, bitDepth, sampleRate, codec };
  }

  getCurrentlyPlayingStatus() {
    const status = this.useSelector((state) => state.playbackControls.playbackState, "");
    if (status === "PLAYING") {
      return MediaStatus.playing;
    }
    return MediaStatus.paused;
  }

  getPlayingFrom() {
    return this.useSelector((state) => state.playQueue.sourceName, "");
  }

  getSongIcon() {
    return getCoverURL(
      this.useSelector(
        (state) => state.content.mediaItems[this.getTrackId()]?.item?.album?.cover,
        "",
      ),
      80,
    );
  }

  getSongImage() {
    return getCoverURL(
      this.useSelector(
        (state) => state.content.mediaItems[this.getTrackId()]?.item?.album?.cover,
        "",
      ),
    );
  }

  getTitle() {
    return this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()]?.item?.title,
      "",
    );
  }

  getTrackId() {
    return this.useSelector((state) => state.playbackControls.mediaProduct.productId, "");
  }

  isFavorite() {
    const trackId = this.getTrackId();
    if (!trackId) return false;
    return this.useSelector(
      (state) => state.favorites.tracks.includes(Number.parseInt(trackId)),
      false,
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

  // Phase 1 uses the DOM; dispatching Tidal's own Redux action is a possible follow-up, but PlayOver's dev wanted to work on this
  playMedia(request: PlayMediaRequest) {
    return playMediaViaDom(request);
  }

  destroy(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }
    Logger.log("ReduxController destroyed");
  }
}
