import { TidalController } from "../TidalController";
import { ReduxControllerOptions } from "./ReduxControllerOptions";
import { MediaInfo } from "../../models/mediaInfo";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import { RepeatState } from "../../models/repeatState";
import { MediaStatus } from "../../models/mediaStatus";
import { Logger } from "../../features/logger";
import { getCoverURL } from "../../features/tidal/url";
import { ReduxStoreType } from "./ReduxStoreType";
import { ReduxStoreActions as Actions } from "./ReduxStoreActions";

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
  private reduxStore: any = null;

  isStoreAvailable(): boolean {
    if (this.reduxStore) {
      return this.reduxStore;
    }

    Logger.log("Looking for Redux store in DOM...");
    this.reduxStore = scanAllElementsForStore();
    if (this.reduxStore) {
      Logger.log(`Found the Redux store!`);
    }
    return this.reduxStore;
  }

  private dispatchAction(action: string, payload?: any): void {
    if (this.isStoreAvailable()) {
      this.reduxStore.dispatch({ type: action, payload: payload });
    }
  }

  private useSelector(selector: (state: ReduxStoreType) => any): any {
    if (this.isStoreAvailable()) {
      return selector(this.reduxStore.getState());
    }
    return null;
  }

  bootstrap(options: ReduxControllerOptions) {
    const constrainedInterval = constrainPollingInterval(options.refreshInterval);
    setInterval(async () => {
      const updatedInfo: MediaInfo = {
        title: this.getTitle(),
        album: this.getAlbumName(),
        artists: this.getArtistsString(),
        artistsArray: this.getArtists(),
        current: "", // TODO: After merging https://github.com/Mastermindzh/tidal-hifi/pull/809
        currentInSeconds: 0, // TODO
        duration: "", // TODO
        durationInSeconds: 0, // TODO
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

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void {
    this.updateSubscriber = callback;
  }

  getTrackUrl(): string {
    return this.useSelector(
      (state) => state.entities.tracks.entities[this.getTrackId()].attributes.externalLinks[0].href,
    );
  }

  getAlbumName(): string {
    return this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()].item.album.title,
    );
  }

  getArtists(): string[] {
    const artists = this.useSelector(
      (state) => state.content.mediaItems[this.getTrackId()].item.artists,
    );
    return artists.map((artist: any) => artist.name);
  }

  getArtistsString(): string {
    const artists = this.getArtists();
    if (artists.length > 0) {
      return artists.join(", ");
    }
    return "unknown artist(s)";
  }

  getCurrentPosition(): string {
    // TODO: After merging https://github.com/Mastermindzh/tidal-hifi/pull/809
    return "";
  }

  getCurrentPositionInSeconds(): number {
    // TODO: After merging https://github.com/Mastermindzh/tidal-hifi/pull/809
    return 0;
  }

  getCurrentRepeatState(): RepeatState {
    return RepeatState.off;
  }

  getCurrentShuffleState(): boolean {
    return this.useSelector((state) => state.playQueue.shuffleModeEnabled);
  }

  getCurrentTime(): string {
    return "";
  }

  getCurrentlyPlayingStatus(): MediaStatus {
    const status = this.useSelector((state) => state.playbackControls.playbackState);
    if (status === "PLAYING") {
      return MediaStatus.playing;
    }
    return MediaStatus.paused;
  }

  getDuration(): string {
    // TODO: After merging https://github.com/Mastermindzh/tidal-hifi/pull/809
    return "";
  }

  getPlayingFrom(): string {
    return this.useSelector((state) => state.playQueue.sourceName);
  }

  getSongIcon(): string {
    return getCoverURL(
      this.useSelector((state) => state.content.mediaItems[this.getTrackId()].item.album.cover),
      80,
    );
  }

  getSongImage(): string {
    return getCoverURL(
      this.useSelector((state) => state.content.mediaItems[this.getTrackId()].item.album.cover),
    );
  }

  getTitle(): string {
    return this.useSelector((state) => state.content.mediaItems[this.getTrackId()].item.title);
  }

  getTrackId(): string {
    return this.useSelector((state) => state.playbackControls.mediaProduct.productId);
  }

  isFavorite(): boolean {
    return this.useSelector((state) =>
      state.favorites.tracks.includes(parseInt(this.getTrackId())),
    );
  }

  playPause(): void {
    if (this.getCurrentlyPlayingStatus() === MediaStatus.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play(): void {
    this.dispatchAction(Actions.play);
  }

  pause(): void {
    this.dispatchAction(Actions.pause);
  }

  stop(): void {
    this.pause();
  }

  toggleFavorite(): void {
    this.dispatchAction(Actions.toggleFavorite, {
      from: "heart",
      items: [{ itemId: this.getTrackId(), itemType: "track" }],
    });
  }

  back(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }

  forward(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }

  repeat(): void {
    this.dispatchAction(Actions.toggleRepeat);
  }

  next(): void {
    this.dispatchAction(Actions.next);
  }

  previous(): void {
    this.dispatchAction(Actions.previous);
  }

  toggleShuffle(): void {
    this.dispatchAction(Actions.toggleShuffle);
  }
}
