// This is a one-liner meant to be pasted in the DevTools console to check all DOM selectors.
// For some dumb reason `tidal.com` has disabled console.log,
// but we can simply return an array with values though...
// Run this on a playlist or mix page and observe the result.
// NOTE: play & pause can't live together, so one or the other will throw an error.
(() => {
  // Detect which UI version is active
  const isNewUI = !!document.querySelector('*[data-test="track-info"]');

  // Shared selectors (both UIs)
  const baseElements = {
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
  };

  // Selectors that differ per UI version
  const uiOverrides = isNewUI ? {
    title: '*[data-test="track-info"] [class*="titleContainer"]',
    toggleNowPlaying: '*[data-test="player-details-toggle-now-playing"]',
    account: '*[data-test^="header-profile-menu-button"]',
    album_header_title: '*[class*="playingFromText"] a',
    playing_from: '*[class*="playingFromText"] a',
    queue_album: "#playQueueSidebar *[class*='groupTitle'] a",
    album_name_cell: '[class*="album"]',
  } : {
    title: '*[data-test^="footer-track-title"]',
    toggleNowPlaying: '[aria-label^="toggle now playing screen"]',
    account: '*[data-test^="profile-image-button"]',
    album_header_title: '*[class^="playingFrom"] span:nth-child(2)',
    playing_from: '*[class^="playingFrom"] span:nth-child(2)',
    queue_album: "*[class^=playQueueItemsContainer] *[class^=groupTitle] span:nth-child(2)",
    album_name_cell: '[class^="album"]',
  };

  const elements = { ...baseElements, ...uiOverrides };
  let results = [`Detected UI: ${isNewUI ? "new" : "old"}`];

  Object.entries(elements).forEach(([key, value]) => {
    const returnValue = document.querySelector(`${value}`);
    if (!returnValue) {
      results.push(`element ${key} not found`);
    }
  });
  return results;
})();
