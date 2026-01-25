import type { BrowserWindow } from "electron";
import type { Request, Router } from "express";

import { globalEvents } from "../../../constants/globalEvents";
import { settings } from "../../../constants/settings";
import { settingsStore } from "../../../scripts/settings";
import { handleWindowEvent } from "../helpers/handleWindowEvent";

const parseNumberParam = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value !== "string" || value.trim() === "") {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const parseVolumeParam = (req: Request) => ({
  volume: parseNumberParam(req.query.volume),
});

const parseAbsoluteSeekParam = (req: Request) => ({
  seconds: parseNumberParam(req.query.seconds),
  type: "absolute" as const,
});

const parseRelativeSeekParam = (req: Request) => ({
  seconds: parseNumberParam(req.query.seconds),
  type: "relative" as const,
});

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
    expressApp.post(createRoute(route), (_req, res) => windowEvent(res, action));
  };

  const createPlayerPutAction = (
    route: string,
    action: string,
    payloadFactory?: (req: Request) => object,
  ) => {
    expressApp.put(createRoute(route), (req, res) =>
      windowEvent(res, action, payloadFactory ? payloadFactory(req) : undefined),
    );
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
     * /player/volume:
     *   put:
     *     summary: Set volume of the player to a certain LEVEL where LEVEL is a value between 0.0 (0%) and 1.0 (100%).
     *     tags: [player]
     *     parameters:
     *       - in: query
     *         name: volume
     *         description: Volume level to set
     *         required: true
     *         schema:
     *           type: number
     *           multipleOf: 0.01
     *           minimum: 0
     *           maximum: 1
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerPutAction("/volume", globalEvents.volume, parseVolumeParam);

    /**
     * @swagger
     * /player/seek/absolute:
     *  put:
     *     summary: Set absolute position of the player
     *     tags: [player]
     *     parameters:
     *       - in: query
     *         name: seconds
     *         description: Absolute position in seconds to set
     *         required: true
     *         schema:
     *           type: number
     *           minimum: 0
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerPutAction("/seek/absolute", globalEvents.seek, parseAbsoluteSeekParam);

    /**
     * @swagger
     * /player/seek/relative:
     *  put:
     *     summary: Seek relative to current position
     *     tags: [player]
     *     parameters:
     *       - in: query
     *         name: seconds
     *         description: Relative position in seconds to seek (positive or negative)
     *         required: true
     *         schema:
     *           type: number
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    createPlayerPutAction("/seek/relative", globalEvents.seek, parseRelativeSeekParam);
  }
};
