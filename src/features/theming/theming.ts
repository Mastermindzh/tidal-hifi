import fs from "node:fs";
import path from "node:path";

import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settingsStore";
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
 * Validate that a theme filename is a safe `.css` reference.
 *
 * Nested paths (e.g. "dark/blue.css") are allowed — the actual security
 * boundary (staying inside the themes directory) is enforced separately by the
 * confinement check in `resolveThemePath`. Here we only reject the cases that
 * enable traversal or are otherwise malformed: `..` / `.` segments, absolute or
 * empty segments, NUL/control characters, and non-`.css` files.
 */
export function isSafeThemeName(name: string): boolean {
  if (!name || name.length > 255) return false;
  // Reject NUL and other control characters outright.
  for (let i = 0; i < name.length; i++) {
    if ((name.codePointAt(i) ?? 0) < 0x20) return false;
  }
  // Split into path segments (allowing nested themes) and reject traversal,
  // current-dir, or empty segments (the latter catch absolute paths and "//").
  const segments = name.split(/[/\\]/);
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return false;
  }
  // Only allow .css files.
  if (!name.toLowerCase().endsWith(".css")) return false;
  return true;
}

const themesFolderName = "themes";

/**
 * CSS that keeps scrollbars transparent until the scrollable element is hovered.
 * `!important` is required because Tidal styles its own scrollbars with
 * higher-specificity class/id selectors that would otherwise win.
 */
const autoHideScrollbarCss = `
* {
  scrollbar-width: thin !important;
  scrollbar-color: transparent transparent !important;
}
*:hover,
*:focus-within {
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent !important;
}
::-webkit-scrollbar,
*::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}
::-webkit-scrollbar-track,
*::-webkit-scrollbar-track {
  background: transparent !important;
}
::-webkit-scrollbar-thumb,
*::-webkit-scrollbar-thumb {
  background: transparent !important;
  border-radius: 8px !important;
}
:hover::-webkit-scrollbar-thumb,
*:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3) !important;
}
::-webkit-scrollbar-thumb:hover,
*::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5) !important;
}
`;

/**
 * The user-writable themes directory (~/.config/tidal-hifi/themes/).
 */
export function getUserThemeDirectory(app: Electron.App): string {
  return path.join(app.getPath("userData"), themesFolderName);
}

/**
 * The built-in themes directories: the bundled resources dir, plus the
 * project-root `themes/` directory in development.
 */
export function getBuiltInThemeDirectories(app: Electron.App): string[] {
  const dirs = [path.join(process.resourcesPath, themesFolderName)];
  if (!app.isPackaged) {
    dirs.push(path.join(process.cwd(), themesFolderName));
  }
  return dirs;
}

/**
 * Create the directory used to store user themes.
 */
export function makeUserThemesDirectory(directory: string): void {
  try {
    fs.mkdirSync(directory, { recursive: true });
  } catch (err) {
    Logger.log(`Failed to make user theme directory: ${directory}`, err);
  }
}

/**
 * Read the `.css` filenames from a directory and return them sorted.
 * @param directory to read from. Created if missing (unless `readOnly`).
 * @param readOnly skip directory creation (for bundled/read-only paths).
 */
