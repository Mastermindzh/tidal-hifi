import type { MediaStatus } from "./mediaStatus";
import type { RepeatStateType } from "./repeatState";

export interface MediaPlayerInfo {
  status: MediaStatus;
  shuffle: boolean;
  repeat: RepeatStateType;
}
