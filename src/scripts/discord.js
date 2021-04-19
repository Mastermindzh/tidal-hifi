const discordrpc = require("discord-rpc");
const clientId = '833617820704440341';
const mediaInfoModule = require("./mediaInfo");

const discordModule = [];

let discord;
let rpc;

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

    rpc.on('ready', () => {
        rpc.setActivity(idleStatus);
    })

    discord = setInterval(() => {
        if (mediaInfoModule.mediaInfo.status == 'paused' && rpc) {
            rpc.setActivity(idleStatus);
        } else if (rpc) {
            rpc.setActivity({
                details: `Listening to ${mediaInfoModule.mediaInfo.title}`,
                state: mediaInfoModule.mediaInfo.artist,
                largeImageKey: 'tidal-hifi-icon',
                largeImageText: 'Tidal HiFi 2.0.0',
                buttons: [
                    { label: "Play on Tidal", url: mediaInfoModule.mediaInfo.url }
                ],
                instance: false,
            });
        }
    }, 15e3);
}

discordModule.unRPC = function () {
    clearInterval(discord);
    rpc.clearActivity();
    rpc.destroy();
    rpc = false;
    discordModule.rpc = rpc;
}

module.exports = discordModule;