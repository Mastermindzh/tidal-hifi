import { MediaInfo } from "../models/mediaInfo";
import { MediaStatus } from "../models/mediaStatus";
import { RepeatState } from "../models/repeatState";

const defaultInfo: MediaInfo = {
  title: "",
  artists: "",
  album: "",
  icon: "",
  playingFrom: "",
  status: MediaStatus.paused,
  url: "",
  current: "",
  currentInSeconds: 0,
  duration: "",
  durationInSeconds: 0,
  image: "tidal-hifi-icon",
  favorite: false,

  player: {
    status: MediaStatus.paused,
    shuffle: false,
    repeat: RepeatState.off,
  },
};

export let mediaInfo: MediaInfo = { ...defaultInfo };

export const updateMediaInfo = (arg: MediaInfo) => {
  mediaInfo = { ...defaultInfo, ...arg };
  mediaInfo.url = toUniversalUrl(mediaInfo.url);
};

/**
 * Append the universal link syntax (?u) to any url
 * @param url url to append the universal link syntax to
 * @returns url with `?u` appended, or the original value of url if falsy
 */
function toUniversalUrl(url: string) {
  if (url) {
    const queryParamsSet = url.indexOf("?");
    return queryParamsSet > -1 ? `${url}&u` : `${url}?u`;
  }
  return url;
}
