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
 * Set Tidal's managed flags from the user settings.
 *
 * Feature flags (--enable-features / --disable-features) are aggregated into
 * a single comma-separated switch each, because calling appendSwitch multiple
 * times for the same switch overwrites the previous value.
 *
 * @param app
 */
export function setManagedFlagsFromSettings(app: App) {
  Logger.log("Processing flags from settings...");
  const flagsFromSettings = settingsStore.get(settings.flags.root);

  const enableFeatures: string[] = [];
  const disableFeatures: string[] = [];

  if (flagsFromSettings) {
    for (const [key, value] of Object.entries(flagsFromSettings)) {
      Logger.log(`Checking flag ${key}: ${value}`);
      if (value) {
        if (flags[key]) {
          flags[key].forEach((flag) => {
            if (flag.flag === "enable-features" && flag.value) {
              enableFeatures.push(flag.value);
            } else if (flag.flag === "disable-features" && flag.value) {
              disableFeatures.push(flag.value);
            } else {
              setFlag(app, flag.flag, flag.value);
            }
          });
        } else {
          Logger.log(`No flag definition found for ${key}`);
        }
      }
    }
  } else {
    Logger.log("No flags found in settings");
  }

  if (enableFeatures.length > 0) {
    setFlag(app, "enable-features", enableFeatures.join(","));
  }
  if (disableFeatures.length > 0) {
    setFlag(app, "disable-features", disableFeatures.join(","));
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
