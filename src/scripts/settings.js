const Store = require("electron-store");
const settings = require("./../constants/settings");

const store = new Store({
  defaults: {
    notifications: true,
    api: true,
    apiSettings: {
      port: 47836,
    },
    windowBounds: { width: 800, height: 600 },
  },
});

const settingsModule = {
  store,
  settings,
};

module.exports = settingsModule;
