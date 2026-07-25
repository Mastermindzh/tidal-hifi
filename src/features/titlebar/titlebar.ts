import { readFileSync } from "node:fs";
import path from "node:path";
import type { WebContents } from "electron";

import { Logger } from "../logger";

/**
 * Read titlebar.css from disk once and cache it. The stylesheet is copied
 * alongside the compiled JS by the `copy-files` build step, so it sits next to
 * this module in `ts-dist/features/titlebar/`.
 */
let cachedCss: string | null = null;
const getTitlebarCss = (): string => {
  cachedCss ??= readFileSync(path.join(__dirname, "titlebar.css"), "utf-8");
  return cachedCss;
};

/**
 * Track the inserted-CSS key per webContents so repeated injections (each
 * `did-finish-load` — OAuth redirects, hard reloads, …) replace rather than
 * stack stylesheets, mirroring the theming injector.
 */
const insertedCssKey = new WeakMap<WebContents, string>();

/**
 * Inject the custom titlebar stylesheet via Chromium-level `insertCSS`, so it
 * survives SPA DOM replacement. The titlebar element itself is built in the
 * preload (see titlebarView.ts) — no `executeJavaScript` needed. Attach this to
 * `did-finish-load`, exactly like the theme injector.
 */
export const injectTitlebarStyles = async (webContents: WebContents): Promise<void> => {
  try {
    const previousKey = insertedCssKey.get(webContents);
    if (previousKey) {
      try {
        await webContents.removeInsertedCSS(previousKey);
      } catch {
        Logger.log("stylesheet already cleaned, nothing to do...");
      }
    }
    insertedCssKey.set(webContents, await webContents.insertCSS(getTitlebarCss()));
  } catch (error) {
    Logger.log("Failed to inject custom titlebar styles", { error });
  }
};

export const removeTitlebarStyles = async (webContents: WebContents): Promise<void> => {
  try {
    const previousKey = insertedCssKey.get(webContents);
    if (!previousKey) return;

    await webContents.removeInsertedCSS(previousKey);
    insertedCssKey.delete(webContents);
  } catch (error) {
    Logger.log("Failed to remove custom titlebar styles", { error });
  }
};
