import fs from "fs";
import axios from "axios";

/**
 * download and save a file
 * @param {string} fileUrl url to download
 * @param {string} targetPath path to save it at
 */
export const downloadFile = function (fileUrl: string, targetPath: string) {
  return new Promise((resolve, reject) => {
    axios
      .get(fileUrl, {
        responseType: "stream",
      })
      .then((req) => {
        const out = fs.createWriteStream(targetPath);

        req.data.pipe(out);

        out.on("finish", resolve);

        out.on("error", reject);
      })
      .catch(reject);
  });
};
