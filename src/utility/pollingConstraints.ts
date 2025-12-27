/**
 * Constrains a polling interval value between specified minimum and maximum bounds.
 * @param value The value to constrain (in milliseconds)
 * @param min The minimum allowed value (default: 100ms)
 * @param max The maximum allowed value (default: 60000ms)
 * @returns The constrained value
 */
export function constrainPollingInterval(
  value: number,
  min: number = 100,
  max: number = 60000,
): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
