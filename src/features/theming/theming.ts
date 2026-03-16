import fs from "node:fs";
import path from "node:path";

import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";

/**
 * Parse a theme identifier into its source and filename.
 * Supported formats:
 *   - "builtin:ThemeName.css"  → look only in bundled/dev directories
 *   - "user:ThemeName.css"     → look only in the user-data directory
 *   - "ThemeName.css"          → legacy (no prefix), search all locations
 */
function parseThemeId(themeId: string): { source: "builtin" | "user" | "legacy"; name: string } {
  if (themeId.startsWith("builtin:")) return { source: "builtin", name: themeId.slice(8) };
  if (themeId.startsWith("user:")) return { source: "user", name: themeId.slice(5) };
  return { source: "legacy", name: themeId };
}

/**
 * Resolve the theme file path.
 *
 * When the theme identifier contains a source prefix the lookup is scoped:
 *   - "builtin:" → bundled resources dir, then local dev dir
 *   - "user:"    → user-data dir only
 *
 * Legacy (unprefixed) identifiers fall back to the original search order:
 *   1. User data directory (~/.config/tidal-hifi/themes/)
 *   2. Bundled resources directory (process.resourcesPath/themes/)
 *   3. Local project themes/ directory (dev fallback)
 */
function resolveThemePath(
  app: { getPath: (name: string) => string; isPackaged: boolean },
  themeId: string,
): string {
  const themesFolderName = "themes";
  const { source, name } = parseThemeId(themeId);

  const builtInCandidates = [path.join(process.resourcesPath, themesFolderName, name)];
  // In development, also check the project-root themes/ directory
  if (!app.isPackaged) {
    Logger.log("Loading development themes");
    builtInCandidates.push(path.join(process.cwd(), themesFolderName, name));
  }
  const userCandidate = path.join(app.getPath("userData"), themesFolderName, name);

  let candidates: string[];
  switch (source) {
    case "builtin":
      candidates = builtInCandidates;
      break;
    case "user":
      candidates = [userCandidate];
      break;
    default:
      // legacy: check all locations (user first for backward compat)
      candidates = [userCandidate, ...builtInCandidates];
      break;
  }

  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addCustomCss(app: any) {
  window.addEventListener("DOMContentLoaded", () => {
    const themeId = settingsStore.get<string, string>(settings.theme);
    if (themeId !== "none") {
      const themeFile = resolveThemePath(app, themeId);
      Logger.log(`Loading theme "${themeId}" from: ${themeFile}`);
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
