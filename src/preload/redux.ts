export function getTidalReduxStore() {
  // Find the react container
  let reactContainer: Record<string, unknown> | null = null;
  for (const child of document.body?.children ?? []) {
    const container = Object.entries(child).find(([key]) => key.startsWith("__reactContainer$"));
    // console.log(container);
    if (!container) continue;
    reactContainer = container[1];
    break;
  }
  if (!reactContainer) {
    throw new Error("Could not find React root");
  }
  // Traverse the react tree until we find the redux store
  const seen = new Set();
  const queue = [reactContainer];
  let store;

  const properties = ["children", "child", "pendingProps", "memoizedProps", "props"];
  while (!store && queue.length) {
    const node = queue.shift();
    if (!node) break;
    if (
      "store" in node &&
      typeof node.store === "object" &&
      node.store !== null &&
      "getState" in node.store &&
      typeof node.store.getState === "function"
    ) {
      store = node.store;
      break;
    }
    for (const property of properties) {
      const value = node[property];
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) continue;
        seen.add(value);
        queue.push(value as Record<string, unknown>);
      }
    }
  }
  if (!store) throw new Error("Could not find Redux store");
  return store as TidalReduxStore;
}

export type TidalReduxStore = {
  getState: () => ReduxState;
  dispatch: (action: Action) => void;
  subscribe: (listener: () => void) => () => void;
};

export type ReduxState = {
  [key: string]: unknown;
  content: {
    mediaItems: Record<string, MediaItem>;
  };
  favorites: {
    albums: number[];
    artists: number[];
    mixes: number[];
    playlists: number[];
    tracks: number[];
    users: number[];
    videos: number[];
  };
  playbackControls: {
    desiredPlaybackState: "NOT_PLAYING" | "PLAYING" | "IDLE" | string;
    latestCurrentTime: number;
    latestCurrentTimeSyncTimestamp: number;
    muted: boolean;
    playbackState: "NOT_PLAYING" | "PLAYING" | "IDLE" | "STALLED";
    startAt: number;
    volume: number;
    volumeUnmute: number;
    mediaProduct: {
      productId: string;
      productType: "track" | string;
      sourceId: string;
      sourceType: "PLAYLIST" | string;
    };
  };
  playQueue: {
    shuffleModeEnabled: boolean;
    repeatMode: RepeatMode;
  };
};

const enum RepeatMode {
  REPEAT_OFF = 0,
  REPEAT_ALL = 1,
  REPEAT_SINGLE = 2,
}
type MediaItem =
  | {
      type: "track";
      item: {
        album: {
          id: number;
          title: string;
          cover: string;
          vibrantColor: string;
          releaseDate: string;
        };
        artist: Artist;
        artists: Array<Artist>;
        audioModes: Array<"STEREO" | string>;
        audioQuality: "LOSSLESS" | string;
        bpm: number | null;
        copyright: string;
        dateAdded: string;
        description: string | null;
        duration: number;
        explicit: boolean;
        id: number;
        isrc: string;
        itemUuid: string;
        peak: number;
        popularity: number;
        title: string;
        trackNumber: number;
        url: string;
      };
    }
  | {
      type: "video";
      item: {
        artists: Array<Artist>;
        contentType: "video";
        duration: number;
        id: number;
        imageId: string;
        explicit: boolean;
        title: string;
        type: string;
        url: string;
        vibrantColor: string;
      };
    };

type Artist = {
  id: number;
  name: string;
  type: "MAIN" | string;
  picture: string;
};

type Action =
  | {
      type:
        | "playbackControls/PAUSE"
        | "playbackControls/PLAY"
        | "playbackControls/STOP"
        | "playbackControls/SKIP_PREVIOUS"
        | "playbackControls/SKIP_NEXT"
        | "playQueue/TOGGLE_SHUFFLE"
        | "playQueue/TOGGLE_REPEAT_MODE"
        | "ROUTER_GO_BACK"
        | "ROUTER_GO_FORWARD";
    }
  | {
      type: "playbackControls/SET_VOLUME";
      payload: {
        /** 0 - 100 */
        volume: number;
      };
    }
  | {
      type: "playbackControls/SET_MUTE";
      payload: {
        mute: boolean;
      };
    }
  | {
      type: "ROUTER_PUSH";
      payload: {
        pathname: string;
        options: Record<string, unknown>;
        hash: string;
      };
    }
  | {
      type: "content/TOGGLE_FAVORITE_ITEMS";
      payload: {
        from: "heart";
        items: Array<{ itemId: number; itemType: "track" }>;
        moduleId?: string;
      };
    };
