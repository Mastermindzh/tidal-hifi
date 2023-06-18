import fs from "fs";
import request from "request";

/**
 * download and save a file
 * @param {string} fileUrl url to download
 * @param {string} targetPath path to save it at
 */
export const downloadFile = function (fileUrl: string, targetPath: string) {
  return new Promise((resolve, reject) => {
    const req = request({
      method: "GET",
      uri: fileUrl,
    });

    const out = fs.createWriteStream(targetPath);
    req.pipe(out);

    req.on("end", resolve);

    req.on("error", reject);
  });
};
