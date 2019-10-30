const globalEvents = require("./globalEvents");

const mediaKeys = {
  MediaPlayPause: globalEvents.playPause,
  MediaNextTrack: globalEvents.next,
  MediaPreviousTrack: globalEvents.previous,
};

module.exports = mediaKeys;
