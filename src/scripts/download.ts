import { createWriteStream } from "node:fs";
import http from "node:http";
import https from "node:https";

/**
 * Download and save a file
 * @param fileUrl url to download
 * @param targetPath path to save it at
 * @returns the targetPath on success
 */
export const downloadFile = (fileUrl: string, targetPath: string): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const client = fileUrl.startsWith("https") ? https : http;
    client
      .get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${fileUrl}`));
          return;
        }

        const out = createWriteStream(targetPath);
        response.pipe(out);
        out.on("finish", () => {
          out.close(() => resolve(targetPath));
        });
        out.on("error", (err) => {
          out.close();
          reject(err);
        });
      })
      .on("error", reject);
  });
