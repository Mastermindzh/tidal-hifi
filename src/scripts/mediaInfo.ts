import { TidalState } from "../models/tidalState";

// This object is globally mutated
export const tidalState: TidalState = {
  status: "Stopped",
  repeat: "Off",
  shuffle: false,
};
