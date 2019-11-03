const express = require("express");
const { mediaInfo } = require("./mediaInfo");
const { store, settings } = require("./settings");
const globalEvents = require("./../constants/globalEvents");
const statuses = require("./../constants/statuses");

const expressModule = {};
var fs = require("fs");

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

  expressApp.listen(store.get(settings.apiSettings.port), () => {});
};

module.exports = expressModule;
