import fs from "node:fs";

import { Logger } from "../../features/logger";

export const cssFilter = (file: string) => file.endsWith(".css");
const sort = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());

/**
 * Create an "options header" (disabled option) based on a bit of text
 * @param text of the header
 * @returns
 */
export const getOptionsHeader = (text: string): HTMLOptionElement => {
  const opt = new Option(text, undefined, false, false);
  opt.disabled = true;
  return opt;
};

/**
 * Maps a list of filenames to a list of HTMLOptionElements
 * Will strip ".css" from the name but keeps it in the value
 * @param array array of filenames
 * @param source optional prefix to prepend to the value (e.g. "builtin" or "user")
 * @returns
 */
export const getOptions = (array: string[], source?: "builtin" | "user") => {
  return array.map((name) => {
    const value = source ? `${source}:${name}` : name;
    return new Option(name.replace(".css", ""), value);
  });
};

/**
 * Read .css files from a directory and return them in a sorted array.
 * @param directory to read from. Will be created if it doesn't exist (unless readOnly)
 * @param readOnly if true, skip directory creation (for bundled/read-only paths)
 * @returns
 */
export const getThemeListFromDirectory = (directory: string, readOnly = false): string[] => {
  try {
    if (!readOnly) {
      makeUserThemesDirectory(directory);
    }
    return fs.readdirSync(directory).filter(cssFilter).sort(sort);
  } catch (err) {
    Logger.log(`Failed to get files from ${directory}`, err);
    return [];
  }
};

/**
 * Create the directory to store user themes in
 * @param directory directory to create
 */
export const makeUserThemesDirectory = (directory: string) => {
  try {
    fs.mkdirSync(directory, { recursive: true });
  } catch (err) {
    Logger.log(`Failed to make user theme directory: ${directory}`, err);
  }
};
