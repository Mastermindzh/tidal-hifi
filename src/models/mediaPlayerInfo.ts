import {RepeatState} from "./repeatState";
import {MediaStatus} from "./mediaStatus";

export interface MediaPlayerInfo {
  status: MediaStatus;
  shuffle: boolean;
  repeat: RepeatState;
}
