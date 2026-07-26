import { ipcRenderer } from "electron";

import { globalEvents } from "../../constants/globalEvents";

const BAR_ID = "tidal-hifi-titlebar";
let titlebarObserver: MutationObserver | null = null;

const svgIcon = (paths: string): string =>
  `<svg viewBox="0 0 12 12" fill="none" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  minimize: svgIcon(
    '<line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  ),
  maximize: svgIcon(
    '<rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/>',
  ),
  close: svgIcon(
    '<line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  ),
};

const createButton = (
  label: string,
  icon: string,
  channel: string,
  extraClass = "",
): HTMLButtonElement => {
  const button = document.createElement("button");
  button.className = extraClass ? `thf-btn ${extraClass}` : "thf-btn";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  button.addEventListener("click", () => ipcRenderer.send(channel));
  return button;
};

const build = (): HTMLElement => {
  const bar = document.createElement("div");
  bar.id = BAR_ID;

  const isMac = process.platform === "darwin";
  if (isMac) {
    bar.classList.add("thf-macos");
  }

  const title = document.createElement("span");
  title.className = "thf-title";
  title.textContent = "TIDAL Hi-Fi";

  const controls = document.createElement("div");
  if (!isMac) {
    controls.className = "thf-controls";
    controls.append(
      createButton("Minimize", ICONS.minimize, globalEvents.titlebarMinimize),
      createButton("Maximize", ICONS.maximize, globalEvents.titlebarMaximizeToggle),
      createButton("Close", ICONS.close, globalEvents.titlebarClose, "thf-close"),
    );
    bar.append(title, controls);
  } else {
    bar.append(title);
  }

  // Double-clicking the drag area toggles maximize, matching native titlebars.
  bar.addEventListener("dblclick", (event) => {
    if (event.target instanceof Element && event.target.closest(".thf-controls")) return;
    if (process.platform !== "darwin") {
      ipcRenderer.send(globalEvents.titlebarMaximizeToggle);
    }
  });

  return bar;
};

const mount = (): void => {
  if (!document.body || document.getElementById(BAR_ID)) return;
  document.body.prepend(build());
};

/**
 * Build and mount the custom titlebar into the current page, re-mounting it if
 * Tidal's SPA hydration strips it out.
 *
 * This runs entirely in the preload's isolated world: the buttons call
 * `ipcRenderer` directly, so nothing is exposed to page scripts and there is no
 * `executeJavaScript` string evaluation. Styling is applied separately from the
 * main process (see titlebar.ts) so it survives DOM replacement.
 */
export const mountCustomTitlebar = (): void => {
  const start = () => {
    mount();
    // Tidal is a React SPA that re-renders <body>; re-mount if it's stripped out.
    if (!titlebarObserver && document.body) {
      titlebarObserver = new MutationObserver(() => {
        mount();
      });
      titlebarObserver.observe(document.body, { childList: true });
    }
  };

  if (document.body) {
    start();
  } else {
    window.addEventListener("DOMContentLoaded", start, { once: true });
  }
};

export const unmountCustomTitlebar = (): void => {
  titlebarObserver?.disconnect();
  titlebarObserver = null;
  document.getElementById(BAR_ID)?.remove();
};
