/**
 * Convert a HH:MM:SS string (or variants such as MM:SS or SS) to plain seconds
 * @param duration in HH:MM:SS format
 * @returns number of seconds in duration
 */
export const convertDurationToSeconds = (duration: string) => {
  return duration
    .split(":")
    .reverse()
    .map((val) => Number(val))
    .reduce((previous, current, index) => {
      return index === 0 ? current : previous + current * 60 ** index;
    }, 0);
};
