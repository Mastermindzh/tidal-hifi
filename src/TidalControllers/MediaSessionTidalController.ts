import { DomTidalController } from "./DomTidalController";
import { TidalController } from "./TidalController";

export class MediaSessionTidalController implements TidalController {
  public domMediaController: TidalController;

  constructor() {
    this.domMediaController = new DomTidalController();
  }
  goToHome(): void {
    this.domMediaController.goToHome();
  }
  playPause(): void {
    globalThis.alert("Method not implemented");
  }
  hookup(): void {
    globalThis.alert("Method not implemented");
  }
}
