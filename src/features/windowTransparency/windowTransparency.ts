import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settingsStore";

/**
 * Whether application windows should be created with a transparent background.
 *
 * Transparency is opt-in through the `windowTransparency` setting and is never
 * enabled on macOS, where it caused rendering issues. All windows (main,
 * settings and magazine) share this check so they stay in sync.
 */
export const isWindowTransparencyEnabled = (): boolean =>
  process.platform !== "darwin" &&
  Boolean(settingsStore?.get<string, boolean>(settings.windowTransparency));
