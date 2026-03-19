import type { BrowserWindow } from "electron";

import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";

/**
 * Workaround for Electron < 40.8.1 regression
 *
 * This manually handles Alt key press/release on the main-process side
 * (via `before-input-event`) and toggles the menu bar visibility.
 *
 * When the menu is shown we temporarily disable `autoHideMenuBar` so
 * Electron doesn't immediately hide it again. The menu is dismissed on
 * a second Alt press, Escape, or any mouse click inside the web contents.
 */
export function addAltKeyMenuBarHandler(mainWindow: BrowserWindow) {
  let altKeyDown = false;
  let menuBarShown = false;

  function showMenuBar() {
    mainWindow.setAutoHideMenuBar(false);
    mainWindow.setMenuBarVisibility(true);
    menuBarShown = true;
  }

  function hideMenuBar() {
    mainWindow.setAutoHideMenuBar(true);
    mainWindow.setMenuBarVisibility(false);
    menuBarShown = false;
  }

  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (
      input.key === "Alt" &&
      input.type === "keyDown" &&
      !input.shift &&
      !input.control &&
      !input.meta
    ) {
      altKeyDown = true;
    } else if (input.key === "Alt" && input.type === "keyUp") {
      if (menuBarShown) {
        hideMenuBar();
      } else if (
        altKeyDown &&
        !settingsStore.get(settings.menuBar) &&
        !settingsStore.get(settings.disableAltMenuBar)
      ) {
        showMenuBar();
      }
      altKeyDown = false;
    } else if (input.type === "keyDown") {
      altKeyDown = false;
      if (menuBarShown && input.key === "Escape") {
        hideMenuBar();
      }
    }
  });

  // Clicks inside the page should also dismiss the menu bar
  mainWindow.webContents.on("input-event", (_event, input) => {
    if (menuBarShown && input.type === "mouseDown") {
      hideMenuBar();
    }
  });
}
