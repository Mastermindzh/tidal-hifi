import { getPlayMediaPath, type PlayMediaRequest } from "../../models/playableMedia";
import { UI_SELECTORS } from "./constants";

const TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 250;

/** Only the latest request presses play; older ones stop waiting (last request wins). */
let latestRequestId = 0;

/**
 * Tidal shows a track on its album page (`/album/{albumId}/track/{id}`), so play the track's row
 * instead of the page-level play button, which would play the whole album.
 */
function findPlayButton(request: PlayMediaRequest): HTMLElement | null {
  const selector =
    request.type === "track"
      ? `${UI_SELECTORS.tracklist_row}[data-track-id="${CSS.escape(request.id)}"] ${UI_SELECTORS.rowPlay}`
      : UI_SELECTORS.pagePlay;
  return globalThis.document.querySelector<HTMLElement>(selector);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start playback of a track, album or playlist by navigating to its page and pressing play.
 */
export async function playMediaViaDom(request: PlayMediaRequest): Promise<void> {
  const requestId = ++latestRequestId;
  const path = getPlayMediaPath(request);
  const isOnPage = () => globalThis.location.pathname.endsWith(path);
  const alreadyOnPage = isOnPage();
  const previousButton = findPlayButton(request);

  if (!alreadyOnPage) {
    // Navigate within the SPA; a full load would reset the preload script and controller.
    globalThis.history.pushState({}, "", path);
    globalThis.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (requestId !== latestRequestId) return;

    const button = findPlayButton(request);
    // Until the new page renders, the page-level play button still belongs to the previous page.
    const isNewButton = alreadyOnPage || request.type === "track" || button !== previousButton;
    if (button && isOnPage() && isNewButton) {
      button.click();
      return;
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for the play button of ${path}`);
}
