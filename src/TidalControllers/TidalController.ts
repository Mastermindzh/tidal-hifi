import type { MediaInfo } from "../models/mediaInfo";
import type { MediaStatus } from "../models/mediaStatus";
import type { RepeatState } from "../models/repeatState";

export interface TidalController<TBootstrapOptions = object> {
  /**
   * Play or pause the current media
   */
  playPause(): void;
  play(): void;
  pause(): void;
  stop(): void;
  toggleFavorite(): void;
  back(): void;
  forward(): void;
  repeat(): void;
  next(): void;
  previous(): void;
  toggleShuffle(): void;

  /**
   * Optional setup/startup/bootstrap for this controller
   */
  bootstrap(options: TBootstrapOptions): void;

  /**
   * Method that triggers every time the MediaInfo updates
   * @param callback function that receives the updated media info
   */
  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void;

  /**
   * Update the current status of tidal (e.g playing or paused)
   */
  getCurrentlyPlayingStatus(): MediaStatus;
  getCurrentShuffleState(): boolean;
  getCurrentRepeatState(): RepeatState;
  getCurrentPosition(): string;
  getCurrentPositionInSeconds(): number;
  getTrackId(): string;
  getCurrentTime(): string;
  getDuration(): string;
  getAlbumName(): string;
  getTitle(): string;
  getArtists(): string[];
  getArtistsString(): string;
  getPlayingFrom(): string;
  getSongIcon(): string;
  getSongImage(): string;
  isFavorite(): boolean;
}
