import { Logger } from "../../features/logger";
import { getTrackURL } from "../../features/tidal/url";
import { convertSecondsToClockFormat } from "../../features/time/parse";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import type { RepeatStateType } from "../../models/repeatState";
import { constrainPollingInterval } from "../../utility/pollingConstraints";
import type { DomControllerOptions } from "../DomController/DomControllerOptions";
import { DomTidalController } from "../DomController/DomTidalController";
import type { TidalController } from "../TidalController";

export interface MediaSessionControllerOptions {
  refreshInterval?: number;
  fallbackDomControllerOptions?: DomControllerOptions;
}

export class MediaSessionController implements TidalController<MediaSessionControllerOptions> {
  private updateSubscriber: (state: Partial<MediaInfo>) => void;
  private mediaSession: MediaSession | null = null;
  private refreshInterval: number = 500;
  private intervalId?: NodeJS.Timeout;
  private lastMediaInfo: Partial<MediaInfo> = {};
  private supportsMediaSession: boolean = false;
  private fallbackDomController: DomTidalController;

  constructor() {
    // Initialize fallback DOM controller (without bootstrapping)
    this.fallbackDomController = new DomTidalController();

    // Check MediaSession API availability
    this.supportsMediaSession = "mediaSession" in navigator;

    if (this.supportsMediaSession) {
      this.mediaSession = navigator.mediaSession;
      this.setupMediaSession();
      Logger.log("MediaSession API available");
    } else {
      Logger.log("MediaSession API not available - controller will have limited functionality");
    }
  }

  private setupMediaSession(): void {
    if (!this.mediaSession) return;

    // Set up core MediaSession action handlers - delegate to TidalController interface methods
    this.mediaSession.setActionHandler("play", () => this.play());
    this.mediaSession.setActionHandler("pause", () => this.pause());
    this.mediaSession.setActionHandler("previoustrack", () => this.previous());
    this.mediaSession.setActionHandler("nexttrack", () => this.next());
    this.mediaSession.setActionHandler("stop", () => this.stop());
  }

