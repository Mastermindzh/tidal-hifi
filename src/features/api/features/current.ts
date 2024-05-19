import { Request, Response, Router } from "express";
import { getLegacyMediaInfo, mainTidalState } from "../../state";

export const addCurrentInfo = (expressApp: Router) => {
  expressApp.get("/current", (_, res) => res.json(getLegacyMediaInfo()));
  expressApp.get("/current/image", getCurrentImage);
};

export const getCurrentImage = (_: Request, res: Response) => {
  if (!mainTidalState.currentTrack) {
    res.sendStatus(404).end("No song is playing");
    return;
  }
  res.redirect(mainTidalState.currentTrack.image);
};
