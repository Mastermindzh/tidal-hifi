import path from "node:path";
import express, { type Router } from "express";

import { settings } from "../../../constants/settings";
import { settingsStore } from "../../../scripts/settingsStore";

/**
 * Serves the mobile remote control web player.
 * The static assets live in `src/features/api/web` and are copied to
 * `ts-dist/features/api/web` by the `copy-files` build step.
 */
export const addRemoteControl = (expressApp: Router) => {
  if (!settingsStore.get(settings.apiSettings.remote)) {
    return;
  }

  const webDir = path.join(__dirname, "..", "web");

  expressApp.use("/remote", express.static(webDir));
  expressApp.get("/remote", (_req, res) => {
    res.sendFile(path.join(webDir, "remote.html"));
  });
};
