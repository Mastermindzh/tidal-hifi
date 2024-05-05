import { Request, Response, Router } from "express";
import fs from "fs";
import { mediaInfo } from "../../../scripts/mediaInfo";

export const addCurrentInfo = (expressApp: Router) => {
  expressApp.get("/current", (req, res) => res.json({ ...mediaInfo, artist: mediaInfo.artists }));
  expressApp.get("/current/image", getCurrentImage);
};

export const getCurrentImage = (req: Request, res: Response) => {
  const stream = fs.createReadStream(mediaInfo.icon);
  stream.on("open", function () {
    res.set("Content-Type", "image/png");
    stream.pipe(res);
  });
  stream.on("error", function () {
    res.set("Content-Type", "text/plain");
    res.status(404).end("Not found");
  });
};
