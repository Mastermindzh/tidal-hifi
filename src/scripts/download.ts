import fs from "node:fs";
import request from "request";

/**
 * download and save a file
 * @param {string} fileUrl url to download
 * @param {string} targetPath path to save it at
 */
export const downloadFile = (fileUrl: string, targetPath: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const req = request({
      method: "GET",
      uri: fileUrl,
    });

    const out = fs.createWriteStream(targetPath);
    req.pipe(out);

    req.on("end", () => {
      resolve(targetPath);
    });

    req.on("error", reject);
  });
