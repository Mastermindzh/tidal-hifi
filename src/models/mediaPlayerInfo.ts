import type { MediaStatus } from "./mediaStatus";
import type { RepeatState } from "./repeatState";

export interface MediaPlayerInfo {
  status: MediaStatus;
  shuffle: boolean;
  repeat: RepeatState;
}
