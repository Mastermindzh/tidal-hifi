import { BrowserWindow } from "electron";
import { Response } from "express";

/**
 * Shorthand to handle a fire and forget global event
 * @param {*} res
 * @param {*} action
 */
export const handleWindowEvent = (mainWindow: BrowserWindow) => (res: Response, action: string) => {
  mainWindow.webContents.send("globalEvent", action);
  res.sendStatus(200);
};
