import { MediaInfo } from "../models/mediaInfo";
import { statuses } from "./../constants/statuses";

export const mediaInfo = {
  title: "",
  artists: "",
  album: "",
  icon: "",
  status: statuses.paused,
  url: "",
  current: "",
  duration: "",
  image: "tidal-hifi-icon",
};

export const updateMediaInfo = (arg: MediaInfo) => {
  mediaInfo.title = propOrDefault(arg.title);
  mediaInfo.artists = propOrDefault(arg.artists);
  mediaInfo.album = propOrDefault(arg.album);
  mediaInfo.icon = propOrDefault(arg.icon);
  mediaInfo.url = propOrDefault(arg.url);
  mediaInfo.status = propOrDefault(arg.status);
  mediaInfo.current = propOrDefault(arg.current);
  mediaInfo.duration = propOrDefault(arg.duration);
  mediaInfo.image = propOrDefault(arg.image);
};

/**
 * Return the property or a default value
 * @param {*} prop property to check
 * @param {*} defaultValue defaults to ""
 */
function propOrDefault(prop: string, defaultValue = "") {
  return prop ? prop : defaultValue;
}
