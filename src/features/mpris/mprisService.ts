import { type BrowserWindow, ipcMain } from "electron";
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
  private lastReportedPosition = 0; // Last position (seconds) we emitted a Seeked signal for
  private lastPositionSampledAt = 0; // Epoch ms when lastReportedPosition was captured
  private isReconnecting = false;
  private lastTrackMetadataKey = ""; // Used to skip redundant D-Bus metadata updates
  private static readonly TIDAL_RESOURCE_PREFIX = "https://resources.tidal.com/images/";
  // How far (seconds) the real position may drift from the extrapolated position
  // before we treat it as a seek and resync clients. The poll runs every ~500 ms,
  // so normal drift stays well under this.
  private static readonly POSITION_DRIFT_TOLERANCE_SECONDS = 2;

  constructor(private readonly mainWindow: BrowserWindow) {}

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
    const sanitized = trackId.replace(/\W/g, "_");
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

      const appId = process.env.FLATPAK_ID || "tidal-hifi";

      this.player = Player({
        name: appId,
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
        desktopEntry: appId,
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
    this.player.on("error", ((error: Error) => {
      Logger.log("MPRIS error occurred:", error);
      if (this.isStreamError(error)) {
        Logger.log("MPRIS stream broken, attempting to reconnect...");
        this.handleStreamError();
      }
    }) as (...args: object[]) => void);
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

  /**
   * Emit the MPRIS `Seeked` signal when the real position diverges from what a
   * client would extrapolate on its own, so client progress counters stay in
   * sync. During steady playback the position advances predictably and no signal
   * is emitted; a track change or a scrub/seek produces a jump that we report.
   */
  private syncPosition(positionSeconds: number, isPlaying: boolean, trackChanged: boolean): void {
    if (!this.player) return;

    const now = Date.now();
    const firstSample = this.lastPositionSampledAt === 0;
    const elapsedSeconds = firstSample ? 0 : (now - this.lastPositionSampledAt) / 1000;
    const expected = isPlaying
      ? this.lastReportedPosition + elapsedSeconds
      : this.lastReportedPosition;
    const drifted =
      Math.abs(positionSeconds - expected) > MprisService.POSITION_DRIFT_TOLERANCE_SECONDS;

    if (firstSample || trackChanged || drifted) {
      try {
        this.player.seeked(convertSecondsToMicroseconds(positionSeconds));
      } catch (error) {
        Logger.log("Error emitting MPRIS Seeked signal:", error);
      }
    }

    this.lastReportedPosition = positionSeconds;
    this.lastPositionSampledAt = now;
  }

  private setupQuitHandler(): void {
    if (!this.player) return;

    this.player.on("quit", () => {
      ipcMain.emit(globalEvents.quit);
    });
  }

  /**
   * Strip a doubled Tidal resource prefix from an image URL (a Tidal bug with
   * uploaded content), returning the corrected art URL.
   */
  private resolveArtUrl(image = ""): string {
    if (image.startsWith(MprisService.TIDAL_RESOURCE_PREFIX)) {
      const afterPrefix = image.substring(MprisService.TIDAL_RESOURCE_PREFIX.length);
      if (afterPrefix.startsWith("http://") || afterPrefix.startsWith("https://")) {
        return afterPrefix;
      }
    }
    return image;
  }

  /**
   * Assign the full D-Bus metadata object. This is what triggers the
   * PropertiesChanged signal, so it must only be called when the track actually
   * changes (not on every polling tick).
   */
  private applyTrackMetadata(
    mediaInfo: MediaInfo,
    safeTrackId: string,
    artUrl: string,
    safeDuration: number,
  ): void {
    if (!this.player) return;

    // Compute custom metadata only when the track has actually changed to
    // avoid creating a new flattened object on every poll cycle.
    const customMetadata = this.filterForDbusMetadata(ObjectToDotNotation(mediaInfo, "custom:"));

    this.player.metadata = {
      "xesam:title": mediaInfo.title || "",
      // xesam:artist is an array of individual artists; prefer the parsed list so GNOME
      // shows every credited artist, falling back to the joined string when it's absent.
      "xesam:artist":
        mediaInfo.artistsArray && mediaInfo.artistsArray.length > 0
          ? mediaInfo.artistsArray
          : [mediaInfo.artists || ""],
      "xesam:album": mediaInfo.album || "",
      "xesam:url": mediaInfo.url || "",
      "mpris:artUrl": artUrl,
      "mpris:length": convertSecondsToMicroseconds(safeDuration),
      "mpris:trackid": `/org/mpris/MediaPlayer2/track/${safeTrackId}`,
      ...customMetadata,
    };
  }

  /**
   * Apply shuffle / repeat / volume from mediaInfo, falling back to sensible
   * defaults when no player state is available.
   */
  private applyPlayerState(playerState: MediaInfo["player"], safeVolume: number): void {
    if (!this.player) return;

    if (playerState) {
      if (typeof playerState.shuffle === "boolean") {
        this.player.shuffle = playerState.shuffle;
      }

      if (playerState.repeat) {
        const mprisLoopStatus = convertRepeatStateToMprisLoop(playerState.repeat);
        this.player.loopStatus = mprisLoopStatus || "None";
      }

      this.player.volume = safeVolume;
    } else {
      this.player.shuffle = false;
      this.player.loopStatus = "None";
    }
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
      // Always update the in-memory position — this is served via getPosition() without
      // touching D-Bus, so it carries no allocation cost.
      this.currentPosition = this.safeNumber(mediaInfo.currentInSeconds, 0);

      // Sanitize values before sending to D-Bus
      const safeTrackId = this.sanitizeTrackIdForDbus(mediaInfo.trackId);
      const safeDuration = this.safeNumber(mediaInfo.durationInSeconds, 0);
      const safeVolume = Math.max(0, Math.min(1, this.safeNumber(mediaInfo.volume, 1.0)));
      const artUrl = this.resolveArtUrl(mediaInfo.image);

      // Build a snapshot key from the static track fields.  We intentionally
      // exclude time-varying fields (currentInSeconds, current, status, …) so
      // that a D-Bus PropertiesChanged signal is only emitted when the actual
      // track changes, not on every 500 ms polling tick.  Emitting that signal
      // every 500 ms caused continuous allocation of D-Bus message objects in
      // the dbus-next write buffer.
      const trackMetadataKey = JSON.stringify([
        mediaInfo.title,
        mediaInfo.artists,
        mediaInfo.album,
        safeTrackId,
        artUrl,
        safeDuration,
      ]);

      const trackChanged = trackMetadataKey !== this.lastTrackMetadataKey;
      if (trackChanged) {
        this.lastTrackMetadataKey = trackMetadataKey;
        this.applyTrackMetadata(mediaInfo, safeTrackId, artUrl, safeDuration);
      }

      const isPlaying = mediaInfo.status !== MediaStatus.paused;
      this.player.playbackStatus = isPlaying ? "Playing" : "Paused";

      // MPRIS Position is not part of PropertiesChanged, so clients extrapolate it
      // locally and only resync when they receive the Seeked signal. Emit it on
      // track changes and on discontinuous jumps (seeks) so the client counter
      // stays accurate; steady playback still relies on client-side extrapolation.
      this.syncPosition(this.currentPosition, isPlaying, trackChanged);

      this.applyPlayerState(mediaInfo.player, safeVolume);
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
    this.lastTrackMetadataKey = "";

    if (this.player) {
      try {
        this.player.removeAllListeners();
      } catch (error) {
        Logger.log("Error cleaning up MPRIS player listeners:", error);
      }
      this.player = null;
      this.currentPosition = 0;
      this.lastReportedPosition = 0;
      this.lastPositionSampledAt = 0;
    }

    Logger.log("MPRIS service destroyed");
  }
}
