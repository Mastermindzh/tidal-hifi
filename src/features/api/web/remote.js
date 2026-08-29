/** Shorthand for document.getElementById. */
const getById = (id) => document.getElementById(id);

/** Format a number of seconds as "m:ss". */
const formatTimestampFromSeconds = (seconds) => {
  seconds = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, "0")}`;
};

/** Paint a range input's filled portion via the --fill CSS variable. */
const setFill = (el) => {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty("--fill", `${pct}%`);
};

/** Reflect an on/off state on a toggle button. */
const toggleBtn = (btn, on) => {
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", String(on));
};

/** Ignore polled values for a small duration so that server-side changes don't overwrite
 * what a user just changed. This can happen if the user presses "repeat" right before a poll call
 * would write the dom. Then the optimistic rendering of the button would be overwritten by the (now old) server value.
 */
const hold = (key, ms = 1200) => {
  holdUntil[key] = Date.now() + ms;
};

/** Whether a field is currently within its hold window. */
const holding = (key) => Date.now() < holdUntil[key];

/** Fire-and-forget request that logs failures instead of throwing. */
const request = (method, path) =>
  fetch(path, { method }).catch((error) => {
    console.error(`Remote API request failed: ${method} ${path}`, error);
  });

/** Media API client. One method per endpoint so handlers stay declarative. */
const api = {
  getCurrent: () =>
    fetch("/current", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch((error) => {
        console.error("Remote API request failed: GET /current", error);
        return null;
      }),
  playPause: () => request("POST", "/player/playpause"),
  next: () => request("POST", "/player/next"),
  previous: () => request("POST", "/player/previous"),
  toggleFavorite: () => request("POST", "/player/favorite/toggle"),
  toggleShuffle: () => request("POST", "/player/shuffle/toggle"),
  toggleRepeat: () => request("POST", "/player/repeat/toggle"),
  setVolume: (level) => request("PUT", `/player/volume?volume=${level}`),
  seekTo: (seconds) => request("PUT", `/player/seek/absolute?seconds=${seconds}`),
};

/** Paint the current state onto the DOM. */
function render() {
  const seek = getById("seek");
  seek.max = Math.max(state.duration, 1);
  if (!state.scrubbing) seek.value = Math.min(state.position, seek.max);
  setFill(seek);
  getById("current").textContent = formatTimestampFromSeconds(
    state.scrubbing ? seek.value : state.position,
  );
  getById("duration").textContent = formatTimestampFromSeconds(state.duration);

  getById("playIcon").innerHTML = state.playing ? PAUSE_ICON : PLAY_ICON;

  toggleBtn(getById("shuffle"), state.shuffle);
  toggleBtn(getById("favorite"), state.favorite);
  toggleBtn(getById("repeat"), state.repeat !== "off");
  getById("repeatWrap").classList.toggle("one", state.repeat === "single");

  setFill(getById("volume"));
}

/** Merge a GET /current payload into local state, respecting active holds. */
function updateLocalState(currentInfo) {
  state.online = true;
  getById("player").classList.remove("offline");

  state.duration = currentInfo.durationInSeconds || 0;
  if (!holding("playing")) {
    state.playing = (currentInfo.status || currentInfo.player?.status) === "playing";
  }
  if (!holding("favorite")) state.favorite = !!currentInfo.favorite;
  if (!holding("shuffle")) state.shuffle = !!currentInfo.player?.shuffle;
  if (!holding("repeat")) state.repeat = currentInfo.player?.repeat || "off";
  if (!state.scrubbing && !holding("seek")) {
    state.position = currentInfo.currentInSeconds || 0;
  }

  getById("title").textContent = currentInfo.title || "Nothing playing";
  getById("artist").textContent = currentInfo.artists || "";
  getById("album").textContent = currentInfo.album || "";
  getById("playingFrom").textContent = currentInfo.playingFrom || "TIDAL";

  const badge = currentInfo.audioQuality?.badgeText || currentInfo.audioQuality?.quality || "";
  getById("quality").textContent = badge;
  getById("quality").style.display = badge ? "" : "none";

  // Refresh art only when the track changes to avoid flicker.
  const key = `${currentInfo.title || ""}|${currentInfo.artists || ""}`;
  if (key !== state.artKey) {
    state.artKey = key;
    getById("art").src = `/current/image?ts=${encodeURIComponent(key)}`;
  }

  if (!holding("volume") && typeof currentInfo.volume === "number") {
    getById("volume").value = Math.round(currentInfo.volume * 100);
  }

  render();
}

/** Fetch current media info and update the UI, or show the offline state. */
async function poll() {
  const info = await api.getCurrent();
  if (info) {
    updateLocalState(info);
  } else {
    state.online = false;
    getById("player").classList.add("offline");
    getById("playingFrom").textContent = "Reconnecting…";
  }
}

const POLL_MS = 1000;

// Repeat cycles off -> all -> single server-side; mirror that optimistically.
const REPEAT_ORDER = ["off", "all", "single"];

// SVG path markup swapped into #playIcon depending on playback state.
const PLAY_ICON = '<path d="M8 5v14l11-7L8 5z"/>';
const PAUSE_ICON = '<path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/>';

/** Locally held player state, seeded from GET /current on every poll. */
const state = {
  playing: false,
  position: 0,
  duration: 0,
  favorite: false,
  shuffle: false,
  repeat: "off",
  scrubbing: false,
  artKey: "",
  online: false,
};

/** Per-field timestamps until which polls must not overwrite optimistic updates. */
const holdUntil = { seek: 0, volume: 0, playing: 0, favorite: 0, shuffle: 0, repeat: 0 };

const seek = getById("seek");
const volume = getById("volume");
let volumeTimer = null;

getById("playpause").addEventListener("click", () => {
  state.playing = !state.playing;
  hold("playing");
  render();
  api.playPause();
});
getById("next").addEventListener("click", () => api.next());
getById("prev").addEventListener("click", () => api.previous());
getById("favorite").addEventListener("click", () => {
  state.favorite = !state.favorite;
  hold("favorite");
  render();
  api.toggleFavorite();
});
getById("shuffle").addEventListener("click", () => {
  state.shuffle = !state.shuffle;
  hold("shuffle");
  render();
  api.toggleShuffle();
});
getById("repeat").addEventListener("click", () => {
  state.repeat = REPEAT_ORDER[(REPEAT_ORDER.indexOf(state.repeat) + 1) % REPEAT_ORDER.length];
  hold("repeat");
  render();
  api.toggleRepeat();
});

seek.addEventListener("input", () => {
  state.scrubbing = true;
  state.position = Number(seek.value);
  render();
});
seek.addEventListener("change", () => {
  const seconds = Number(seek.value);
  state.scrubbing = false;
  state.position = seconds;
  hold("seek");
  render();
  api.seekTo(seconds);
});

volume.addEventListener("input", () => {
  setFill(volume);
  hold("volume");
  if (volumeTimer) return;
  volumeTimer = setTimeout(() => {
    volumeTimer = null;
    api.setVolume(Number(volume.value) / 100);
  }, 150);
});
volume.addEventListener("change", () => {
  hold("volume");
  api.setVolume(Number(volume.value) / 100);
});

// Advance the scrubber locally between server polls.
setInterval(() => {
  if (state.online && state.playing && !state.scrubbing) {
    state.position = Math.min(state.position + 1, state.duration || state.position + 1);
    render();
  }
}, 1000);

setInterval(poll, POLL_MS);
poll();
