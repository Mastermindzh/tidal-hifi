import Player from "mpris-service";
import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../../features/logger";
import {
  $tidalState,
  coverArtPaths,
  next,
  pause,
  play,
  playPause,
  previous,
  stop,
  toggleRepeat,
  toggleShuffle,
} from "../state";
import { app } from "@electron/remote";

function toMicroseconds(seconds: number) {
  return BigInt(seconds) * 1000_000n;
}

if (settingsStore.get(settings.mpris) && process.platform === "linux") {
  try {
    const player = Player({
      name: "tidal-hifi",
      identity: "tidal-hifi",
      supportedUriSchemes: ["file"],
      supportedMimeTypes: [
        "audio/mpeg",
        "audio/flac",
        "audio/x-flac",
        "application/ogg",
        "audio/wav",
      ],
      supportedInterfaces: ["player"],
      desktopEntry: "tidal-hifi",
    });
    player.on("playPause", playPause);
    player.on("next", next);
    player.on("previous", previous);
    player.on("pause", pause);
    player.on("play", play);
    player.on("stop", stop);
    player.on("loopStatus", toggleRepeat);
    player.on("shuffle", toggleShuffle);
    player.on("quit", app.quit);

    player.getPosition = function () {
      return Number(toMicroseconds($tidalState.getState().currentTrack?.current ?? 0));
    };

    $tidalState.subscribe(async (state) => {
      if (!player) return;

      if (state.currentTrack) {
        const coverUrl = await coverArtPaths.get(state.currentTrack.image);
        player.metadata = {
          "xesam:title": state.currentTrack.title,
          "xesam:artist": state.currentTrack.artists,
          "xesam:album": state.currentTrack.album,
          "mpris:artUrl": coverUrl,
          "mpris:length": toMicroseconds(state.currentTrack.duration),
          "mpris:trackid": "/org/mpris/MediaPlayer2/track/" + state.currentTrack.id,
        };
      } else {
        player.metadata = {
          "mpris:trackid": "/org/mpris/MediaPlayer2/TrackList/NoTrack",
        };
      }
      player.playbackStatus = state.status;
    });
  } catch (exception) {
    console.error(exception);
    Logger.log("MPRIS player api not working", exception);
  }
}
