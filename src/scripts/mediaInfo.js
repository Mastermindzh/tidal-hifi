const statuses = require("./../constants/statuses");

const mediaInfo = {
  title: "",
  artist: "",
  icon: "",
  status: statuses.paused,
  url: "",
  current: "",
  duration: ""
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
  mediaInfo.icon = propOrDefault(arg.icon);
  mediaInfo.url = propOrDefault(arg.url);
  mediaInfo.status = propOrDefault(arg.status);
  mediaInfo.current = propOrDefault(arg.current);
  mediaInfo.duration = propOrDefault(arg.duration);
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
