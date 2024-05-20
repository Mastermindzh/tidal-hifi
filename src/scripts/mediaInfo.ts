import { MediaInfo } from "../models/mediaInfo";
import { MediaStatus } from "../models/mediaStatus";
import { RepeatState } from "../models/repeatState";

export const mediaInfo = {
  title: "",
  artists: "",
  album: "",
  icon: "",
  status: MediaStatus.paused as string,
  url: "",
  current: "",
  currentInSeconds: 0,
  duration: "",
  durationInSeconds: 0,
  image: "tidal-hifi-icon",
  favorite: false,

  player: {
    status: MediaStatus.paused as string,
    shuffle: false,
    repeat: RepeatState.off as string,
  },
};

export const updateMediaInfo = (arg: MediaInfo) => {
  mediaInfo.title = propOrDefault(arg.title);
  mediaInfo.artists = propOrDefault(arg.artists);
  mediaInfo.album = propOrDefault(arg.album);
  mediaInfo.icon = propOrDefault(arg.icon);
  mediaInfo.url = toUniversalUrl(propOrDefault(arg.url));
  mediaInfo.status = propOrDefault(arg.status);
  mediaInfo.current = propOrDefault(arg.current);
  mediaInfo.currentInSeconds = arg.currentInSeconds ?? 0;
  mediaInfo.duration = propOrDefault(arg.duration);
  mediaInfo.durationInSeconds = arg.durationInSeconds ?? 0;
  mediaInfo.image = propOrDefault(arg.image);
  mediaInfo.favorite = arg.favorite;

  mediaInfo.player = {
    status: propOrDefault(arg.player?.status),
    shuffle: arg.player?.shuffle ?? false,
    repeat: propOrDefault(arg.player?.repeat),
  };
};

/**
 * Return the property or a default value
 * @param {*} prop property to check
 * @param {*} defaultValue defaults to ""
 */
function propOrDefault(prop: string, defaultValue = "") {
  return prop || defaultValue;
}

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
