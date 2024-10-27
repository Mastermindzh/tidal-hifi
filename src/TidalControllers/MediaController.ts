export interface TidalController {
  /**
   * Play or pause the current media
   */
  playPause(): void;

  /**
   * Hook up the controller to the current web instance
   */
  hookup(): void;

  goToHome(): void;
}
