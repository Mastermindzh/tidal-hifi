import { MediaPlayerInfo } from "./mediaPlayerInfo";
import { MediaStatus } from "./mediaStatus";
import { RepeatState } from "./repeatState";

export interface MediaInfo {
  title: string;
  artists: string;
  artistsArray?: string[];
  album: string;
  icon: string;
  status: MediaStatus;
  url: string;
  playingFrom: string;
  current: string;
  currentInSeconds?: number;
  duration: string;
  durationInSeconds?: number;
  image: string;
  favorite: boolean;
  player?: MediaPlayerInfo;
}

export const getEmptyMediaInfo = () => {
  const emptyState: MediaInfo = {
    title: "",
    artists: "",
    artistsArray: [],
    album: "",
    playingFrom: "",
    status: MediaStatus.playing,
    url: "",
    current: "",
    currentInSeconds: 100,
    duration: "",
    durationInSeconds: 100,
    image: "",
    icon: "",
    favorite: true,

    player: {
      status: MediaStatus.playing,
      shuffle: true,
      repeat: RepeatState.all,
    },
  };

  return emptyState;
};
