import { ipcRenderer, clipboard } from "electron";
import { Notification, dialog } from "@electron/remote";
import { addHotkey } from "../../scripts/hotkeys";
import { globalEvents } from "../../constants/globalEvents";
import { settingsStore } from "../../scripts/settings";
import { settings } from "../../constants/settings";
import { $tidalState, favoriteCurrentTrack, reduxStore, toggleRepeat } from "../state";
import { Songwhip } from "../../features/songwhip/songwhip";

/**
 * Add hotkeys for when tidal is focused
 * Reflects the desktop hotkeys found on:
 * https://defkey.com/tidal-desktop-shortcuts
 */
if (settingsStore.get(settings.enableCustomHotkeys)) {
  addHotkey("Control+l", handleLogout);

  addHotkey("Control+a", favoriteCurrentTrack);

  addHotkey("Control+h", () => {
    if (!reduxStore) return;
    reduxStore.dispatch({
      type: "ROUTER_PUSH",
      payload: {
        pathname: "/",
        options: {},
        hash: "",
      },
    });
  });

  addHotkey("backspace", () => {
    if (!reduxStore) return;
    reduxStore.dispatch({ type: "ROUTER_GO_BACK" });
  });

  addHotkey("shift+backspace", () => {
    if (!reduxStore) return;
    reduxStore.dispatch({ type: "ROUTER_GO_FORWARD" });
  });

  addHotkey("control+u", () => {
    // reloading window without cache should show the update bar if applicable
    window.location.reload();
  });

  addHotkey("control+r", toggleRepeat);
  addHotkey("control+w", async () => {
    const trackUrl = $tidalState.getState().currentTrack?.url;
    if (!trackUrl) return;
    const result = await ipcRenderer.invoke(globalEvents.whip, trackUrl);
    const url = Songwhip.getWhipUrl(result);
    clipboard.writeText(url);
    new Notification({
      title: `Successfully whipped: `,
      body: `URL copied to clipboard: ${url}`,
    }).show();
  });
}

// always add the hotkey for the settings window
addHotkey("control+=", function () {
  ipcRenderer.send(globalEvents.showSettings);
});
addHotkey("control+0", function () {
  ipcRenderer.send(globalEvents.showSettings);
});

/**
 * This function will ask the user whether he/she wants to log out.
 * It will log the user out if he/she selects "yes"
 */
function handleLogout() {
  const logoutOptions = ["Cancel", "Yes, please", "No, thanks"];

  dialog
    .showMessageBox(null, {
      type: "question",
      title: "Logging out",
      message: "Are you sure you want to log out?",
      buttons: logoutOptions,
      defaultId: 2,
    })
    .then((result: { response: number }) => {
      if (logoutOptions.indexOf("Yes, please") === result.response) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key.startsWith("_TIDAL_activeSession")) {
            window.localStorage.removeItem(key);
            break;
          }
        }
        window.location.reload();
      }
    });
}
