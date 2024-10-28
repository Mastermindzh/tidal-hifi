import { MediaStatus } from "../models/mediaStatus";
import { RepeatState } from "../models/repeatState";
import { DomTidalController } from "./DomTidalController";
import { TidalController } from "./TidalController";

export class MediaSessionTidalController implements TidalController {
  public domMediaController: TidalController;

  constructor() {
    this.domMediaController = new DomTidalController();
  }
  // example of using the original domMediaController as a fallback
  goToHome(): void {
    this.domMediaController.goToHome();
  }

  setPlayStatus(status: MediaStatus): void {
    globalThis.alert("Method not implemented: " + status);
    throw new Error("Method not implemented.");
  }
  getDuration(): string {
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
  getCurrentTime(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getCurrentPosition(): string {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
  getCurrentPositionInSeconds(): number {
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
  openSettings(): void {
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
  hookup(): void {
    globalThis.alert("Method not implemented");
    throw new Error("Method not implemented.");
  }
}
