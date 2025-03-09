/**
 * Build a track url given the id
 */
export const getTrackURL = (trackId: string) => {
  return `https://tidal.com/browse/track/${trackId}`;
};

/**
 * Retrieve the universal link given a regular track link
 * @param trackLink
 * @returns
 */
export const getUniversalLink = (trackLink: string) => {
  return `${trackLink}?u`;
};
