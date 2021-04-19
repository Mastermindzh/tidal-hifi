const discordrpc = require("discord-rpc");
const { ipcMain } = require("electron");
const electron = require("electron");
const globalEvents = require("../constants/globalEvents");
const clientId = "833617820704440341";
const mediaInfoModule = require("./mediaInfo");
const discordModule = [];

let rpc;
const observer = (event, arg) => {
  if (mediaInfoModule.mediaInfo.status == "paused" && rpc) {
    rpc.setActivity(idleStatus);
  } else if (rpc) {
    rpc.setActivity({
      ...idleStatus,
      ...{
        details: `Listening to ${mediaInfoModule.mediaInfo.title}`,
        state: mediaInfoModule.mediaInfo.artist,
        buttons: [{ label: "Play on Tidal", url: mediaInfoModule.mediaInfo.url }],
      },
    });
  }
};

const idleStatus = {
  details: `Browsing Tidal`,
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `Tidal HiFi ${electron.app.getVersion()}`,
  instance: false,
};

/**
 * Set up the discord rpc and listen on globalEvents.updateInfo
 */
discordModule.initRPC = function () {
  rpc = new discordrpc.Client({ transport: "ipc" });
  rpc.login({ clientId }).catch(console.error);
  discordModule.rpc = rpc;

  rpc.on("ready", () => {
    rpc.setActivity(idleStatus);
  });
  ipcMain.on(globalEvents.updateInfo, observer);
};

/**
 * Remove any RPC connection with discord and remove the event listener on globalEvents.updateInfo
 */
discordModule.unRPC = function () {
  rpc.clearActivity();
  rpc.destroy();
  rpc = false;
  discordModule.rpc = rpc;
  ipcMain.removeListener(globalEvents.updateInfo, observer);
};

module.exports = discordModule;
