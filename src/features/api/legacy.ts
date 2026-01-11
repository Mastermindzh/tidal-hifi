import { BrowserWindow } from "electron";
import { Response, Router } from "express";
import { globalEvents } from "../../constants/globalEvents";
import { settings } from "../../constants/settings";
import { MediaStatus } from "../../models/mediaStatus";
import { mediaInfo } from "../../scripts/mediaInfo";
import { settingsStore } from "../../scripts/settings";
import { getCurrentImage } from "./features/current";

/**
 * The legacy API, this will not be maintained and probably has duplicate code :)
 * @param expressApp
 * @param mainWindow
 */
export const addLegacyApi = (expressApp: Router, mainWindow: BrowserWindow) => {
  /**
   * @swagger
   * /image:
   *   get:
   *     summary: Get current image
   *     tags: [legacy]
   *     deprecated: true
   *     responses:
   *       200:
   *         description: Current image
   *         content:
   *           image/png:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Not found
   */
  expressApp.get("/image", getCurrentImage);

  if (settingsStore.get(settings.playBackControl)) {
    addLegacyControls();
  }
  function addLegacyControls() {
    /**
     * @swagger
     * /play:
     *   get:
     *     summary: Play the current media
     *     tags: [legacy]
     *     deprecated: true
     *     responses:
     *       200:
     *         description: Action performed
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.get("/play", ({ res }) => handleGlobalEvent(res, globalEvents.play));

    /**
     * @swagger
     * /favorite/toggle:
     *   get:
     *     summary: Add the current media to your favorites, or remove it if its already added to your favorites
     *     tags: [legacy]
     *     deprecated: true
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.post("/favorite/toggle", (req, res) =>
      handleGlobalEvent(res, globalEvents.toggleFavorite),
    );

    /**
     * @swagger
     * /pause:
     *   get:
     *     summary: Pause the current media
     *     tags: [legacy]
     *     deprecated: true
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.get("/pause", (req, res) => handleGlobalEvent(res, globalEvents.pause));

    /**
     * @swagger
     * /next:
     *   get:
     *     summary: Play the next song
     *     tags: [legacy]
     *     deprecated: true
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.get("/next", (req, res) => handleGlobalEvent(res, globalEvents.next));

    /**
     * @swagger
     * /previous:
     *   get:
     *     summary: Play the previous song
     *     tags: [legacy]
     *     deprecated: true
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.get("/previous", (req, res) => handleGlobalEvent(res, globalEvents.previous));

    /**
     * @swagger
     * /playpause:
     *   get:
     *     summary: Toggle play/pause
     *     tags: [legacy]
     *     deprecated: true
     *     responses:
     *       200:
     *         description: Ok
     *         content:
     *           text/plain:
     *             schema:
     *               $ref: '#/components/schemas/OkResponse'
     */
    expressApp.get("/playpause", (req, res) => {
      handleGlobalEvent(res, globalEvents.playPause);
    });
  }

  /**
   * Shorthand to handle a fire and forget global event
   * @param {*} res
   * @param {*} action
   */
  function handleGlobalEvent(res: Response, action: string) {
    mainWindow.webContents.send("globalEvent", action);
    res.sendStatus(200);
  }
};
