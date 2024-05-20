import { BrowserWindow, dialog } from "electron";
import express from "express";
import swaggerjsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { settingsStore } from "../../scripts/settings";
import { settings } from "./../../constants/settings";
import { addCurrentInfo } from "./features/current";
import { addPlaybackControl } from "./features/player";
import { addSettingsAPI } from "./features/settings/settings";
import { addLegacyApi } from "./legacy";
import cors from "cors";

/**
 * Function to enable TIDAL Hi-Fi's express api
 */
export const startApi = (mainWindow: BrowserWindow) => {
  const port = settingsStore.get<string, number>(settings.apiSettings.port);
  const specs = swaggerjsdoc({
    definition: {
      openapi: "3.1.0",
      info: {
        title: "TIDAL Hi-Fi API",
        version: "5.13.0",
        description: "",
        license: {
          name: "MIT",
          url: "https://github.com/Mastermindzh/tidal-hifi/blob/master/LICENSE",
        },
        contact: {
          name: "Rick <mastermindzh> van Lieshout",
          url: "https://www.rickvanlieshout.com",
        },
      },
      servers: [
        {
          url: `http://localhost:${port}`,
        },
      ],
      externalDocs: {
        description: "swagger.json",
        url: "swagger.json",
      },
    },
    apis: ["**/*.ts"],
  });

  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));
  expressApp.get("/", (req, res) => res.send("Hello World!"));
  expressApp.get("/swagger.json", (req, res) => res.json(specs));

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
