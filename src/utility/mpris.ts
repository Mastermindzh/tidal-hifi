import { RepeatState, type RepeatStateType } from "../models/repeatState";

// State map
export const MPRIS_LOOP = {
  None: RepeatState.off,
  Track: RepeatState.single,
  Playlist: RepeatState.all,
} as const;

// Types
export type MprisLoopType = keyof typeof MPRIS_LOOP;

export type MprisPositionType = { trackId: string; position: number };

// TypeGuards
export function isMPRISLoop(value: unknown): value is MprisLoopType {
  return typeof value === "string" && value in MPRIS_LOOP;
}

export function isMPRISShuffle(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isMPRISVolume(value: unknown): value is number {
  return typeof value === "number";
}

export function isMPRISPosition(value: unknown): value is MprisPositionType {
  return (
    typeof value === "object" &&
    value !== null &&
    "trackId" in value &&
    typeof value.trackId === "string" &&
    "position" in value &&
    typeof value.position === "number"
  );
}

// Converters
export function convertMprisLoopToRepeatState(mprisState: MprisLoopType): RepeatStateType {
  return MPRIS_LOOP[mprisState];
}

export function convertRepeatStateToMprisLoop(tidalState: RepeatStateType): MprisLoopType {
  const mprisState = Object.entries(MPRIS_LOOP).find(([, value]) => value === tidalState)?.[0];
  return isMPRISLoop(mprisState) ? mprisState : null;
}
