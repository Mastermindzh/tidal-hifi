import { WhippedResult } from "./models/whip";
import axios from "axios";

export class Songwhip {
  /**
   * Call the songwhip API and create a shareable songwhip page
   * @param currentUrl
   * @returns
   */
  public static async whip(currentUrl: string): Promise<WhippedResult> {
    try {
      const response = await axios.post("https://songwhip.com/api/songwhip/create", {
        url: currentUrl,
        // doesn't actually matter.. returns everything the same way anyway
        country: "NL",
      });

      return response.data;
    } catch (error) {
      console.log(JSON.stringify(error));
    }
  }

  /**
   * Transform a songwhip response into a shareable url
   * @param response
   * @returns
   */
  public static getWhipUrl(response: WhippedResult) {
    return `https://songwhip.com${response.data.item.url}`;
  }
}
