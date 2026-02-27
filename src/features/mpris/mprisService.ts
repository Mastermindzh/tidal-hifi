import type { BrowserWindow } from "electron";
import Player from "mpris-service";

import { globalEvents } from "../../constants/globalEvents";
import type { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { ObjectToDotNotation } from "../../scripts/objectUtilities";
import { Logger } from "../logger";
import { convertMicrosecondsToSeconds, convertSecondsToMicroseconds } from "../time/parse";
import {
  convertMprisLoopToRepeatState,
  convertRepeatStateToMprisLoop,
  MPRIS_LOOP,
  type MprisLoopType,
} from "./mprisUtils";

export class MprisService {
  private player: Player | null = null;
  private currentPosition = 0; // Track current position in seconds
  private isReconnecting = false;
  private static readonly TIDAL_RESOURCE_PREFIX = "https://resources.tidal.com/images/";

  constructor(private mainWindow: BrowserWindow) {}

  initialize(): void {
    if (process.platform !== "linux") {
      return;
    }

    this.createMprisPlayer();
  }

  /**
   * Sanitize a trackId into a valid D-Bus object path segment.
   * D-Bus object paths only allow [A-Za-z0-9_].
   * Uploaded music and videos may have UUIDs, URLs, or other non-numeric IDs.
   */
  private sanitizeTrackIdForDbus(trackId: string | undefined): string {
    if (!trackId) return "0";
    const sanitized = trackId.replace(/[^A-Za-z0-9_]/g, "_");
    return sanitized || "0";
  }

  /**
   * Ensure a value is a finite number, returning the fallback otherwise.
   * Prevents NaN/undefined/Infinity from reaching D-Bus serialization.
   */
  private safeNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  /**
   * Coerce an object's values into valid D-Bus metadata types (strings and finite numbers).
   * Non-finite numbers, undefined, and null are dropped; everything else is stringified.
   */
  private filterForDbusMetadata(obj: Record<string, unknown>): Record<string, string | number> {
    const filtered: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "number" && !Number.isFinite(value)) continue;

      filtered[key] =
        typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
          ? value
          : JSON.stringify(value);
    }
    return filtered;
  }

  /**
   * Check whether an error indicates a broken D-Bus stream that requires reconnection.
   */
  private isStreamError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.message.includes("EPIPE") || error.message.includes("broken"))
    );
  }

  private createMprisPlayer(): void {
    try {
      if (this.player) {
        this.player = null; // Clean up previous instance
      }

      this.player = Player({
        name: "tidal-hifi",
        identity: "Tidal Hi-Fi",
        supportedUriSchemes: ["file"],
        supportedMimeTypes: [
          "audio/mpeg",
          "audio/flac",
          "audio/x-flac",
          "application/ogg",
          "audio/wav",
        ],
        supportedInterfaces: ["player"],
        desktopEntry: "tidal-hifi",
      });

      this.setupEventListeners();
      this.setupPositionHandler();
      this.setupQuitHandler();
      this.setupErrorHandling();

      Logger.log("MPRIS service initialized successfully");
    } catch (exception) {
      Logger.log("MPRIS player api not working", exception);
      this.scheduleReconnect();
    }
  }

  private setupErrorHandling(): void {
    if (!this.player) return;

    // Handle D-Bus errors and EPIPE errors
    this.player.on("error", (error: Error) => {
      Logger.log("MPRIS error occurred:", error);
      if (this.isStreamError(error)) {
        Logger.log("MPRIS stream broken, attempting to reconnect...");
        this.handleStreamError();
      }
    });
  }

  private handleStreamError(): void {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.player = null; // Clear broken player

    // Schedule reconnection after a brief delay
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      try {
        Logger.log("Attempting to reconnect MPRIS service...");
        this.createMprisPlayer();
        this.isReconnecting = false;
      } catch (error) {
        Logger.log("Failed to reconnect MPRIS service:", error);
        this.isReconnecting = false;
        // Try again after a longer delay
        setTimeout(() => this.scheduleReconnect(), 5000);
      }
    }, 1000);
  }

  /**
   * Check if the MPRIS service is currently healthy and available
   */
  isHealthy(): boolean {
    return !!(this.player && !this.isReconnecting);
  }

  /**
   * Force a reconnection of the MPRIS service
   */
  forceReconnect(): void {
    if (!this.isReconnecting) {
      Logger.log("Force reconnecting MPRIS service...");
      this.handleStreamError();
    }
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    const events = [
      "next",
      "previous",
      "pause",
      "playpause",
      "stop",
      "play",
      "loopStatus",
      "shuffle",
      "volume",
      "seek",
      "position",
    ];

    events.forEach((eventName) => {
      this.player?.on(eventName, (eventData) => this.handleMprisEvent(eventName, eventData));
    });
  }

  private setupPositionHandler(): void {
    if (!this.player) return;

    this.player.getPosition = () => {
      // Return current position in microseconds (MPRIS expects microseconds)
      return convertSecondsToMicroseconds(this.currentPosition);
    };
  }

  private setupQuitHandler(): void {
    if (!this.player) return;

    this.player.on("quit", () => {
      this.sendToRenderer(globalEvents.quit);
    });
  }

  updateMetadata(mediaInfo: MediaInfo): void {
    // If player is broken and not currently reconnecting, try to restart for new song
    if (!this.player && !this.isReconnecting) {
      Logger.log("MPRIS service not available for new song, attempting to restart...");
      this.createMprisPlayer();
    }

    if (!this.player || this.isReconnecting) {
      return; // Skip updates during reconnection
    }

    try {
      // Update current position if available
      this.currentPosition = this.safeNumber(mediaInfo.currentInSeconds, 0);

      // Sanitize values before sending to D-Bus
      const safeTrackId = this.sanitizeTrackIdForDbus(mediaInfo.trackId);
      const safeDuration = this.safeNumber(mediaInfo.durationInSeconds, 0);
      const safeVolume = Math.max(0, Math.min(1, this.safeNumber(mediaInfo.volume, 1.0)));
      const customMetadata = this.filterForDbusMetadata(ObjectToDotNotation(mediaInfo, "custom:"));

      // Guard against double-prefixed image URLs (Tidal bug with uploaded content)
      let artUrl = mediaInfo.image || "";
      if (artUrl.startsWith(MprisService.TIDAL_RESOURCE_PREFIX)) {
        const afterPrefix = artUrl.substring(MprisService.TIDAL_RESOURCE_PREFIX.length);
        if (afterPrefix.startsWith("http://") || afterPrefix.startsWith("https://")) {
          artUrl = afterPrefix;
        }
      }

      // Safely update metadata
      this.player.metadata = {
        ...this.player.metadata,
        ...{
          "xesam:title": mediaInfo.title || "",
          "xesam:artist": [mediaInfo.artists || ""],
          "xesam:album": mediaInfo.album || "",
          "xesam:url": mediaInfo.url || "",
          "mpris:artUrl": artUrl,
          "mpris:length": convertSecondsToMicroseconds(safeDuration),
          "mpris:trackid": `/org/mpris/MediaPlayer2/track/${safeTrackId}`,
        },
        ...customMetadata,
      };

      this.player.playbackStatus = mediaInfo.status === MediaStatus.paused ? "Paused" : "Playing";

      // Update player state from mediaInfo if available
      if (mediaInfo.player) {
        if (typeof mediaInfo.player.shuffle === "boolean") {
          this.player.shuffle = mediaInfo.player.shuffle;
        }

        if (mediaInfo.player.repeat) {
          const mprisLoopStatus = convertRepeatStateToMprisLoop(mediaInfo.player.repeat);
          this.player.loopStatus = mprisLoopStatus || "None";
        }

        this.player.volume = safeVolume;
      } else {
        // Use reasonable defaults if player state is not available
        this.player.shuffle = false;
        this.player.loopStatus = "None";
      }
    } catch (error) {
      Logger.log("Error updating MPRIS metadata:", error);
      if (this.isStreamError(error)) {
        this.handleStreamError();
      }
    }
  }

  private handleMprisEvent(eventName: string, eventData: unknown): void {
    if (!this.player || this.isReconnecting) {
      return; // Skip events during reconnection
    }

    try {
      switch (eventName) {
        case "playpause":
          this.sendToRenderer(globalEvents.playPause);
          break;
        case "next":
          this.sendToRenderer(globalEvents.next);
          break;
        case "previous":
          this.sendToRenderer(globalEvents.previous);
          break;
        case "pause":
          this.sendToRenderer(globalEvents.pause);
          break;
        case "stop":
          this.sendToRenderer(globalEvents.pause); // Stop acts like pause
          break;
        case "play":
          this.sendToRenderer(globalEvents.play);
          break;
        case "loopStatus":
          this.handleLoopStatus(eventData);
          break;
        case "shuffle":
          this.handleShuffle(eventData);
          break;
        case "volume":
          this.handleVolume(eventData);
          break;
        case "seek":
          this.handleSeek(eventData);
          break;
        case "position":
          this.handlePosition(eventData);
          break;
      }
    } catch (error) {
      Logger.log(`Error handling MPRIS event ${eventName}:`, error);
      if (this.isStreamError(error)) {
        this.handleStreamError();
      }
    }
  }

  private sendToRenderer(event: string, payload?: object): void {
    try {
      this.mainWindow.webContents.send("globalEvent", event, payload);
    } catch (error) {
      Logger.log("Error sending event to renderer:", error);
    }
  }

  private handleLoopStatus(eventData: unknown): void {
    if (typeof eventData === "string" && eventData in MPRIS_LOOP) {
      // Send the target loop state to renderer for smart state management
      this.sendToRenderer(globalEvents.setLoopState, {
        targetState: convertMprisLoopToRepeatState(eventData as MprisLoopType),
      });
    }
  }

  private handleShuffle(eventData: unknown): void {
    if (typeof eventData === "boolean") {
      this.sendToRenderer(globalEvents.toggleShuffle);
    }
  }

  private handleVolume(eventData: unknown): void {
    if (typeof eventData === "number") {
      this.sendToRenderer(globalEvents.volume, { volume: eventData });
    }
  }

  private handleSeek(eventData: unknown): void {
    if (typeof eventData === "number") {
      const relativeSeconds = convertMicrosecondsToSeconds(eventData);
      this.sendToRenderer(globalEvents.seek, {
        seconds: relativeSeconds,
        type: "relative",
      });
    }
  }

  private handlePosition(eventData: unknown): void {
    if (
      typeof eventData === "object" &&
      eventData !== null &&
      "position" in eventData &&
      typeof (eventData as any).position === "number"
    ) {
      const absoluteSeconds = convertMicrosecondsToSeconds((eventData as any).position);
      this.sendToRenderer(globalEvents.seek, {
        seconds: absoluteSeconds,
        type: "absolute",
      });
    }
  }

  destroy(): void {
    this.isReconnecting = false;

    if (this.player) {
      this.player = null;
      this.currentPosition = 0;
    }

    Logger.log("MPRIS service destroyed");
  }
}
