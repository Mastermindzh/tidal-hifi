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
    expressApp.get("/play", ({ res }) => handleGlobalEvent(res, globalEvents.play));
    expressApp.post("/favorite/toggle", (req, res) =>
      handleGlobalEvent(res, globalEvents.toggleFavorite)
    );
    expressApp.get("/pause", (req, res) => handleGlobalEvent(res, globalEvents.pause));
    expressApp.get("/next", (req, res) => handleGlobalEvent(res, globalEvents.next));
    expressApp.get("/previous", (req, res) => handleGlobalEvent(res, globalEvents.previous));
    expressApp.get("/playpause", (req, res) => {
      if (mediaInfo.status === MediaStatus.playing) {
        handleGlobalEvent(res, globalEvents.pause);
      } else {
        handleGlobalEvent(res, globalEvents.play);
      }
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
