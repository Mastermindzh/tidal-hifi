import { Request, Response, Router } from "express";
import fs from "fs";
import { mediaInfo } from "../../../scripts/mediaInfo";

export const addCurrentInfo = (expressApp: Router) => {
  /**
   * @swagger
   * tags:
   *   name: current
   *   description: The current media info API
   * components:
   *   schemas:
   *     MediaInfo:
   *       type: object
   *       properties:
   *         title:
   *           type: string
   *         artists:
   *           type: string
   *         album:
   *           type: string
   *         icon:
   *           type: string
   *           format: uri
   *         playingFrom:
   *           type: string
   *         status:
   *           type: string
   *         url:
   *           type: string
   *           format: uri
   *         current:
   *           type: string
   *         currentInSeconds:
   *           type: integer
   *         duration:
   *           type: string
   *         durationInSeconds:
   *           type: integer
   *         image:
   *           type: string
   *           format: uri
   *         favorite:
   *           type: boolean
   *         player:
   *           type: object
   *           properties:
   *             status:
   *               type: string
   *             shuffle:
   *               type: boolean
   *             repeat:
   *               type: string
   *         artist:
   *           type: string
   *       example:
   *         title: "Sample Title"
   *         artists: "Sample Artist"
   *         album: "Sample Album"
   *         icon: "/path/to/sample/icon.jpg"
   *         playingFrom: "Sample Playlist"
   *         status: "playing"
   *         url: "https://tidal.com/browse/track/sample"
   *         current: "1:23"
   *         currentInSeconds: 83
   *         duration: "3:45"
   *         durationInSeconds: 225
   *         image: "https://example.com/sample-image.jpg"
   *         favorite: true
   *         player:
   *           status: "playing"
   *           shuffle: true
   *           repeat: "one"
   *         artist: "Sample Artist"
   */

  /**
   * @swagger
   * /current:
   *   get:
   *     summary: Get current media info
   *     tags: [current]
   *     responses:
   *       200:
   *         description: Current media info
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MediaInfo'
   */
  expressApp.get("/current", (req, res) => res.json({ ...mediaInfo, artist: mediaInfo.artists }));

  /**
   * @swagger
   * /current/image:
   *   get:
   *     summary: Get current media image
   *     tags: [current]
   *     responses:
   *       200:
   *         description: Current media image
   *         content:
   *           image/png:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Not found
   */
  expressApp.get("/current/image", getCurrentImage);
};

export const getCurrentImage = (req: Request, res: Response) => {
  const stream = fs.createReadStream(mediaInfo.icon);
  stream.on("open", function () {
    res.set("Content-Type", "image/png");
    stream.pipe(res);
  });
  stream.on("error", function () {
    res.set("Content-Type", "text/plain");
    res.status(404).end("Not found");
  });
};
