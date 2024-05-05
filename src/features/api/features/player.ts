/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow } from "electron";
import { Router } from "express";
import { globalEvents } from "../../../constants/globalEvents";
import { settings } from "../../../constants/settings";
import { MediaStatus } from "../../../models/mediaStatus";
import { mediaInfo } from "../../../scripts/mediaInfo";
import { settingsStore } from "../../../scripts/settings";
import { handleWindowEvent } from "../helpers/handleWindowEvent";

export const addPlaybackControl = (expressApp: Router, mainWindow: BrowserWindow) => {
  const windowEvent = handleWindowEvent(mainWindow);
  const createRoute = (route: string) => `/player${route}`;

  const createPlayerAction = (route: string, action: string) => {
    expressApp.post(createRoute(route), (req, res) => windowEvent(res, action));
  };

  if (settingsStore.get(settings.playBackControl)) {
    createPlayerAction("/play", globalEvents.play);
    createPlayerAction("/favorite/toggle", globalEvents.toggleFavorite);
    createPlayerAction("/pause", globalEvents.pause);
    createPlayerAction("/next", globalEvents.next);
    createPlayerAction("/previous", globalEvents.previous);
    createPlayerAction("/shuffle/toggle", globalEvents.toggleShuffle);
    createPlayerAction("/repeat/toggle", globalEvents.toggleRepeat);

    expressApp.post(createRoute("/playpause"), (req, res) => {
      if (mediaInfo.status === MediaStatus.playing) {
        windowEvent(res, globalEvents.pause);
      } else {
        windowEvent(res, globalEvents.play);
      }
    });
  }
};
