import { BrowserWindow, dialog } from "electron";
import express from "express";
import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { addCurrentInfo } from "./features/current";
import { addPlaybackControl } from "./features/player";
import { addSettingsAPI } from "./features/settings/settings";
import { addLegacyApi } from "./legacy";

/**
 * Function to enable TIDAL Hi-Fi's express api
 */
export const startApi = (mainWindow: BrowserWindow) => {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.get("/", (req, res) => res.send("Hello World!"));

  // add features
  addLegacyApi(expressApp, mainWindow);
  addPlaybackControl(expressApp, mainWindow);
  addCurrentInfo(expressApp);
  addSettingsAPI(expressApp, mainWindow);

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
