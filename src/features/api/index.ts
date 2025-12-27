import cors from "cors";
import { BrowserWindow, dialog } from "electron";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { settingsStore } from "../../scripts/settings";
import { settings } from "./../../constants/settings";
import { addCurrentInfo } from "./features/current";
import { addHealthEndpoint } from "./features/health";
import { addPlaybackControl } from "./features/player";
import { addSettingsAPI } from "./features/settings/settings";
import { addLegacyApi } from "./legacy";
import swaggerSpec from "./swagger.json";

/**
 * Function to enable TIDAL Hi-Fi's express api
 */
export const startApi = (mainWindow: BrowserWindow) => {
  const port = settingsStore.get<string, number>(settings.apiSettings.port);
  const hostname = settingsStore.get<string, string>(settings.apiSettings.hostname) ?? "127.0.0.1";

  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  expressApp.get("/", (req, res) => {
    res.redirect("/docs");
  });
  expressApp.get("/swagger.json", (req, res) => {
    res.json(swaggerSpec);
  });

  // add features
  addHealthEndpoint(expressApp);
  addLegacyApi(expressApp, mainWindow);
  addPlaybackControl(expressApp, mainWindow);
  addCurrentInfo(expressApp);
  addSettingsAPI(expressApp, mainWindow);

  const expressInstance = expressApp.listen(port, hostname);
  expressInstance.on("error", function (e: { code: string }) {
    let message = e.code;
    if (e.code === "EADDRINUSE") {
      message = `Port ${port} in use.`;
    }

    dialog.showErrorBox("Api failed to start.", message);
  });
};
