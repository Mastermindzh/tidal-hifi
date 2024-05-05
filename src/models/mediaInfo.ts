import { MediaStatus } from "./mediaStatus";

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
}
