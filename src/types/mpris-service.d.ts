declare module "mpris-service" {
  export interface InitOptions {
    name: string;
    identity: string;
    supportedUriSchemes: string[];
    supportedMimeTypes: string[];
    supportedInterfaces: string[];
    desktopEntry: string;
  }
  export interface Player {
    metadata: {
      "xesam:title"?: string;
      "xesam:artist"?: string[];
      "xesam:album"?: string;
      "mpris:artUrl"?: string;
      "mpris:length"?: number | bigint;
      "mpris:trackid": string;
      // other options
      [key: string]: string | number | string[] | bigint | object;
    };
    playbackStatus: "Playing" | "Paused" | "Stopped";
    identity: string;
    fullscreen: boolean;
    supportedUriSchemes: string[];
    supportedMimeTypes: string[];
    canQuit: boolean;
    canRaise: boolean;
    canSetFullscreen: boolean;
    hasTrackList: boolean;
    desktopEntry: string;
    loopStatus: string;
    shuffle: boolean;
    volume: number;
    canControl: boolean;
    canPause: boolean;
    canPlay: boolean;
    canSeek: boolean;
    canGoNext: boolean;
    canGoPrevious: boolean;
    rate: number;
    minimumRate: number;
    maximumRate: number;
    playlists: string[];
    activePlaylist: string;

    getPosition(): number | bigint;
    seeked(): void;
    getTrackIndex(trackId: number): number;
    getTrack(trackId: number): string;
    addTrack(track: object): void;
    removeTrack(trackId: number): number;
    getPlaylistIndex(playlistId: number): number;
    setPlaylists(playlists: object): void;
    setActivePlaylist(playlistId: number): void;
    objectPath(path: string): string;

    on(event: string | symbol, listener: (...args: object[]) => void): this;
    _bus: import("dbus-next").MessageBus;
  }

  export default function Player(opts: { name: string; supportedInterfaces?: string[] }): Player;
  export default function Player(opts: InitOptions): Player;
}
