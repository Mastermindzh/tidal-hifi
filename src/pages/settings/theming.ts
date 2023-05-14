import fs from "fs";

const cssFilter = (file: string) => file.endsWith(".css");
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
 * @returns
 */
export const getOptions = (array: string[]) => {
  return array.map((name) => {
    return new Option(name.replace(".css", ""), name);
  });
};

/**
 * Read .css files from a directory and return them in a sorted array.
 * @param directory to read from. Will be created if it doesn't exist
 * @returns
 */
export const getThemeListFromDirectory = (directory: string) => {
  try {
    makeUserThemesDirectory(directory);
    return fs.readdirSync(directory).filter(cssFilter).sort(sort);
  } catch (err) {
    console.error(err);
  }
};

/**
 * Create the directory to store user themes in
 * @param directory directory to create
 */
export const makeUserThemesDirectory = (directory: string) => {
  try {
    fs.mkdir(directory, { recursive: true }, (err) => {
      if (err) throw err;
    });
  } catch (err) {
    console.error(err);
  }
};
