import { IpcMain, ipcRenderer, ipcMain } from "electron";
import { globalEvents } from "../constants/globalEvents";

export class Logger {
  /**
   * Subscribe to watch for logs from the IPC client
   * @param ipcMain main thread IPC client so we can subscribe to events
   */
  public static watch(ipcMain: IpcMain) {
    ipcMain.on(globalEvents.log, (event, message) => {
      const { content, object } = message;
      this.logToSTDOut(content, object);
    });
  }
  /**
   * Log content to STDOut
   * @param content
   * @param object js(on) object that will be prettyPrinted
   */
  public static log(content: string, object: object = {}) {
    if (ipcRenderer) {
      ipcRenderer.send(globalEvents.log, { content, object });
    } else {
      ipcMain.emit(globalEvents.log, { content, object });
    }
    this.logToSTDOut(content, object);
  }

  /**
   * Log content to STDOut and use the provided alert function to alert
   * @param content
   * @param object js(on) object that will be prettyPrinted
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static alert(content: string, object: any = {}, alert?: (msg: string) => void) {
    Logger.log(content, object);
    if (alert) {
      alert(`${content} \n\nwith details: \n${JSON.stringify(object, null, 2)}`);
    }
  }

  /**
   * Log to STDOut
   * @param content
   * @param object
   */
  private static logToSTDOut(content: string, object = {}) {
    console.log(content, Object.keys(object).length > 0 ? JSON.stringify(object, null, 2) : "");
  }
}
