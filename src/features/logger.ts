import { IpcMain, IpcRenderer } from "electron";
import { globalEvents } from "../constants/globalEvents";

export class Logger {
  /**
   *
   * @param ipcRenderer renderer IPC client so we can send messages to the main thread
   */
  constructor(private ipcRenderer: IpcRenderer) {}

  /**
   * Subscribe to watch for logs from the IPC client
   * @param ipcMain main thread IPC client so we can subscribe to events
   */
  public static watch(ipcMain: IpcMain) {
    ipcMain.on(globalEvents.log, (event, content, object) => {
      console.log(content, JSON.stringify(object, null, 2));
    });
  }

  /**
   * Log content to STDOut
   * @param content
   * @param object js(on) object that will be prettyPrinted
   */
  public log(content: string, object: object = {}) {
    if (this.ipcRenderer) {
      this.ipcRenderer.send(globalEvents.log, { content, object });
    }
    console.log(`${content} \n ${JSON.stringify(object, null, 2)}`);
  }
}
