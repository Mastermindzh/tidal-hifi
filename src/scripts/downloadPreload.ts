import { ipcRenderer } from "electron";
import { globalEvents } from "../constants/globalEvents";

/**
 * download and save a file (renderer version)
 * @param {string} fileUrl url to download
 * @param {string} targetPath path to save it at
 */
export const downloadFile = function (fileUrl: string, targetPath: string) {
  return new Promise<void>((resolve, reject) => {
    const handler = (event: Electron.IpcRendererEvent, newFileUrl: string, newTargetPath: string, error: boolean) => {
      // it's possible for 2 requests to be running at the same time, so make sure it is the right one
      // if there is 2 requests with the same fileUrl and targetPath, then it doesn't matter which one we intercept because the data is the same
      if (fileUrl === newFileUrl && targetPath === newTargetPath) {
        ipcRenderer.removeListener(globalEvents.axiosReply, handler);
        if (error) reject();
        else resolve();
      }
    }
    ipcRenderer.on(globalEvents.axiosReply, handler);
    ipcRenderer.send(globalEvents.axios, fileUrl, targetPath);
  });
};
