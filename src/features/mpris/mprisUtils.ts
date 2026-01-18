import { RepeatState, type RepeatStateType } from "../../models/repeatState";

// State map
export const MPRIS_LOOP = {
  None: RepeatState.off,
  Track: RepeatState.single,
  Playlist: RepeatState.all,
} as const;

// Types
export type MprisLoopType = keyof typeof MPRIS_LOOP;

// Converters
export function convertMprisLoopToRepeatState(mprisState: MprisLoopType): RepeatStateType {
  return MPRIS_LOOP[mprisState];
}

export function convertRepeatStateToMprisLoop(tidalState: RepeatStateType): MprisLoopType | null {
  const mprisState = Object.entries(MPRIS_LOOP).find(([, value]) => value === tidalState)?.[0];
  return typeof mprisState === "string" && mprisState in MPRIS_LOOP
    ? (mprisState as MprisLoopType)
    : null;
}
