import { getUniversalLink } from "../features/tidal/url";
import { getEmptyMediaInfo, type MediaInfo } from "../models/mediaInfo";

const defaultInfo: MediaInfo = getEmptyMediaInfo();

export let mediaInfo: MediaInfo = { ...defaultInfo };
export const updateMediaInfo = (arg: MediaInfo) => {
  mediaInfo = { ...defaultInfo, ...arg };
  if (mediaInfo.url) {
    mediaInfo.url = getUniversalLink(mediaInfo.url);
  }
};
