const hotkeyjs = require("hotkeys-js");
const hotkeys = {};

hotkeys.add = function(keys, func) {
  hotkeyjs(keys, function(event, args) {
    event.preventDefault();
    func(event, args);
  });
};

module.exports = hotkeys;
