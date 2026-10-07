import { settings } from "../constants/settings";
import { settingsStore } from "./settingsStore";

/**
 * Whether Chromium's renderer sandbox should be turned off.
 *
 * Honours both the explicit `--no-sandbox` command-line switch and the
 * persisted `disableSandbox` flag. The setting only controls BrowserWindow
 * preferences; disabling Chromium's sandbox globally requires passing
 * `--no-sandbox` at launch, before Linux zygotes are initialized.
 */
export function isSandboxDisabled(): boolean {
  return (
    process.argv.includes("--no-sandbox") ||
    Boolean(settingsStore.get(settings.flags.disableSandbox))
  );
}
