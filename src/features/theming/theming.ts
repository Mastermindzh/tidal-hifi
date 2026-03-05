import fs from "node:fs";
import path from "node:path";

import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";

/**
 * Resolve the theme file path by checking (in order):
 *  1. User data directory (~/.config/tidal-hifi/themes/)
 *  2. Bundled resources directory (process.resourcesPath/themes/)
 *  3. Local project themes/ directory (dev fallback)
 */
function resolveThemePath(app: { getPath: (name: string) => string }, themeName: string): string {
  const themesFolderName = "themes";
  const candidates = [
    path.join(app.getPath("userData"), themesFolderName, themeName),
    path.join(process.resourcesPath, themesFolderName, themeName),
    path.join(__dirname, "..", "..", "..", themesFolderName, themeName),
  ];

  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addCustomCss(app: any) {
  window.addEventListener("DOMContentLoaded", () => {
    const selectedTheme = settingsStore.get<string, string>(settings.theme);
    if (selectedTheme !== "none") {
      const themeFile = resolveThemePath(app, selectedTheme);
      Logger.log(`Loading theme "${selectedTheme}" from: ${themeFile}`);
      fs.readFile(themeFile, "utf-8", (err, data) => {
        if (err) {
          Logger.alert("An error ocurred reading the theme file.", err, alert);
          return;
        }

        const themeStyle = document.createElement("style");
        themeStyle.innerHTML = data;
        document.head.appendChild(themeStyle);
      });
    }

    // read customCSS (it will override the theme)
    const style = document.createElement("style");
    style.innerHTML = settingsStore.get<string, string[]>(settings.customCSS).join("\n");
    document.head.appendChild(style);
  });
}
