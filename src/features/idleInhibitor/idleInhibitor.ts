import { PowerSaveBlocker, powerSaveBlocker } from "electron";
import { Logger } from "../logger";

/**
 * Start blocking idle/screen timeouts
 * @param blocker optional instance of the powerSaveBlocker to use
 * @returns id of current block
 */
export const acquireInhibitor = (blocker?: PowerSaveBlocker): number => {
  const currentBlocker = blocker ?? powerSaveBlocker;
  const blockId = currentBlocker.start("prevent-app-suspension");
  Logger.log(`Started preventing app suspension with id: ${blockId}`);
  return blockId;
};

/**
 * Check whether there is a blocker active for the current id, if not start it.
 * @param id id of inhibitor you want to check activity against
 * @param blocker optional instance of the powerSaveBlocker to use
 */
export const acquireInhibitorIfInactive = (id: number, blocker?: PowerSaveBlocker): number => {
  const currentBlocker = blocker ?? powerSaveBlocker;
  if (!isInhibitorActive(id, currentBlocker)) {
    return acquireInhibitor();
  }

  return id;
};

/**
 * stop blocking idle/screen timeouts
 * @param id id of inhibitor you want to check activity against
 * @param blocker optional instance of the powerSaveBlocker to use
 */
export const releaseInhibitor = (id: number, blocker?: PowerSaveBlocker) => {
  try {
    const currentBlocker = blocker ?? powerSaveBlocker;
    currentBlocker.stop(id);
    Logger.log(`Released inhibitor with id: ${id}`);
  } catch (error) {
    Logger.log("Releasing inhibitor failed");
  }
};

/**
 * stop blocking idle/screen timeouts if a inhibitor is active
 * @param id id of inhibitor you want to check activity against
 * @param blocker optional instance of the powerSaveBlocker to use
 */
export const releaseInhibitorIfActive = (id: number, blocker?: PowerSaveBlocker) => {
  const currentBlocker = blocker ?? powerSaveBlocker;
  if (isInhibitorActive(id, currentBlocker)) {
    releaseInhibitor(id, currentBlocker);
  }
};

/**
 * check whether the inhibitor is active
 * @param id id of inhibitor you want to check activity against
 * @param blocker optional instance of the powerSaveBlocker to use
 */
export const isInhibitorActive = (id: number, blocker?: PowerSaveBlocker) => {
  const currentBlocker = blocker ?? powerSaveBlocker;
  return currentBlocker.isStarted(id);
};
