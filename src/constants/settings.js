/**
 * Object to type my settings file:
 *
 *    notifications: true,
 *    api: true,
 *    apiSettings: {
 *      port: 47836,
 *    },
 *    windowBounds: { width: 800, height: 600 },
 */
const settings = {
  notifications: "notifications",
  api: "api",
  menuBar: "menuBar",
  playBackControl: "playBackControl",
  muteArtists: "muteArtists",
  mutedArtists: "mutedArtists",
  apiSettings: {
    root: "apiSettings",
    port: "apiSettings.port",
  },
  singleInstance: "singleInstance",
  disableHardwareMediaKeys: "disableHardwareMediaKeys",
  flags: {
    disableHardwareMediaKeys: "flags.disableHardwareMediaKeys",
    gpuRasterization: "flags.gpuRasterization",
  },
  mpris: "mpris",
  enableCustomHotkeys: "enableCustomHotkeys",
  trayIcon: "trayIcon",
  enableDiscord: "enableDiscord",
  windowBounds: {
    root: "windowBounds",
    width: "windowBounds.width",
    height: "windowBounds.height",
  },
  minimizeOnClose: "minimizeOnClose",
};

module.exports = settings;
