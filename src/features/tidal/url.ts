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
 * Build a cover url given the id.
 * If the input is already a full URL (e.g. for uploaded content), return it as-is.
 */
export const getCoverURL = (coverId: string, size: 1280 | 80 = 1280) => {
  if (!coverId) return "";
  if (coverId.startsWith("http://") || coverId.startsWith("https://")) return coverId;
  return `https://resources.tidal.com/images/${coverId.replace(/-/g, "/")}/${size}x${size}.jpg`;
};

/**
 * Append the universal link syntax (?u) to a URL.
 * Handles URLs that already contain query parameters by using &u instead.
 * @param trackLink url to append the universal link syntax to
 * @returns url with `?u` or `&u` appended, or the original value if falsy
 */
export const getUniversalLink = (trackLink: string) => {
  if (!trackLink) return trackLink;
  return trackLink.includes("?") ? `${trackLink}&u` : `${trackLink}?u`;
};
