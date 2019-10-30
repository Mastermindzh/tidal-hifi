const statuses = require("./../constants/statuses");

const mediaInfo = {
  title: "",
  artist: "",
  icon: "",
  status: statuses.paused,
};
const mediaInfoModule = {
  mediaInfo,
};

/**
 * Update artist and song info in the mediaInfo constant
 */
mediaInfoModule.update = function(arg) {
  mediaInfo.title = propOrDefault(arg.title);
  mediaInfo.artist = propOrDefault(arg.message);
  mediaInfo.icon = propOrDefault(arg.icon);
};

/**
 * Update tidal's status in the mediaInfo constant
 */
mediaInfoModule.updateStatus = function(status) {
  if (Object.values(statuses).includes(status)) {
    mediaInfo.status = status;
  }
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
