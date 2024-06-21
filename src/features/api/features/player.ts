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

  /**
   * @swagger
   * tags:
   *   name: player
   *   description: The player control API
   * components:
   *   schemas:
   *     OkResponse:
   *       type: string
   *       example: "OK"
   */
  const createPlayerAction = (route: string, action: string) => {
    expressApp.post(createRoute(route), (req, res) => windowEvent(res, action));
  };

  if (settingsStore.get(settings.playBackControl)) {
    /**
     * @swagger
     * /play:
     *   get:
     *     summary: Play action
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/play", globalEvents.play);

    /**
     * @swagger
     * /favorite/toggle:
     *   post:
     *     summary: Toggle favorite
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/favorite/toggle", globalEvents.toggleFavorite);

    /**
     * @swagger
     * /pause:
     *   get:
     *     summary: Pause action
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/pause", globalEvents.pause);

    /**
     * @swagger
     * /next:
     *   get:
     *     summary: Next action
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/next", globalEvents.next);

    /**
     * @swagger
     * /previous:
     *   get:
     *     summary: Previous action
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/previous", globalEvents.previous);

    createPlayerAction("/shuffle/toggle", globalEvents.toggleShuffle);
    createPlayerAction("/repeat/toggle", globalEvents.toggleRepeat);

    /**
     * @swagger
     * /playpause:
     *   get:
     *     summary: Toggle play/pause
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.post(createRoute("/playpause"), (req, res) => {
      if (mediaInfo.status === MediaStatus.playing) {
        windowEvent(res, globalEvents.pause);
      } else {
        windowEvent(res, globalEvents.play);
      }
    });
  }
};
