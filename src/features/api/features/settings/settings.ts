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

export const addSettingsAPI = (expressApp: Router, mainWindow: BrowserWindow) => {
  expressApp.get("/settings/skipped-artists", (req, res) => {
    res.json(settingsStore.get<string, string[]>(settings.skippedArtists));
  });

  expressApp.post("/settings/skipped-artists", (req: Request<object, object, string[]>, res) => {
    addSkippedArtists(req.body);
    res.sendStatus(200);
  });

  expressApp.post(
    "/settings/skipped-artists/delete",
    (req: Request<object, object, string[]>, res) => {
      removeSkippedArtists(req.body);
      res.sendStatus(200);
    }
  );

  expressApp.post("/settings/skipped-artists/current", (req, res) => {
    addSkippedArtists([mediaInfo.artists]);
    mainWindow.webContents.send("globalEvent", globalEvents.next);
    res.sendStatus(200);
  });
  expressApp.delete("/settings/skipped-artists/current", (req, res) => {
    removeSkippedArtists([mediaInfo.artists]);
    res.sendStatus(200);
  });
};