  private startPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      try {
        // Read the existing MediaSession metadata set by Tidal
        const mediaMetadata = navigator.mediaSession?.metadata;

        if (mediaMetadata) {
          const current = this.getPosition();
          const duration = this.getDuration();

          // Convert MediaMetadata to our MediaInfo format using internal getters
          const currentMediaInfo: Partial<MediaInfo> = {
            title: this.getTitle(),
            artists: this.getArtistsString(),
            artistsArray: this.getArtists(),
            album: this.getAlbumName(),
            playingFrom: this.getPlayingFrom(),
            status: this.getMediaStatus(),
            url: getTrackURL(this.getTrackId()),
            current: convertSecondsToClockFormat(current),
            currentInSeconds: current,
            duration: convertSecondsToClockFormat(duration),
            durationInSeconds: duration,
            image: this.getSongImage(),
            icon: this.getSongIcon(),
            favorite: this.isFavorite(),
            trackId: this.getTrackId(),
            volume: this.getVolume(),
            player: {
              status: this.getMediaStatus(),
              shuffle: this.getShuffleState(),
              repeat: this.getRepeatState(),
            },
          };

          // Only update if something changed
          if (JSON.stringify(currentMediaInfo) !== JSON.stringify(this.lastMediaInfo)) {
            this.lastMediaInfo = currentMediaInfo;

            if (this.updateSubscriber) {
              this.updateSubscriber(currentMediaInfo);
            }
          }
        } else {
          Logger.log("No MediaSession metadata available yet");
        }
      } catch (error) {
        Logger.log("Error in MediaSessionController polling:", error);
      }
    }, this.refreshInterval);
  }

  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  bootstrap(options: MediaSessionControllerOptions): void {
    if (options?.refreshInterval) {
      this.refreshInterval = constrainPollingInterval(options.refreshInterval);
    }

    // Configure fallback DOM controller if options provided (but don't bootstrap it)
    if (options?.fallbackDomControllerOptions) {
      // We don't call bootstrap() to avoid starting its interval polling
      Logger.log("MediaSessionController: DomTidalController fallback configured");
    }

    this.startPolling();

    Logger.log(
      `MediaSessionController bootstrapped with refresh interval: ${this.refreshInterval}ms`,
    );
  }

  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void {
    this.updateSubscriber = callback;
  }

  // =============================================================================
  // MediaSession-based implementation - reading from Tidal's MediaSession
  // =============================================================================

  getAlbumName(): string {
    return navigator.mediaSession?.metadata?.album || "";
  }

  getTitle(): string {
    return navigator.mediaSession?.metadata?.title || "";
  }

  getArtists(): string[] {
    const artist = navigator.mediaSession?.metadata?.artist;
    return artist ? [artist] : [""];
  }

  getArtistsString(): string {
    return navigator.mediaSession?.metadata?.artist || "";
  }

  getSongIcon(): string {
    const artwork = navigator.mediaSession?.metadata?.artwork;
    return artwork && artwork.length > 0 ? artwork[0].src : "";
  }

  getSongImage(): string {
    const artwork = navigator.mediaSession?.metadata?.artwork;
    if (artwork && artwork.length > 0) {
      // Find the highest resolution image by parsing sizes (e.g., "1280x1280" -> 1280)
      const highestResArtwork = artwork.reduce((highest, current) => {
        const currentSize = parseInt(current.sizes?.split("x")[0] || "0");
        const highestSize = parseInt(highest.sizes?.split("x")[0] || "0");
        return currentSize > highestSize ? current : highest;
      });
      return highestResArtwork.src;
    }
    return this.getSongIcon();
  }

  destroy(): void {
    this.stopPolling();

    // Clear MediaSession handlers
    if (this.mediaSession) {
      try {
        const actions: MediaSessionAction[] = [
          "play",
          "pause",
          "previoustrack",
          "nexttrack",
          "stop",
          "seekbackward",
          "seekforward",
          "seekto",
        ];
        actions.forEach((action) => {
          try {
            this.mediaSession?.setActionHandler(action, null);
          } catch {
            // Ignore individual action cleanup errors
          }
        });
        this.mediaSession.metadata = null;
      } catch (_error) {
        // Ignore cleanup errors
      }
    }

    Logger.log("MediaSessionController destroyed");
  }

  getMediaStatus(): MediaStatus {
    const playbackState = navigator.mediaSession?.playbackState;
    if (playbackState === "playing") {
      return MediaStatus.playing;
    } else if (playbackState === "paused") {
      return MediaStatus.paused;
    } else {
      // "none" or undefined - fallback to DOM controller
      return this.fallbackDomController.getMediaStatus();
    }
  }

  // =============================================================================
  // Non-MediaSession methods - not implemented for MediaSession controller
  // These methods would require DOM manipulation or other approaches
  // =============================================================================

  play(): void {
    this.fallbackDomController.play();
  }

  pause(): void {
    this.fallbackDomController.pause();
  }

  stop(): void {
    this.fallbackDomController.stop();
  }

  next(): void {
    this.fallbackDomController.next();
  }

  previous(): void {
    this.fallbackDomController.previous();
  }

  toggleRepeat(): void {
    this.fallbackDomController.toggleRepeat();
  }

  setRepeat(repeat: RepeatStateType) {
    this.fallbackDomController.setRepeat(repeat);
  }

  toggleShuffle() {
    this.fallbackDomController.toggleShuffle();
  }

  setShuffle(shuffle: boolean): void {
    this.fallbackDomController.setShuffle(shuffle);
  }

  toggleFavorite(): void {
    this.fallbackDomController.toggleFavorite();
  }

  back(): void {
    this.fallbackDomController.back();
  }

  forward(): void {
    this.fallbackDomController.forward();
  }

  getShuffleState(): boolean {
    return this.fallbackDomController.getShuffleState();
  }

  getRepeatState(): RepeatStateType {
    return this.fallbackDomController.getRepeatState();
  }

  getTrackId(): string {
    return this.fallbackDomController.getTrackId();
  }

  getPosition(): number {
    return this.fallbackDomController.getPosition();
  }

  setPosition(seconds: number): void {
    this.fallbackDomController.setPosition(seconds);
  }

  getDuration(): number {
    return this.fallbackDomController.getDuration();
  }

  getVolume(): number {
    return this.fallbackDomController.getVolume();
  }

  setVolume(volume: number) {
    this.fallbackDomController.setVolume(volume);
  }

  getPlayingFrom(): string {
    return this.fallbackDomController.getPlayingFrom();
  }

  isFavorite(): boolean {
    return this.fallbackDomController.isFavorite();
  }
}
