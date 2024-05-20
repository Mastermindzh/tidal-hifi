import { Request, Router } from "express";
import { settings } from "../../../../constants/settings";
import { mediaInfo } from "../../../../scripts/mediaInfo";
import {
  addSkippedArtists,
  removeSkippedArtists,
  settingsStore,
} from "../../../../scripts/settings";
import { BrowserWindow } from "electron";
import { globalEvents } from "../../../../constants/globalEvents";

/**
 * @swagger
 * tags:
 *   name: settings
 *   description: The settings management API
 * components:
 *   schemas:
 *     StringArray:
 *       type: array
 *       items:
 *         type: string
 *       example: ["Artist1", "Artist2"]
 *
 * @param expressApp
 * @param mainWindow
 */
export const addSettingsAPI = (expressApp: Router, mainWindow: BrowserWindow) => {
  /**
   * @swagger
   * /settings/skipped-artists:
   *   get:
   *     summary: get a list of artists that TIDAL Hi-Fi will skip if skipping is enabled
   *     tags: [settings]
   *     responses:
   *       200:
   *         description: The list book.
   *         content:
   *           application/json:
   *             schema:
   *              $ref: '#/components/schemas/StringArray'
   */
  expressApp.get("/settings/skipped-artists", (req, res) => {
    res.json(settingsStore.get<string, string[]>(settings.skippedArtists));
  });

  /**
   * @swagger
   * /settings/skipped-artists:
   *   post:
   *     summary: Add new artists to the list of skipped artists
   *     tags: [settings]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StringArray'
   *     responses:
   *       200:
   *         description: Ok
   */
  expressApp.post("/settings/skipped-artists", (req: Request<object, object, string[]>, res) => {
    addSkippedArtists(req.body);
    res.sendStatus(200);
  });

  /**
   * @swagger
   * /settings/skipped-artists/delete:
   *   post:
   *     summary: Remove artists from the list of skipped artists
   *     tags: [settings]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StringArray'
   *     responses:
   *       200:
   *         description: Ok
   */
  expressApp.post(
    "/settings/skipped-artists/delete",
    (req: Request<object, object, string[]>, res) => {
      removeSkippedArtists(req.body);
      res.sendStatus(200);
    }
  );

  /**
   * @swagger
   * /settings/skipped-artists/current:
   *   post:
   *     summary: Add the current artist to the list of skipped artists
   *     tags: [settings]
   *     responses:
   *       200:
   *        description: Ok
   */
  expressApp.post("/settings/skipped-artists/current", (req, res) => {
    addSkippedArtists([mediaInfo.artists]);
    mainWindow.webContents.send("globalEvent", globalEvents.next);
    res.sendStatus(200);
  });
  /**
   * @swagger
   * /settings/skipped-artists/current:
   *   delete:
   *     summary: Remove the current artist from the list of skipped artists
   *     tags: [settings]
   *     responses:
   *       200:
   *        description: Ok
   */
  expressApp.delete("/settings/skipped-artists/current", (req, res) => {
    removeSkippedArtists([mediaInfo.artists]);
    res.sendStatus(200);
  });
};
