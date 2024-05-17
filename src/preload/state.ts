import { getTidalReduxStore, ReduxState, TidalReduxStore } from "./redux";
import { createStore } from "zustand/vanilla";
import { ipcRenderer } from "electron";
import { globalEvents } from "../constants/globalEvents";
import equal from "fast-deep-equal";
import { TidalState } from "../models/tidalState";

export const $tidalState = createStore<TidalState>(() => ({
  status: "Stopped",
}));

export let reduxStore: TidalReduxStore | undefined;

export function playPause() {
  if (!reduxStore) return;

  const state = $tidalState.getState();
  if (state.status === "Playing") {
    reduxStore.dispatch({ type: "playbackControls/PAUSE" });
  } else {
    reduxStore.dispatch({ type: "playbackControls/PLAY" });
  }
}
export function next() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playbackControls/SKIP_NEXT" });
}
export function previous() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playbackControls/SKIP_PREVIOUS" });
}
export function pause() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playbackControls/PAUSE" });
}
export function play() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playbackControls/PLAY" });
}
export function stop() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playbackControls/STOP" });
}
export function toggleRepeat() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playQueue/TOGGLE_REPEAT_MODE" });
}
export function toggleShuffle() {
  if (!reduxStore) return;
  reduxStore.dispatch({ type: "playQueue/TOGGLE_SHUFFLE" });
}
export function favoriteCurrentTrack() {
  if (!reduxStore) return;
  const track = $tidalState.getState().currentTrack;
  if (!track) return;

  reduxStore.dispatch({
    type: "content/TOGGLE_FAVORITE_ITEMS",
    payload: {
      from: "heart",
      items: [{ itemId: track.id, itemType: "track" }],
      moduleId: undefined,
    },
  });
}

export const coverArtPaths = new Map<string, Promise<string>>();

(async () => {
  while (!reduxStore) {
    try {
      reduxStore = getTidalReduxStore();
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Update currentTime
  let rawCurrentTime: ReduxState["playbackControls"] = reduxStore.getState().playbackControls;
  setInterval(() => {
    const state = $tidalState.getState();
    const track = state.currentTrack;
    if (!track) return;
    const oldCurrentTime = track.current;
    let newCurrentTime: number;

    if (state.status === "Playing") {
      newCurrentTime = Math.trunc(
        rawCurrentTime.latestCurrentTime +
          Math.abs(rawCurrentTime.latestCurrentTimeSyncTimestamp - Date.now()) / 1000
      );
    } else {
      newCurrentTime = rawCurrentTime.latestCurrentTime;
    }
    if (newCurrentTime !== oldCurrentTime) {
      $tidalState.setState({
        ...state,
        currentTrack: {
          ...track,
          current: newCurrentTime,
        },
      });
    }
  }, 1000);

  reduxStore.subscribe(async () => {
    const state = reduxStore.getState();
    rawCurrentTime = state.playbackControls;
    const currentItem = getCurrentTrack(state);
    let track: TidalState["currentTrack"];
    if (currentItem) {
      const imageId =
        currentItem.type === "track" ? currentItem.item.album.cover : currentItem.item.imageId;
      const coverUrl = `https://resources.tidal.com/images/${imageId.replace(
        /-/g,
        "/"
      )}/640x640.jpg`;
      if (!coverArtPaths.has(coverUrl)) {
        coverArtPaths.set(
          coverUrl,
          ipcRenderer.invoke(globalEvents.downloadCover, imageId, coverUrl).catch(() => "") // ignore errors if the cover can't be downloaded
        );
      }
      track = {
        id: currentItem.item.id,
        title: currentItem.item.title,
        album: currentItem.type === "track" ? currentItem.item.album.title : undefined,
        artists: currentItem.item.artists.map((artist) => artist.name),
        current: state.playbackControls.latestCurrentTime,
        duration: currentItem.item.duration,
        url: currentItem.item.url,
        image: coverUrl,
      };
    }
    const oldState = $tidalState.getState();
    const newState = {
      status: playbackStatusMap[state.playbackControls.playbackState] ?? "Stopped",
      currentTrack: track,
    };
    if (!equal(oldState, newState)) {
      $tidalState.setState(newState);
    }
  });
})();

function getCurrentTrack(state: ReduxState) {
  return state.content.mediaItems[state.playbackControls.mediaProduct?.productId];
}

const playbackStatusMap = {
  PLAYING: "Playing",
  NOT_PLAYING: "Paused",
  IDLE: "Stopped",
  STALLED: "Stopped",
} as const;
