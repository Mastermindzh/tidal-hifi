import { Logger } from "../../features/logger";

/**
 * Selectors shared by both old and new Tidal UIs.
 */
const BASE_SELECTORS = {
  player: '*[id="video-one"]',
  play: '*[data-test="play"]',
  pause: '*[data-test="pause"]',
  next: '*[data-test="next"]',
  previous: 'button[data-test="previous"]',
  artists: '*[data-test^="grid-item-detail-text-title-artist"]',
  home: '*[data-test="menu--home"]',
  back: '[aria-label^="Back"]',
  forward: '[aria-label^="Next"]',
  search: '[class^="searchField"]',
  shuffle: '*[data-test="shuffle"]',
  repeat: '*[data-test="repeat"]',
  media: '*[data-test="current-media-imagery"]',
  image: "img",
  bar: '*[data-test="progress-bar"]',
  footer: "#footerPlayer",
  mediaItem: "[data-type='mediaItem']",
  currentlyPlaying: "[class*='isPlayingIcon'], [data-test-is-playing='true']",
  tracklist_row: '[data-test="tracklist-row"]',
  volume: '*[data-test="volume"]',
  favorite: '*[data-test="footer-favorite-button"]',
  sidebarMusic: '*[data-test="sidebar-music"]',
  sidebarExplore: '*[data-test="sidebar-explore"]',
  sidebarFeed: '*[data-test="sidebar-feed"]',
  sidebarUpload: '*[data-test="sidebar-uploads"]',
  collapseSidebar: '*[data-test="sidebar-collapse"]',
  expandSidebar: '*[data-test="sidebar-expand"]',
  sidebarLogo: '*[aria-label="TIDAL"]',
  sidebarCollectionPlaylists: '*[data-test="sidebar-collection-playlists"]',
  sidebarCollectionAlbums: '*[data-test="sidebar-collection-albums"]',
  sidebarCollectionTracks: '*[data-test="sidebar-collection-tracks"]',
  sidebarCollectionVideos: '*[data-test="sidebar-collection-videos"]',
  sidebarCollectionArtists: '*[data-test="sidebar-collection-artists"]',
  sidebarCollectionMixes: '*[data-test="sidebar-collection-mixes-and-radio"]',
};

const OLD_UI_OVERRIDES = {
  title: '*[data-test^="footer-track-title"]',
  toggleNowPlaying: '[aria-label^="toggle now playing screen"]',
  account: '*[data-test^="profile-image-button"]',
  album_header_title: '*[class^="playingFrom"] span:nth-child(2)',
  playing_from: '*[class^="playingFrom"] span:nth-child(2)',
  queue_album: "*[class^=playQueueItemsContainer] *[class^=groupTitle] span:nth-child(2)",
  album_name_cell: '[class^="album"]',
};

const NEW_UI_OVERRIDES = {
  title: '*[data-test="track-info"] [class*="titleContainer"]',
  toggleNowPlaying: '*[data-test="player-details-toggle-now-playing"]',
  account: '*[data-test^="header-profile-menu-button"]',
  album_header_title: '*[class*="playingFromText"] a',
  playing_from: '*[class*="playingFromText"] a',
  queue_album: "#playQueueSidebar *[class*='groupTitle'] a",
  album_name_cell: '[class*="album"]',
};

export type UISelectors = typeof BASE_SELECTORS & typeof NEW_UI_OVERRIDES;
export type UIVersion = "old" | "new";
export const UI_SELECTORS: UISelectors = { ...BASE_SELECTORS, ...NEW_UI_OVERRIDES };
let detectedVersion: UIVersion | null = null;

/**
 * Detect which Tidal UI version is active by checking for version-specific elements.
 * Returns `null` if the page hasn't loaded enough to determine the version.
 */
export function detectUIVersion(): UIVersion | null {
  if (globalThis.document?.querySelector('*[data-test="track-info"]')) {
    return "new";
  }
  if (globalThis.document?.querySelector('*[data-test^="footer-track-title"]')) {
    return "old";
  }
  // Neither marker found — page probably hasn't loaded the footer yet
  return null;
}

export function getUISelectors(version: UIVersion): UISelectors {
  const overrides = version === "new" ? NEW_UI_OVERRIDES : OLD_UI_OVERRIDES;
  return { ...BASE_SELECTORS, ...overrides };
}

/**
 * Detect the active Tidal UI version and update {@link UI_SELECTORS} in place.
 * Safe to call repeatedly — only applies changes when a new version is first detected.
 * Returns the detected version, or `null` if the page hasn't loaded enough.
 */
export function updateUISelectors(): UIVersion | null {
  if (detectedVersion !== null) return detectedVersion;

  const version = detectUIVersion();
  if (version === null) return null;

  detectedVersion = version;
  const fresh = getUISelectors(version);
  // Mutate the existing object so all imports referencing UI_SELECTORS see the update
  for (const key of Object.keys(fresh) as Array<keyof UISelectors>) {
    (UI_SELECTORS as Record<string, string>)[key] = fresh[key];
  }
  return version;
}

/**
 * Self-starting detection loop.
 * Polls the DOM until the UI version is identified, then stops.
 * Runs automatically when this module is first imported.
 */
const UI_DETECTION_INTERVAL_MS = 500;
const _detectionInterval = setInterval(() => {
  const version = updateUISelectors();
  if (version !== null) {
    Logger.log(`Detected Tidal UI version: ${version}`);
    clearInterval(_detectionInterval);
  }
}, UI_DETECTION_INTERVAL_MS);
