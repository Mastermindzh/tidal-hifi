const express = require("express");
const { mediaInfo } = require("./mediaInfo");
const settingsModule = require("./settings");
const globalEvents = require("./../constants/globalEvents");
const expressModule = {};
var fs = require("fs");

expressModule.run = function(mainWindow) {
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

  expressApp.listen(settingsModule.settings.apiSettings.port, () => {});
};

module.exports = expressModule;
