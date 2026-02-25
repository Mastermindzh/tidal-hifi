import type { App } from "electron";

import { flags } from "../../constants/flags";
import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";

/**
 * Set default Electron flags
 */
export function setDefaultFlags(app: App) {
  setFlag(app, "disable-seccomp-filter-sandbox");
  setFlag(app, "enable-blink-features", "MiddleClickAutoscroll");
}

/**
 * Set Tidal's managed flags from the user settings
 * @param app
 */
export function setManagedFlagsFromSettings(app: App) {
  Logger.log("Processing flags from settings...");
  const flagsFromSettings = settingsStore.get(settings.flags.root);
  if (flagsFromSettings) {
    for (const [key, value] of Object.entries(flagsFromSettings)) {
      Logger.log(`Checking flag ${key}: ${value}`);
      if (value) {
        if (flags[key]) {
          flags[key].forEach((flag) => {
            setFlag(app, flag.flag, flag.value);
          });
        } else {
          Logger.log(`No flag definition found for ${key}`);
        }
      }
    }
  } else {
    Logger.log("No flags found in settings");
  }
}

/**
 * Set a single flag for Electron
 * @param app app to set it on
 * @param flag flag name
 * @param value value to be set for the flag
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setFlag(app: App, flag: string, value?: any) {
  Logger.log(`enabling command line option ${flag} with value ${value}`);
  app.commandLine.appendSwitch(flag, value);
}
