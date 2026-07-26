import { ipcMain, ipcRenderer } from "electron";
import type Store from "electron-store";

import { bridgeChannels } from "../constants/bridge";
import { settings } from "../constants/settings";
import values from "../constants/values";
import { getDefaultHotkeyConfig } from "../features/hotkeys";
import { Logger } from "../features/logger";

const log = (msg: string) => {
  try {
    console.log(msg);
  } catch {
    // ignore for now since console.log is all we support
  }
};

/**
 * Build a migration step for several settings.
 * All settings will be checked and set to the default if non-existent.
 */
const buildMigration = (
  version: string,
  migrationStore: { get: (str: string) => string; set: (str: string, val: unknown) => void },
  options: Array<{ key: string; value: unknown; override?: boolean }>,
) => {
  log(`running migrations for ${version}`);
  options.forEach(({ key, value, override = false }) => {
    const valueToSet = override ? value : (migrationStore.get(key) ?? value);
    log(`  - setting ${key} to ${valueToSet}${override ? " (override)" : ""}`);
    migrationStore.set(key, valueToSet);
  });
};

const defaultSettings = {
  adBlock: false,
  advanced: {
    tidalUrl: "https://tidal.com",
    controllerType: "mediaSessionController",
    userAgent: values.defaultUserAgent,
  },
  api: true,
  apiSettings: {
    port: 47836,
    hostname: "127.0.0.1",
  },
  customCSS: [],
  disableAltMenuBar: false,
  disableBackgroundThrottle: true,
  disableHardwareMediaKeys: false,
  enableCustomHotkeys: false,
  enableDiscord: false,
  discord: {
    showSong: true,
    showIdle: true,
    idleText: "Browsing Tidal",
    usingText: "Playing media on TIDAL",
    includeTimestamps: true,
    detailsPrefix: "Listening to ",
    buttonText: "Play on Tidal",
  },
  ListenBrainz: {
    enabled: false,
    api: "https://api.listenbrainz.org/1/submit-listens",
    token: "",
    delay: 5000,
  },
  flags: {
    audioOutputSampleRate: false,
    disableHardwareMediaKeys: false,
    disableSandbox: true,
    enableWaylandSupport: true,
    gpuRasterization: true,
  },
  hotkeys: getDefaultHotkeyConfig(),
  menuBar: true,
  minimizeOnClose: false,
  mpris: true,
  notifications: true,
  playBackControl: true,
  singleInstance: true,
  skipArtists: false,
  skippedArtists: [""],
  skipTracks: false,
  skippedTracks: [""],
  startMinimized: false,
  staticWindowTitle: false,
  showCustomTitlebar: false,
  theme: "none",
  trayIcon: true,
  trayIconPath: "",
  updateFrequency: 500,
  windowTransparency: false,
  windowBounds: { width: 800, height: 600 },
};

