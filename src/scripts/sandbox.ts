import { settings } from "../constants/settings";
import { settingsStore } from "./settingsStore";

/**
 * Whether Chromium's renderer sandbox should be turned off.
 *
 * Honours both the explicit `--no-sandbox` command-line switch and the
 * persisted `disableSandbox` flag. The flag only controls the BrowserWindow
 * `sandbox` preference; Chromium's own sandbox can only be turned off by
 * launching with `--no-sandbox` (see constants/flags.ts). Users who hit a
 * blank window (broken /dev/shm, missing setuid sandbox helper, etc.) can
 * recover by toggling the setting or launching with `--no-sandbox`.
 */
export function isSandboxDisabled(): boolean {
  return (
    process.argv.includes("--no-sandbox") ||
    Boolean(settingsStore.get(settings.flags.disableSandbox))
  );
}
