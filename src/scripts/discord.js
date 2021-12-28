const discordrpc = require("discord-rpc");
const { app, ipcMain } = require("electron");
const globalEvents = require("../constants/globalEvents");
const clientId = "833617820704440341";
const mediaInfoModule = require("./mediaInfo");
const discordModule = [];

function timeToSeconds(timeArray) {
  let minutes = timeArray[0] * 1;
  let seconds = minutes * 60 + timeArray[1] * 1;
  return seconds;
}

let rpc;
const observer = (event, arg) => {
  if (mediaInfoModule.mediaInfo.status == "paused" && rpc) {
    rpc.setActivity(idleStatus);
  } else if (rpc) {
    const currentSeconds = timeToSeconds(mediaInfoModule.mediaInfo.current.split(":"));
    const durationSeconds = timeToSeconds(mediaInfoModule.mediaInfo.duration.split(":"));
    const date = new Date();
    const now = (date.getTime() / 1000) | 0;
    const remaining = date.setSeconds(date.getSeconds() + (durationSeconds - currentSeconds));
    if (mediaInfoModule.mediaInfo.url) {
      rpc.setActivity({
        ...idleStatus,
        ...{
          details: `Listening to ${mediaInfoModule.mediaInfo.title}`,
          state: mediaInfoModule.mediaInfo.artist
            ? mediaInfoModule.mediaInfo.artist
            : "unknown artist(s)",
          startTimestamp: parseInt(now),
          endTimestamp: parseInt(remaining),
          largeImageKey: mediaInfoModule.mediaInfo.image,
          largeImageText: (mediaInfoModule.mediaInfo.album) ? mediaInfoModule.mediaInfo.album : `${idleStatus.largeImageText}`,
          buttons: [{ label: "Play on Tidal", url: mediaInfoModule.mediaInfo.url }],
        },
      });
    } else {
      rpc.setActivity({
        ...idleStatus,
        ...{
          details: `Watching ${mediaInfoModule.mediaInfo.title}`,
          state: mediaInfoModule.mediaInfo.artist,
          startTimestamp: parseInt(now),
          endTimestamp: parseInt(remaining),
        },
      });
    }
  }
};

const idleStatus = {
  details: `Browsing Tidal`,
  largeImageKey: "tidal-hifi-icon",
  largeImageText: `Tidal HiFi ${app.getVersion()}`,
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
