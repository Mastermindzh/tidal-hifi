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
export const settings = {
  adBlock: "adBlock",
  api: "api",
  apiSettings: {
    root: "apiSettings",
    port: "apiSettings.port",
  },
  customCSS: "customCSS",
  disableBackgroundThrottle: "disableBackgroundThrottle",
  disableHardwareMediaKeys: "disableHardwareMediaKeys",
  enableCustomHotkeys: "enableCustomHotkeys",
  enableDiscord: "enableDiscord",
  discord: {
    detailsPrefix: "discord.detailsPrefix",
    buttonText: "discord.buttonText",
  },
  ListenBrainz: {
    root: "ListenBrainz",
    enabled: "ListenBrainz.enabled",
    api: "ListenBrainz.api",
    token: "ListenBrainz.token",
  },
  flags: {
    root: "flags",
    disableHardwareMediaKeys: "flags.disableHardwareMediaKeys",
    gpuRasterization: "flags.gpuRasterization",
    enableWaylandSupport: "flags.enableWaylandSupport",
  },
  menuBar: "menuBar",
  minimizeOnClose: "minimizeOnClose",
  mpris: "mpris",
  notifications: "notifications",
  playBackControl: "playBackControl",
  singleInstance: "singleInstance",
  skipArtists: "skipArtists",
  skippedArtists: "skippedArtists",
  theme: "theme",
  trayIcon: "trayIcon",
  updateFrequency: "updateFrequency",
  windowBounds: {
    root: "windowBounds",
    width: "windowBounds.width",
    height: "windowBounds.height",
  },
};
