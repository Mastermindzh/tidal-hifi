import { BrowserWindow } from "electron";
import { Router } from "express";
import { globalEvents } from "../../../constants/globalEvents";
import { settings } from "../../../constants/settings";
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
   *     PlayerSettings:
   *       type: object
   *       properties:
   *         position:
   *           type: integer
   *         volume:
   *           type: integer
   */
  const createPlayerAction = (route: string, action: string) => {
    expressApp.post(createRoute(route), (req, res) => windowEvent(res, action, req.body));
  };

  if (settingsStore.get(settings.playBackControl)) {
    /**
     * @swagger
     * /player/play:
     *   post:
     *     summary: Play the current media
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/play", globalEvents.play);

    /**
     * @swagger
     * /player/favorite/toggle:
     *   post:
     *     summary: Add the current media to your favorites, or remove it if its already added to your favorites
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/favorite/toggle", globalEvents.toggleFavorite);

    /**
     * @swagger
     * /player/pause:
     *   post:
     *     summary: Pause the current media
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/pause", globalEvents.pause);

    /**
     * @swagger
     * /player/next:
     *   post:
     *     summary: Play the next song
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/next", globalEvents.next);

    /**
     * @swagger
     * /player/previous:
     *   post:
     *     summary: Play the previous song
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/previous", globalEvents.previous);

    /**
     * @swagger
     * /player/shuffle/toggle:
     *   post:
     *     summary: Play the previous song
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/shuffle/toggle", globalEvents.toggleShuffle);

    /**
     * @swagger
     * /player/repeat/toggle:
     *   post:
     *     summary: Toggle the repeat status, toggles between "off" , "single" and "all"
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/repeat/toggle", globalEvents.toggleRepeat);

    /**
     * @swagger
     * /player/playpause:
     *   post:
     *     summary: Start playing the media if paused, or pause the media if playing
     *     tags: [player]
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerAction("/playpause", globalEvents.playPause);

    /**
     * @swagger
     * /player/set:
     *   post:
     *     summary: Set properties of the player
     *     tags: [player]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/PlayerSettings'
     */
    createPlayerAction("/set", globalEvents.set);
  }
};
