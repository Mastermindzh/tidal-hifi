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

  constructor(private mainWindow: BrowserWindow) {}

  initialize(): void {
    if (process.platform !== "linux") {
      return;
    }

    try {
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

      Logger.log("MPRIS service initialized successfully");
    } catch (exception) {
      Logger.log("MPRIS player api not working", exception);
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
      this.mainWindow.webContents.send("globalEvent", globalEvents.quit);
    });
  }

  updateMetadata(mediaInfo: MediaInfo): void {
    if (!this.player) return;

    // Update current position if available
    if (mediaInfo.currentInSeconds > 0) {
      this.currentPosition = mediaInfo.currentInSeconds;
    }
    this.player.metadata = {
      ...this.player.metadata,
      ...{
        "xesam:title": mediaInfo.title || "",
        "xesam:artist": [mediaInfo.artists || ""],
        "xesam:album": mediaInfo.album || "",
        "xesam:url": mediaInfo.url || "",
        "mpris:artUrl": mediaInfo.image || "",
        "mpris:length": convertSecondsToMicroseconds(mediaInfo.durationInSeconds),
        "mpris:trackid": `/org/mpris/MediaPlayer2/track/${mediaInfo.trackId}`,
      },
      ...ObjectToDotNotation(mediaInfo, "custom:"),
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

      this.player.volume = Math.max(0, Math.min(1, mediaInfo.volume || 1.0));
    } else {
      // Use reasonable defaults if player state is not available
      this.player.shuffle = false;
      this.player.loopStatus = "None";
    }
  }

  private async handleMprisEvent(eventName: string, eventData: unknown): Promise<void> {
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
  }

  private sendToRenderer(event: string, payload?: object): void {
    this.mainWindow.webContents.send("globalEvent", event, payload);
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
    if (this.player) {
      try {
        // Reset player to null (the library doesn't provide explicit cleanup methods)
        this.player = null;
        this.currentPosition = 0;
        Logger.log("MPRIS player destroyed successfully");
      } catch (error) {
        Logger.log("Error destroying MPRIS player", error);
      }
    }
    Logger.log("MPRIS service destroyed");
  }
}
