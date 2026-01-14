/**
 * Convert seconds to clock format (MM:SS)
 * @param seconds number of seconds
 * @returns string in M:SS format
 */
export const convertSecondsToClockFormat = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
