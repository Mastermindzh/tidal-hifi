import { TidalState } from "../models/tidalState";

export const mainTidalState: TidalState = {
  status: "Stopped",
  repeat: "Off",
  shuffle: false,
};

export function getLegacyMediaInfo() {
  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secondsLeft = seconds % 60;
    return `${minutes}:${secondsLeft < 10 ? "0" : ""}${secondsLeft}`;
  }

  return {
    title: mainTidalState.currentTrack?.title ?? "",
    artists: mainTidalState.currentTrack?.artists.join(", ") ?? "",
    artist: mainTidalState.currentTrack?.artists.join(", ") ?? "",
    album: mainTidalState.currentTrack?.album ?? "",
    icon: mainTidalState.currentTrack?.image ?? "",
    status: mainTidalState.status.toLowerCase(),
    url: mainTidalState.currentTrack?.url ?? "",
    current: formatDuration(mainTidalState.currentTrack?.current ?? 0),
    currentInSeconds: mainTidalState.currentTrack?.current ?? 0,
    duration: formatDuration(mainTidalState.currentTrack?.duration ?? 0),
    durationInSeconds: mainTidalState.currentTrack?.duration ?? 0,
    image: "tidal-hifi-icon",
    favorite: false,
    player: {
      status: mainTidalState.status.toLowerCase(),
      shuffle: mainTidalState.shuffle,
      repeat: mainTidalState.repeat,
    },
  };
}
