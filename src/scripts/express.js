const express = require("express");
const { mediaInfo } = require("./mediaInfo");
const { store, settings } = require("./settings");
const globalEvents = require("./../constants/globalEvents");
const statuses = require("./../constants/statuses");
const expressModule = {};
const fs = require("fs");

let expressInstance;

/**
 * Function to enable tidal-hifi's express api
 */
expressModule.run = function(mainWindow) {
  /**
   * Shorthand to handle a fire and forget global event
   * @param {*} res
   * @param {*} action
   */
  function handleGlobalEvent(res, action) {
    mainWindow.webContents.send("globalEvent", action);
    res.sendStatus(200);
  }

  const expressApp = express();
  expressApp.get("/", (req, res) => res.send("Hello World!"));
  expressApp.get("/current", (req, res) => res.json(mediaInfo));
  expressApp.get("/image", (req, res) => {
    var stream = fs.createReadStream(mediaInfo.icon);
    stream.on("open", function() {
      res.set("Content-Type", "image/png");
      stream.pipe(res);
    });
    stream.on("error", function() {
      res.set("Content-Type", "text/plain");
      res.status(404).end("Not found");
    });
  });

  if (store.get(settings.playBackControl)) {
    expressApp.get("/play", (req, res) => handleGlobalEvent(res, globalEvents.play));
    expressApp.get("/pause", (req, res) => handleGlobalEvent(res, globalEvents.pause));
    expressApp.get("/next", (req, res) => handleGlobalEvent(res, globalEvents.next));
    expressApp.get("/previous", (req, res) => handleGlobalEvent(res, globalEvents.previous));
    expressApp.get("/playpause", (req, res) => {
      if (mediaInfo.status == statuses.playing) {
        handleGlobalEvent(res, globalEvents.pause);
      } else {
        handleGlobalEvent(res, globalEvents.play);
      }
    });
  }
  if (store.get(settings.api)) {
    let port = store.get(settings.apiSettings.port);

    expressInstance = expressApp.listen(port, () => {});
    expressInstance.on("error", function(e) {
      let message = e.code;
      if (e.code === "EADDRINUSE") {
        message = `Port ${port} in use.`;
      }
      const { dialog } = require("electron");
      dialog.showErrorBox("Api failed to start.", message);
    });
  } else {
    expressInstance = undefined;
  }
};

module.exports = expressModule;
