const statuses = require("./../constants/statuses");

const mediaInfo = {
  title: "",
  artist: "",
  album: "",
  icon: "",
  status: statuses.paused,
  url: "",
  current: "",
  duration: "",
  image: "tidal-hifi-icon"
};
const mediaInfoModule = {
  mediaInfo,
};

/**
 * Update artist and song info in the mediaInfo constant
 */
mediaInfoModule.update = function (arg) {
  mediaInfo.title = propOrDefault(arg.title);
  mediaInfo.artist = propOrDefault(arg.message);
  mediaInfo.album = propOrDefault(arg.album);
  mediaInfo.icon = propOrDefault(arg.icon);
  mediaInfo.url = propOrDefault(arg.url);
  mediaInfo.status = propOrDefault(arg.status);
  mediaInfo.current = propOrDefault(arg.current);
  mediaInfo.duration = propOrDefault(arg.duration);
  mediaInfo.image = propOrDefault(arg.image);
};

/**
 * Return the property or a default value
 * @param {*} prop property to check
 * @param {*} defaultValue defaults to ""
 */
function propOrDefault(prop, defaultValue = "") {
  return prop ? prop : defaultValue;
}

module.exports = mediaInfoModule;