export function getThemeListFromDirectory(directory: string, readOnly = false): string[] {
  try {
    if (!readOnly) {
      makeUserThemesDirectory(directory);
    }
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".css"))
      .map((entry) => entry.name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch (err) {
    Logger.log(`Failed to get files from ${directory}`, err);
    return [];
  }
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
 *
 * Every candidate is validated: the name must be a plain `.css` filename and the
 * resolved path must stay inside its themes directory. Returns `null` (no theme)
 * when the identifier is unsafe or no valid file exists.
 */
export function resolveThemePath(app: Electron.App, themeId: string): string | null {
  const { source, name } = parseThemeId(themeId);

  if (!isSafeThemeName(name)) {
    Logger.log(`Rejected unsafe theme identifier: "${themeId}"`);
    return null;
  }

  const builtInDirs = getBuiltInThemeDirectories(app);
  const userDir = getUserThemeDirectory(app);

  let dirs: string[];
  switch (source) {
    case "builtin":
      dirs = builtInDirs;
      break;
    case "user":
      dirs = [userDir];
      break;
    default:
      // legacy: check all locations (user first for backward compat)
      dirs = [userDir, ...builtInDirs];
      break;
  }

  for (const dir of dirs) {
    const root = path.resolve(dir) + path.sep;
    const resolved = path.resolve(dir, name);
    // Confine the resolved path to the themes directory, even if it exists.
    if (!resolved.startsWith(root)) {
      Logger.log(`Rejected theme path outside themes directory: ${resolved}`);
      continue;
    }
    try {
      if (fs.statSync(resolved).isFile()) {
        return resolved;
      }
    } catch {
      // Candidate doesn't exist in this directory; try the next one.
    }
  }

  Logger.log(`No valid theme file found for identifier: "${themeId}"`);
  return null;
}

/**
 * Track keys returned by previous `insertCSS` calls per webContents so we can
 * remove them before re-injecting. `did-finish-load` fires on every same-origin
 * navigation (OAuth redirects, hard reloads, SPA full reloads), and without
 * cleanup each fire would append another full stylesheet to the renderer.
 */
const insertedCssKeys = new WeakMap<Electron.WebContents, string[]>();

/**
 * Track the theme/custom-CSS signature last injected into each webContents so
 * we can skip re-injection (and the visible flicker it causes) when unrelated
 * settings change.
 */
const injectedThemeSignature = new WeakMap<Electron.WebContents, string>();

/**
 * A signature of everything {@link injectThemeCss} renders, so we can detect
 * whether a re-injection would actually change anything.
 */
function currentThemeSignature(): string {
  const themeId = settingsStore.get<string, string>(settings.theme);
  const customCSS = settingsStore.get<string, string[]>(settings.customCSS) ?? [];
  const hideScrollbars = settingsStore.get<string, boolean>(settings.hideScrollbars) ?? false;
  return JSON.stringify([themeId, customCSS, hideScrollbars]);
}

/**
 * Inject theme and custom CSS into a BrowserWindow's webContents via Chromium-level insertCSS.
 * Attach this to the `did-finish-load` event of any window that should be themed.
 *
 * Previously-inserted stylesheets are removed first so repeated invocations
 * (e.g. across navigations) replace rather than stack.
 */
export async function injectThemeCss(app: Electron.App, webContents: Electron.WebContents) {
  // Remove any previously-injected CSS so we don't accumulate stylesheets.
  const previousKeys = insertedCssKeys.get(webContents) ?? [];
  for (const key of previousKeys) {
    try {
      await webContents.removeInsertedCSS(key);
    } catch {
      // Renderer may have already discarded the stylesheet (e.g. after navigation); ignore.
    }
  }

  const newKeys: string[] = [];

  const themeId = settingsStore.get<string, string>(settings.theme);
  if (themeId !== "none") {
    const themeFile = resolveThemePath(app, themeId);
    if (themeFile) {
      Logger.log(`Loading theme "${themeId}" from: ${themeFile}`);
      try {
        const css = fs.readFileSync(themeFile, "utf-8");
        newKeys.push(await webContents.insertCSS(css));
      } catch (error) {
        Logger.log("An error occurred reading the theme file.", error);
      }
    }
  }
  const customCSS = settingsStore.get<string, string[]>(settings.customCSS);
  if (customCSS?.length) {
    newKeys.push(await webContents.insertCSS(customCSS.join("\n")));
  }

  if (settingsStore.get<string, boolean>(settings.hideScrollbars)) {
    newKeys.push(await webContents.insertCSS(autoHideScrollbarCss));
  }

  insertedCssKeys.set(webContents, newKeys);
  injectedThemeSignature.set(webContents, currentThemeSignature());
}

/**
 * Re-inject theme/custom CSS only when the theme or custom CSS has actually
 * changed since the last injection into this webContents. `storeChanged` fires
 * for every setting change, so re-injecting unconditionally would flicker the
 * window on unrelated changes.
 */
export async function injectThemeCssIfChanged(
  app: Electron.App,
  webContents: Electron.WebContents,
) {
  if (injectedThemeSignature.get(webContents) === currentThemeSignature()) {
    return;
  }
  await injectThemeCss(app, webContents);
}
