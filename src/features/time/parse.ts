/**
 * Convert seconds to clock format
 * @param seconds number of seconds
 * @returns string in (H)H:MM:SS or (M)M:SS format
 */
export const convertSecondsToClockFormat = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  // Return padded with zeros and only add zeros when necessary
  return `${hours > 0 ? `${hours}:` : ''}${hours ? minutes.toString().padStart(2, '0') : minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const convertSecondsToMicroseconds = (seconds: number) => {
  return seconds * 1_000_000;
};

export const convertMicrosecondsToSeconds = (microseconds: number) => {
  return microseconds / 1_000_000;
};
