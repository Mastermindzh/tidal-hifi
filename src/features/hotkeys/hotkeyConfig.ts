export interface HotkeyAction {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
}

export interface HotkeyConfig {
  [actionId: string]: string; // Maps action ID to configured key combination
}

/**
 * Generate default hotkey configuration from the actions
 */
export function getDefaultHotkeyConfig(): HotkeyConfig {
  const config: HotkeyConfig = {};
  DEFAULT_HOTKEY_ACTIONS.forEach((action) => {
    config[action.id] = action.defaultKey;
  });
  return config;
}

/**
 * Get hotkey action by ID
 */
export function getHotkeyAction(actionId: string): HotkeyAction | undefined {
  return DEFAULT_HOTKEY_ACTIONS.find((action) => action.id === actionId);
}

/**
 * Default hotkey actions available in Tidal Hi-Fi
 * Based on the hotkeys from https://defkey.com/tidal-desktop-shortcuts
 *
 * @sonar-ignore-next-line typescript:S1192 - Configuration data with expected repetitive structure
 */
export const DEFAULT_HOTKEY_ACTIONS: HotkeyAction[] = [
  {
    id: "toggleFavorite",
    name: "Toggle Favorite",
    description: "Add or remove current track from favorites",
    defaultKey: "control+a",
  },
  {
    id: "logout",
    name: "Logout",
    description: "Sign out of your TIDAL account",
    defaultKey: "control+l",
  },
  {
    id: "hardReload",
    name: "Hard Reload",
    description: "Force refresh the TIDAL interface",
    defaultKey: "control+u",
  },
  {
    id: "toggleRepeat",
    name: "Toggle Repeat Mode",
    description: "Cycle through repeat modes (off, one, all)",
    defaultKey: "control+r",
  },
  {
    id: "shareTrackLink",
    name: "Share Track Link",
    description: "Copy universal track link to clipboard",
    defaultKey: "control+w",
  },
  {
    id: "goBack",
    name: "Go Back",
    description: "Navigate to the previous page in browser history",
    defaultKey: "alt+left",
  },
  {
    id: "goForward",
    name: "Go Forward",
    description: "Navigate to the next page in browser history",
    defaultKey: "alt+right",
  },
  {
    id: "openSettings1",
    name: "Open Settings",
    description: "Open the settings dialog",
    defaultKey: "control+=",
  },
  {
    id: "openSettings2",
    name: "Open Settings (Alt)",
    description: "Open the settings dialog (alternative)",
    defaultKey: "control+0",
  },
  {
    id: "deleteDisabled",
    name: "Search Override Disabled",
    description: "Delete key behavior is disabled to prevent search interference",
    defaultKey: "delete",
  },
];