const migrations: NonNullable<Store.Options<typeof defaultSettings>["migrations"]> = {
  "3.1.0": (migrationStore) => {
    log("running migrations for 3.1.0");
    migrationStore.set(
      settings.flags.disableHardwareMediaKeys,
      migrationStore.get("disableHardwareMediaKeys") ?? false,
    );
  },
  "5.7.0": (migrationStore) => {
    log("running migrations for 5.7.0");
    migrationStore.set(
      settings.ListenBrainz.delay,
      migrationStore.get(settings.ListenBrainz.delay) ?? 5000,
    );
  },
  "5.8.0": (migrationStore) => {
    log("running migrations for 5.8.0");
    migrationStore.set(
      settings.discord.includeTimestamps,
      migrationStore.get(settings.discord.includeTimestamps) ?? true,
    );
  },
  "5.9.0": (migrationStore) => {
    buildMigration("5.9.0", migrationStore, [
      { key: settings.discord.showSong, value: "true" },
      { key: settings.discord.idleText, value: "Browsing Tidal" },
      {
        key: settings.discord.usingText,
        value: "Playing media on TIDAL",
      },
    ]);
  },
  "5.14.0": (migrationStore) => {
    buildMigration("5.14.0", migrationStore, [
      { key: settings.apiSettings.hostname, value: "127.0.0.1" },
    ]);
  },
  "5.15.0": (migrationStore) => {
    buildMigration("5.15.0", migrationStore, [
      { key: settings.advanced.tidalUrl, value: "https://listen.tidal.com" },
    ]);
  },
  "5.16.0": (migrationStore) => {
    buildMigration("5.16.0", migrationStore, [{ key: settings.discord.showIdle, value: "true" }]);
  },
  "6.0.0": (migrationStore) => {
    Logger.log("OLD STORE", { api: migrationStore.get(settings.ListenBrainz.api) });

    const currentApi = migrationStore.get(settings.ListenBrainz.api);

    buildMigration("6.0.0", migrationStore, [
      { key: settings.advanced.userAgent, value: "" },
      { key: settings.disableAltMenuBar, value: false },
      { key: settings.advanced.controllerType, value: "mediaSessionController", override: true },
      { key: settings.advanced.tidalUrl, value: "https://tidal.com", override: true },
      {
        key: settings.ListenBrainz.api,
        value: "https://api.listenbrainz.org/1/submit-listens",
        override: currentApi === "https://api.listenbrainz.org",
      },
    ]);
  },
  "6.2.0": (migrationStore) => {
    buildMigration("6.2.0", migrationStore, [{ key: settings.flags.disableSandbox, value: true }]);
  },
  "6.3.0": (migrationStore) => {
    log("running migrations for 6.3.0");
    const currentTheme = migrationStore.get(settings.theme) as string;
    const builtinThemes = [
      "Blood.css",
      "Catppuccin.css",
      "Dracula.css",
      "Gruvbox.css",
      "NightOwl.css",
      "Nord.css",
      "Solarized Dark.css",
      "Tokyo Night.css",
    ];
    // Migrate legacy unprefixed theme values to use source prefix only for known builtin themes
    if (currentTheme && !currentTheme.includes(":") && builtinThemes.includes(currentTheme)) {
      migrationStore.set(settings.theme, `builtin:${currentTheme}`);
      log(`  - migrated theme "${currentTheme}" to "builtin:${currentTheme}"`);
    }
  },
  "8.0.0": (migrationStore) => {
    buildMigration("8.0.0", migrationStore, [{ key: settings.windowTransparency, value: false }]);
  },
};

/**
 * Minimal synchronous settings interface shared by the real (main-process)
 * electron-store and the renderer-side IPC shim.
 */
interface SettingsAccessor {
  get<Value = unknown>(key: string, defaultValue?: Value): Value;
  set(key: string, value: unknown): void;
}

/**
 * Construct the real electron-store in the main process and expose it to
 * sandboxed renderers over synchronous IPC.
 *
 * `electron-store` is `require`d lazily (rather than imported at module top
 * level) so it never enters the renderer/preload bundle: the renderer only
 * ever takes the {@link createRendererStore} branch.
 */
function createMainStore(): Store<typeof defaultSettings> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const StoreCtor: typeof Store = require("electron-store");
  const store = new StoreCtor<typeof defaultSettings>({ defaults: defaultSettings, migrations });

  ipcMain.on(bridgeChannels.settingsGet, (event, key: string) => {
    event.returnValue = store.get(key);
  });
  ipcMain.on(bridgeChannels.settingsSet, (event, payload: { key: string; value: unknown }) => {
    store.set(payload.key, payload.value);
    event.returnValue = true;
  });

  return store;
}

/**
 * Renderer-side settings accessor backed by synchronous IPC to the main
 * process. Keeps the same synchronous `get`/`set` semantics the rest of the
 * renderer code relies on, without requiring Node access in the renderer.
 */
function createRendererStore(): SettingsAccessor {
  return {
    get<Value = unknown>(key: string, defaultValue?: Value): Value {
      const value = ipcRenderer.sendSync(bridgeChannels.settingsGet, key);
      return (value === undefined ? defaultValue : value) as Value;
    },
    set(key: string, value: unknown): void {
      ipcRenderer.sendSync(bridgeChannels.settingsSet, { key, value });
    },
  };
}

/**
 * Process-aware settings store.
 *
 * - main process: the real electron-store (also serves renderer requests).
 * - renderer/preload: a synchronous IPC shim with the same surface.
 *
 * Typed as the electron-store instance so existing call sites keep their types.
 */
export const settingsStore = (
  process.type === "browser" ? createMainStore() : createRendererStore()
) as Store<typeof defaultSettings>;
