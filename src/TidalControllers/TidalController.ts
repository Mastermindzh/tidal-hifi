import type { MediaInfo } from "../models/mediaInfo";
import type { MediaStatus } from "../models/mediaStatus";
import type { RepeatStateType } from "../models/repeatState";

export interface TidalController<TBootstrapOptions = object> {
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
   * Start playback of the current media
   */
  play(): void;

  /**
   * Pause playback of the current media
   */
  pause(): void;

  /**
   * Stop playback of the current media
   */
  stop(): void;

  /**
   * Skip to the next media item in the queue
   */
  next(): void;

  /**
   * Return to the previous media item in the queue
   */
  previous(): void;

  /**
   * Set the playback position of the current media
   * @param seconds - position in seconds
   */
  setPosition(seconds: number): void;

  /**
   * Set the volume level
   * @param volume - volume level
   */
  setVolume(volume: number): void;

  /**
   * Toggle favorite status of the current track
   */
  toggleFavorite(): void;

  /**
   * Toggle shuffle mode true or false
   */
  toggleShuffle(): void;

  /**
   * Set shuffle mode
   * @param shuffle - true to enable shuffle, false to disable
   */
  setShuffle(shuffle: boolean): void;

  /**
   * Toggle the repeat mode between off, single, all
   */
  toggleRepeat(): void;

  /**
   * Set the repeat mode
   * @param repeat - desired repeat state
   */
  setRepeat(repeat: RepeatStateType): void;

  /**
   * Move forward in the UI navigation
   */
  forward(): void;

  /**
   * Move back in the UI navigation
   */
  back(): void;

  /**
   * Get the current media status of Tidal
   * @returns MediaStatus - playing, paused, etc.
   */
  getMediaStatus(): MediaStatus;

  /**
   * Get the current playback position in seconds
   * @returns number - current position in seconds
   */
  getPosition(): number;

  /**
   * Get the total duration of the current media in seconds
   * @returns number - total duration in seconds
   */
  getDuration(): number;

  /**
   * Get the current volume level
   * @returns number - volume level
   */
  getVolume(): number;

  /**
   * Get whether the current track is marked as favorite
   * @returns boolean - true if favorite, false otherwise
   */
  isFavorite(): boolean;

  /**
   * Get the current shuffle state
   * @returns boolean - true if shuffle is enabled, false otherwise
   */
  getShuffleState(): boolean;

  /**
   * Get the current repeat state
   * @returns RepeatStateType - off, single, all
   */
  getRepeatState(): RepeatStateType;

  /**
   * Get the unique identifier of the current track
   * @returns string - track ID
   */
  getTrackId(): string;

  /**
   * Get the title of the current media
   * @returns string - media title
   */
  getTitle(): string;

  /**
   * Get the album name of the current media
   */
  getAlbumName(): string;

  /**
   * Get the artists of the current media as an array of strings
   * @returns string[] - array of artist names
   */
  getArtists(): string[];

  /**
   * Get the artists of the current media as a single string
   * @returns string - artist names concatenated
   */
  getArtistsString(): string;

  /**
   * Get the source/playlist/album the current media is playing from
   * @returns string - playing from source
   */
  getPlayingFrom(): string;

  /**
   * Get the icon URL of the current media (smaller image)
   * @returns string - icon URL
   */
  getSongIcon(): string;

  /**
   * Get the image URL of the current media (larger image)
   * @returns string - image URL
   */
  getSongImage(): string;
}
