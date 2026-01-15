import type { BrowserWindow } from "electron";
import type { Response } from "express";

/**
 * Shorthand to handle a fire and forget global event
 * @param {*} res
 * @param {*} action
 */
export const handleWindowEvent = (mainWindow: BrowserWindow) => (res: Response, action: string) => {
  mainWindow.webContents.send("globalEvent", action);
  res.sendStatus(200);
};
