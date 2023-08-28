// for some dumb reason `listen.tidal.com` has disabled console.log
// we can simply return an array with values though...
// run this on a playlist or mix page and observe the result
// NOTE: play & pause can't live together so one or the other will throw an error
(() => {
  let elements = {
    play: '*[data-test="play"]',
    pause: '*[data-test="pause"]',
    next: '*[data-test="next"]',
    previous: 'button[data-test="previous"]',
    title: '*[data-test^="footer-track-title"]',
    artists: '*[data-test^="grid-item-detail-text-title-artist"]',
    home: '*[data-test="menu--home"]',
    back: '[title^="Back"]',
    forward: '[title^="Next"]',
    search: '[class^="searchField"]',
    shuffle: '*[data-test="shuffle"]',
    repeat: '*[data-test="repeat"]',
    account: '*[data-test^="profile-image-button"]',
    media: '*[data-test="current-media-imagery"]',
    image: "img",
    current: '*[data-test="current-time"]',
    duration: '*[data-test="duration"]',
    bar: '*[data-test="progress-bar"]',
    footer: "#footerPlayer",
    mediaItem: "[data-type='mediaItem']",
    album_header_title: '.header-details [data-test="title"]',
    currentlyPlaying: "[class^='isPlayingIcon'], [data-test-is-playing='true']",
    album_name_cell: '[class^="album"]',
    tracklist_row: '[data-test="tracklist-row"]',
    volume: '*[data-test="volume"]',
  };

  let results = [];

  Object.entries(elements).forEach(([key, value]) => {
    const returnValue = document.querySelector(`${value}`);
    if (!returnValue) {
      results.push(`element ${key} not found`);
    }
  });
  return results;
})();
