/**
 * Get the DOM update frequency, ensuring it returns a valid number
 * @param updateFrequency - The update frequency value from settings
 * @param defaultValue - The default value to use if the provided value is invalid (defaults to 500)
 * @returns A valid update frequency in milliseconds
 */
export function getDomUpdateFrequency(updateFrequency: number, defaultValue: number = 500): number {
  if (!isNaN(updateFrequency) && updateFrequency > 0) {
    return updateFrequency;
  } else {
    return defaultValue;
  }
}
