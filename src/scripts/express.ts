import { BrowserWindow, dialog } from "electron";
import express, { Response } from "express";
import fs from "fs";
import { settings } from "../constants/settings";
import { MediaStatus } from "../models/mediaStatus";
import { globalEvents } from "./../constants/globalEvents";
import { mediaInfo } from "./mediaInfo";
import { settingsStore } from "./settings";

/**
 * Function to enable TIDAL Hi-Fi's express api
 */

// expressModule.run = function (mainWindow)
export const startExpress = (mainWindow: BrowserWindow) => {
  /**
   * Shorthand to handle a fire and forget global event
   * @param {*} res
   * @param {*} action
   */
  function handleGlobalEvent(res: Response, action: string) {
    mainWindow.webContents.send("globalEvent", action);
    res.sendStatus(200);
  }

  const expressApp = express();
  expressApp.get("/", (req, res) => res.send("Hello World!"));
  expressApp.get("/current", (req, res) => res.json({ ...mediaInfo, artist: mediaInfo.artists }));
  expressApp.get("/image", (req, res) => {
    const stream = fs.createReadStream(mediaInfo.icon);
    stream.on("open", function () {
      res.set("Content-Type", "image/png");
      stream.pipe(res);
    });
    stream.on("error", function () {
      res.set("Content-Type", "text/plain");
      res.status(404).end("Not found");
    });
  });

  if (settingsStore.get(settings.playBackControl)) {
    expressApp.get("/play", (req, res) => handleGlobalEvent(res, globalEvents.play));
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

  const port = settingsStore.get<string, number>(settings.apiSettings.port);

  const expressInstance = expressApp.listen(port, "127.0.0.1");
  expressInstance.on("error", function (e: { code: string }) {
    let message = e.code;
    if (e.code === "EADDRINUSE") {
      message = `Port ${port} in use.`;
    }

    dialog.showErrorBox("Api failed to start.", message);
  });
};
