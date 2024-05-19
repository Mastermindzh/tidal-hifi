/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow } from "electron";
import { Router } from "express";
import { globalEvents } from "../../../constants/globalEvents";
import { settings } from "../../../constants/settings";
import { settingsStore } from "../../../scripts/settings";

export const addPlaybackControl = (expressApp: Router, mainWindow: BrowserWindow) => {
  const createPlayerAction = (route: string, action: string) => {
    expressApp.post(`/player${route}`, (_, res) => {
      mainWindow.webContents.send("globalEvent", action);
      res.sendStatus(200);
    });
  };

  if (settingsStore.get(settings.playBackControl)) {
    createPlayerAction("/play", globalEvents.play);
    createPlayerAction("/favorite/toggle", globalEvents.toggleFavorite);
    createPlayerAction("/pause", globalEvents.pause);
    createPlayerAction("/next", globalEvents.next);
    createPlayerAction("/previous", globalEvents.previous);
    createPlayerAction("/shuffle/toggle", globalEvents.toggleShuffle);
    createPlayerAction("/repeat/toggle", globalEvents.toggleRepeat);

    createPlayerAction("/playpause", globalEvents.playPause);
  }
};
