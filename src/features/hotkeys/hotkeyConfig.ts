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
    id: "volumeUp",
    name: "Volume up",
    description: "Turn the volume up by 10% if possible",
    defaultKey: "control+up",
  },
  {
    id: "volumeDown",
    name: "Volume down",
    description: "Turn the volume down by 10% if possible",
    defaultKey: "control+down",
  },
  {
    id: "expandNowPlaying",
    name: "Expand now playing",
    description: "Expand the now playing section",
    defaultKey: "control+p",
  },
  {
    id: "sidebarMusic",
    name: "Go to Music",
    description: "Navigate to the Music sidebar tab",
    defaultKey: "alt+m",
  },
  {
    id: "sidebarExplore",
    name: "Go to Explore",
    description: "Navigate to the Explore sidebar tab",
    defaultKey: "alt+e",
  },
  {
    id: "sidebarFeed",
    name: "Go to Feed",
    description: "Navigate to the Feed sidebar tab",
    defaultKey: "alt+f",
  },
  {
    id: "sidebarUpload",
    name: "Go to Uploads",
    description: "Navigate to the Uploads sidebar tab",
    defaultKey: "alt+u",
  },
  {
    id: "toggleSidebar",
    name: "Toggle Sidebar",
    description: "Toggle sidebar between expanded and compact view",
    defaultKey: "alt+s",
  },
  {
    id: "sidebarCollectionPlaylists",
    name: "Go to Collection: Playlists",
    description: "Navigate to Collection > Playlists",
    defaultKey: "alt+shift+p",
  },
  {
    id: "sidebarCollectionAlbums",
    name: "Go to Collection: Albums",
    description: "Navigate to Collection > Albums",
    defaultKey: "alt+shift+a",
  },
  {
    id: "sidebarCollectionTracks",
    name: "Go to Collection: Tracks",
    description: "Navigate to Collection > Tracks",
    defaultKey: "alt+shift+t",
  },
  {
    id: "sidebarCollectionVideos",
    name: "Go to Collection: Videos",
    description: "Navigate to Collection > Videos",
    defaultKey: "alt+shift+v",
  },
  {
    id: "sidebarCollectionArtists",
    name: "Go to Collection: Artists",
    description: "Navigate to Collection > Artists",
    defaultKey: "alt+shift+r",
  },
  {
    id: "sidebarCollectionMixes",
    name: "Go to Collection: Mixes & Radio",
    description: "Navigate to Collection > Mixes & Radio",
    defaultKey: "alt+shift+m",
  },

  {
    id: "deleteDisabled",
    name: "Search Override Disabled",
    description: "Delete key behavior is disabled to prevent search interference",
    defaultKey: "delete",
  },
];
