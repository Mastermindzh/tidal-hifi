export class SharingService {
  /**
   * Retrieve the universal link given a regular track link
   * @param currentUrl
   * @returns
   */
  public static getUniversalLink(currentUrl: string): string {
    return `${currentUrl}?u`;
  }
}
