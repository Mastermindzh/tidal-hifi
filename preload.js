const hotkeys = require("hotkeys-js");

function getNode(string) {
  return window.document.querySelectorAll(string)[0];
}

/**
 * Play or pause the current song
 */
function playPause() {
  let controls = getNode('*[class^="playbackControls"]');

  let play = controls.querySelectorAll('*[data-test^="play"]')[0];
  let pause = controls.querySelectorAll('*[data-test^="pause"]')[0];

  if (play) {
    play.click();
  } else {
    pause.click();
  }
}
/**
 * Click a button
 * @param {*} dataTestValue
 */
function clickButton(dataTestValue) {
  getNode(`*[data-test^="${dataTestValue}"]`).click();
}

/**
 * Return the title of the current song
 */
function getTitle() {
  return getNode('*[data-test^="footer-track-title"]').textContent;
}

function getArtists() {
  return getNode('*[class^="mediaArtists"]').textContent;
}

/**
 * Add hotkeys
 */
function addHotKeys() {
  hotkeys("f4", function(event, handler) {
    // Prevent the default refresh event under WINDOWS system
    event.preventDefault();
    playPause();
    // clickButton("next");
  });
}

/**
 * Add ipc event listeners
 */
function addIPCEventListeners() {
  window.addEventListener("DOMContentLoaded", () => {
    const { ipcRenderer } = require("electron");

    ipcRenderer.on("getPlayInfo", (event, col) => {
      window.document.querySelectorAll('*[data-test^="next"]')[0].click();
      alert(`${getTitle()} - ${getArtists()}`);
    });
  });
}

addHotKeys();
addIPCEventListeners();
