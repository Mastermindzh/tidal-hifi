export const RepeatState = {
  off: "off",
  single: "single",
  all: "all",
} as const;

export type RepeatStateType = keyof typeof RepeatState;
