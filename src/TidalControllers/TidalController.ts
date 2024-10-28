import { MediaStatus } from "../models/mediaStatus";
import { RepeatState } from "../models/repeatState";

export interface TidalController {
  goToHome(): void;
  openSettings(): void;

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

  isFavorite(): boolean;
  // add an observable to react on instead of a hookup function
  // onMediaChange(): any;

  // this can probably be removed after ^
  setPlayStatus(status: MediaStatus): void;
}
