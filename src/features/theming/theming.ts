import fs from "node:fs";
import path from "node:path";

import { settings } from "../../constants/settings";
import { getAutoHideScrollbarsSetting, settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";

const AUTO_HIDE_SCROLLBARS_CSS = `
html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window),
html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window) * {
  -ms-overflow-style: none;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window)::-webkit-scrollbar,
html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window) *::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
}

html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window)::-webkit-scrollbar-track,
html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window) *::-webkit-scrollbar-track {
  background-color: transparent !important;
}

html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window)::-webkit-scrollbar-thumb,
html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window) *::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: 3px !important;
}

html.tidal-hifi-auto-hide-scrollbars.tidal-hifi-scrollbars-visible body:not(.settings-window),
html.tidal-hifi-auto-hide-scrollbars.tidal-hifi-scrollbars-visible body:not(.settings-window) * {
  scrollbar-color: rgba(255, 255, 255, 0.32) transparent;
}

html.tidal-hifi-auto-hide-scrollbars.tidal-hifi-scrollbars-visible body:not(.settings-window)::-webkit-scrollbar-thumb,
html.tidal-hifi-auto-hide-scrollbars.tidal-hifi-scrollbars-visible body:not(.settings-window) *::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.32) !important;
}

html.tidal-hifi-auto-hide-scrollbars body:not(.settings-window) .os-scrollbar {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 160ms ease-out;
}

html.tidal-hifi-auto-hide-scrollbars.tidal-hifi-scrollbars-visible body:not(.settings-window) .os-scrollbar {
  opacity: 1 !important;
}
`;

const AUTO_HIDE_SCROLLBARS_SCRIPT = `(() => {
  if (document.body?.classList.contains("settings-window")) {
    return;
  }

  if (window.__tidalHifiAutoHideScrollbarsInitialized) {
    return;
  }

  window.__tidalHifiAutoHideScrollbarsInitialized = true;

  const root = document.documentElement;
  if (!root) {
    return;
  }

  const visibleClass = "tidal-hifi-scrollbars-visible";
  const enabledClass = "tidal-hifi-auto-hide-scrollbars";
  const hideDelayMs = 1400;
  let hideTimer;

  const hideScrollbars = () => {
    root.classList.remove(visibleClass);
  };

  const scheduleHide = () => {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideScrollbars, hideDelayMs);
  };

  const showScrollbars = () => {
    root.classList.add(enabledClass);
    root.classList.add(visibleClass);
    scheduleHide();
  };

  const onKeyDown = (event) => {
    const scrollKeys = new Set([
      "ArrowDown",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      "Space",
    ]);

    if (scrollKeys.has(event.code) || scrollKeys.has(event.key)) {
      showScrollbars();
    }
  };

  root.classList.add(enabledClass);
  scheduleHide();

  window.addEventListener("scroll", showScrollbars, { capture: true, passive: true });
  window.addEventListener("wheel", showScrollbars, { passive: true });
  window.addEventListener("touchmove", showScrollbars, { passive: true });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", hideScrollbars);
})();`;

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
export function resolveThemePath(
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

/**
 * Inject theme and custom CSS into a BrowserWindow's webContents via Chromium-level insertCSS.
 * Attach this to the `did-finish-load` event of any window that should be themed.
 */
export function injectThemeCss(
  app: { getPath: (name: string) => string; isPackaged: boolean },
  webContents: Electron.WebContents,
) {
  const themeId = settingsStore.get<string, string>(settings.theme);
  if (themeId !== "none") {
    const themeFile = resolveThemePath(app, themeId);
    Logger.log(`Loading theme "${themeId}" from: ${themeFile}`);
    try {
      const css = fs.readFileSync(themeFile, "utf-8");
      webContents.insertCSS(css);
    } catch (error) {
      Logger.log("An error occurred reading the theme file.", error);
    }
  }
  const customCSS = settingsStore.get<string, string[]>(settings.customCSS);
  if (customCSS?.length) {
    webContents.insertCSS(customCSS.join("\n"));
  }

  if (getAutoHideScrollbarsSetting()) {
    webContents.insertCSS(AUTO_HIDE_SCROLLBARS_CSS);
    void webContents.executeJavaScript(AUTO_HIDE_SCROLLBARS_SCRIPT).catch((error) => {
      Logger.log("Failed to inject auto-hide scrollbar behavior.", error);
    });
  }
}
