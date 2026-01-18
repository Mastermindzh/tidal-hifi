export interface SeekEvent {
  seconds: number;
  type: "relative" | "absolute";
}

export function isSeekEvent(value: unknown): value is SeekEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as any).seconds === "number" &&
    "type" in value &&
    typeof (value as any).type === "string" &&
    ((value as any).type === "relative" || (value as any).type === "absolute")
  );
}
