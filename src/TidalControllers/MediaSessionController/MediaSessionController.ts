import { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState } from "../../models/repeatState";
import { TidalController } from "../TidalController";
import { Logger } from "../../features/logger";
import { DomTidalController } from "../DomController/DomTidalController";
import { DomControllerOptions } from "../DomController/DomControllerOptions";
import { getTrackURL } from "../../features/tidal/url";
import { convertDurationToSeconds } from "../../features/time/parse";
import { constrainPollingInterval } from "../../utility/pollingConstraints";

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
        const playbackState = navigator.mediaSession?.playbackState || "none";

        if (mediaMetadata) {
          const current = this.getCurrentTime();
          const duration = this.getDuration();
          // Convert MediaMetadata to our MediaInfo format using internal getters
          const currentMediaInfo: Partial<MediaInfo> = {
            title: this.getTitle(),
            artists: this.getArtistsString(),
            artistsArray: this.getArtists(),
            album: this.getAlbumName(),
            playingFrom: this.getPlayingFrom(),
            status: this.getCurrentlyPlayingStatus(),
            url: getTrackURL(this.getTrackId()),
            current,
            currentInSeconds: convertDurationToSeconds(current),
            duration,
            durationInSeconds: convertDurationToSeconds(duration),
            image: this.getSongImage(),
            icon: this.getSongIcon(),
            favorite: this.isFavorite(),
            player: {
              status: this.getCurrentlyPlayingStatus(),
              shuffle: this.getCurrentShuffleState(),
              repeat: this.getCurrentRepeatState(),
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
            this.mediaSession!.setActionHandler(action, null);
          } catch {
            // Ignore individual action cleanup errors
          }
        });
        this.mediaSession.metadata = null;
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    Logger.log("MediaSessionController destroyed");
  }

  getCurrentlyPlayingStatus(): MediaStatus {
    const playbackState = navigator.mediaSession?.playbackState;
    if (playbackState === "playing") {
      return MediaStatus.playing;
    } else if (playbackState === "paused") {
      return MediaStatus.paused;
    } else {
      // "none" or undefined - fallback to DOM controller
      return this.fallbackDomController.getCurrentlyPlayingStatus();
    }
  }

  // =============================================================================
  // Non-MediaSession methods - not implemented for MediaSession controller
  // These methods would require DOM manipulation or other approaches
  // =============================================================================

  playPause(): void {
    this.fallbackDomController.playPause();
  }

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

  repeat(): void {
    this.fallbackDomController.repeat();
  }

  toggleShuffle(): void {
    this.fallbackDomController.toggleShuffle();
  }

  toggleFavorite(): void {
    this.fallbackDomController.toggleFavorite();
  }

  goToHome(): void {
    this.fallbackDomController.goToHome();
  }

  openSettings(): void {
    this.fallbackDomController.openSettings();
  }

  back(): void {
    this.fallbackDomController.back();
  }

  forward(): void {
    this.fallbackDomController.forward();
  }

  getCurrentShuffleState(): boolean {
    return this.fallbackDomController.getCurrentShuffleState();
  }

  getCurrentRepeatState(): RepeatState {
    return this.fallbackDomController.getCurrentRepeatState();
  }

  getCurrentPosition(): string {
    return this.fallbackDomController.getCurrentPosition();
  }

  getCurrentPositionInSeconds(): number {
    return this.fallbackDomController.getCurrentPositionInSeconds();
  }

  getTrackId(): string {
    return this.fallbackDomController.getTrackId();
  }

  getCurrentTime(): string {
    return this.fallbackDomController.getCurrentTime();
  }

  getDuration(): string {
    return this.fallbackDomController.getDuration();
  }

  getPlayingFrom(): string {
    return this.fallbackDomController.getPlayingFrom();
  }

  isFavorite(): boolean {
    return this.fallbackDomController.isFavorite();
  }
}
