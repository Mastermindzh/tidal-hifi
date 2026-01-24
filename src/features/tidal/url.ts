import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";

export const tidalUrl =
  settingsStore.get<string, string>(settings.advanced.tidalUrl) || "https://tidal.com";

/**
 * Build a track url given the id
 */
export const getTrackURL = (trackId: string) => {
  return `${tidalUrl}/browse/track/${trackId}`;
};

/**
 * Build a cover url given the id
 */
export const getCoverURL = (coverId: string, size: 1280 | 80 = 1280) => {
  return `https://resources.tidal.com/images/${coverId.replace(/-/g, "/")}/${size}x${size}.jpg`;
};

/**
 * Retrieve the universal link given a regular track link
 * @param trackLink
 * @returns
 */
export const getUniversalLink = (trackLink: string) => {
  return `${trackLink}?u`;
};
