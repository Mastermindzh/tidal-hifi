const mediaInfo = {
  title: "",
  artist: "",
  icon: "",
};
const mediaInfoModule = {
  mediaInfo,
};

mediaInfoModule.update = function(arg) {
  mediaInfo.title = propOrDefault(arg.title);
  mediaInfo.artist = propOrDefault(arg.message);
  mediaInfo.icon = propOrDefault(arg.icon);
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
