const download = {};
const request = require("request");
const fs = require("fs");

/**
 * download and save a file
 * @param {*} fileUrl url to download
 * @param {*} targetPath path to save it at
 */
download.downloadFile = function(fileUrl, targetPath) {
  return new Promise((resolve, reject) => {
    var req = request({
      method: "GET",
      uri: fileUrl,
    });

    var out = fs.createWriteStream(targetPath);
    req.pipe(out);

    req.on("end", resolve);

    req.on("error", reject);
  });
};

module.exports = download;
