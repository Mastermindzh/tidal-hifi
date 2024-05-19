import { settingsStore } from "../../scripts/settings";
import { $tidalState, next } from "../state";
import { settings } from "../../constants/settings";

$tidalState.subscribe((state) => {
  // don't skip when paused, as it can cause a loop
  if (!state.currentTrack || state.status !== "Playing") return;
  if (!settingsStore.get(settings.skipArtists)) return;
  const artistsToSkip = settingsStore.get(settings.skippedArtists) as string[];
  if (artistsToSkip.length === 0) return;

  const shouldSkip = state.currentTrack?.artists.some((artist) => artistsToSkip.includes(artist));

  if (shouldSkip) next();
});
