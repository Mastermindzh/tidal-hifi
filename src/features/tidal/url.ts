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
 * Retrieve the universal link given a regular track link
 * @param trackLink
 * @returns
 */
export const getUniversalLink = (trackLink: string) => {
  return `${trackLink}?u`;
};
