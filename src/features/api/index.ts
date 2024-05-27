import { BrowserWindow, dialog } from "electron";
import express from "express";
import swaggerSpec from "./swagger.json";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { settingsStore } from "../../scripts/settings";
import { settings } from "./../../constants/settings";
import { addCurrentInfo } from "./features/current";
import { addPlaybackControl } from "./features/player";
import { addSettingsAPI } from "./features/settings/settings";
import { addLegacyApi } from "./legacy";

/**
 * Function to enable TIDAL Hi-Fi's express api
 */
export const startApi = (mainWindow: BrowserWindow) => {
  const port = settingsStore.get<string, number>(settings.apiSettings.port);

  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  expressApp.get("/", (req, res) => res.send("Hello World!"));
  expressApp.get("/swagger.json", (req, res) => res.json(swaggerSpec));

  // add features
  addLegacyApi(expressApp, mainWindow);
  addPlaybackControl(expressApp, mainWindow);
  addCurrentInfo(expressApp);
  addSettingsAPI(expressApp, mainWindow);

  const expressInstance = expressApp.listen(port, "127.0.0.1");
  expressInstance.on("error", function (e: { code: string }) {
    let message = e.code;
    if (e.code === "EADDRINUSE") {
      message = `Port ${port} in use.`;
    }

    dialog.showErrorBox("Api failed to start.", message);
  });
};
