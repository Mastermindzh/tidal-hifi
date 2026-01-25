import { getEmptyMediaInfo, type MediaInfo } from "../models/mediaInfo";

const defaultInfo: MediaInfo = getEmptyMediaInfo();

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
