import { Logger } from "../../features/logger";
import { MediaInfo } from "../../models/mediaInfo";
import { MediaStatus } from "../../models/mediaStatus";
import { RepeatState } from "../../models/repeatState";
import { DomTidalController } from "../DomController/DomTidalController";
import { TidalController } from "../TidalController";

export class TidalApiController implements TidalController {
  public domMediaController: TidalController;

  constructor() {
    this.domMediaController = new DomTidalController();
    Logger.log("[TidalApiController] - Initialized domController as a backup controller");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void {
    globalThis.alert("method not implemented");
    throw new Error("Method not implemented.");
  }
  bootstrap(): void {
    globalThis.alert("Method not implemented: ");
    throw new Error("Method not implemented.");
  }

  getDuration(): number {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getVolume(): number {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  setVolume(volume: number) {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getAlbumName(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getTitle(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getArtists(): string[] {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getArtistsString(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getPlayingFrom(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  isFavorite(): boolean {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getSongIcon(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getSongImage(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getCurrentTime(): number {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  setCurrentTime(value: number) {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getTrackId(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  play(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  pause(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  stop(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getCurrentShuffleState(): boolean {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getCurrentRepeatState(): RepeatState {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getCurrentlyPlayingStatus(): MediaStatus {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
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
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  next(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  previous(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  toggleShuffle(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  toggleFavorite(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  playPause(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
}
