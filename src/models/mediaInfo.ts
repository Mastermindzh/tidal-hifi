import { MediaStatus } from "./mediaStatus";
import { MediaPlayerInfo } from "./mediaPlayerInfo";

export interface MediaInfo {
  title: string;
  artists: string;
  album: string;
  icon: string;
  status: MediaStatus;
  url: string;
  current: string;
  currentInSeconds?: number;
  duration: string;
  durationInSeconds?: number;
  image: string;
  favorite: boolean;
  player?: MediaPlayerInfo;
}
