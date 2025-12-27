import { downloadFile } from "../../scripts/download";
import { Logger } from "../logger";

export const downloadImage = async (imagePath: string, destination: string): Promise<string> => {
  if (imagePath.startsWith("http")) {
    try {
      return await downloadFile(imagePath, destination);
    } catch (error) {
      Logger.log("Downloading file failed", { error });
      return "";
    }
  }

  return "";
};
