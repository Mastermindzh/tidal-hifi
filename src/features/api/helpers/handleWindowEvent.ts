import type { BrowserWindow } from "electron";
import type { Response } from "express";

/**
 * Shorthand to handle a fire and forget global event
 */
export const handleWindowEvent =
  (mainWindow: BrowserWindow) => (res: Response, action: string, payload?: object) => {
    mainWindow.webContents.send("globalEvent", action, payload);
    res.sendStatus(200);
  };
