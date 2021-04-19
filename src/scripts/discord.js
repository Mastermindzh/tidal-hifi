const discordrpc = require("discord-rpc");
const clientId = '833617820704440341';
const mediaInfoModule = require("./mediaInfo");
const { ipcMain } = require("electron");
const globalEvents = require("../constants/globalEvents");

const discordModule = [];

let discord;
let rpc;
let title;
let isPaused;

const idleStatus = {
    details: `Browsing Tidal`,
    largeImageKey: 'tidal-hifi-icon',
    largeImageText: 'Tidal HiFi 2.0.0',
    instance: false,
}

discordModule.initRPC = function () {
    rpc = new discordrpc.Client({ transport: 'ipc' });
    rpc.login({ clientId }).catch(console.error);
    discordModule.rpc = rpc;
}


discordModule.unRPC = function () {
    clearInterval(discord);
    rpc.clearActivity();
    rpc.destroy();
    rpc = false;
    discordModule.rpc = rpc;
}

ipcMain.on(globalEvents.updateStatus, (event, arg) => {

    if(mediaInfoModule.mediaInfo.status == "playing" && isPaused && rpc) title = undefined;

    if (mediaInfoModule.mediaInfo.status == "playing" && mediaInfoModule.mediaInfo.title != title && rpc) {
        isPaused ? isPaused = false : isPaused = true;
        title = mediaInfoModule.mediaInfo.title;
        rpc.setActivity({
            details: `Listening to ${title}`,
            state: mediaInfoModule.mediaInfo.artist,
            largeImageKey: 'tidal-hifi-icon',
            largeImageText: 'Tidal HiFi 2.0.0',
            buttons: [
                { label: "Play on Tidal", url: mediaInfoModule.mediaInfo.url }
            ],
            instance: false,
        });
    }

    if(mediaInfoModule.mediaInfo.status == "paused" && rpc && !isPaused) {
        isPaused = true;
        rpc.setActivity(idleStatus);
    }
});

module.exports = discordModule;
