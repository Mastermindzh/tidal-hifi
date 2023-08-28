import fs from "fs";
import { settings } from "../../constants/settings";
import { settingsStore } from "../../scripts/settings";
import { Logger } from "../logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addCustomCss(app: any, logger: typeof Logger) {
  window.addEventListener("DOMContentLoaded", () => {
    const selectedTheme = settingsStore.get<string, string>(settings.theme);
    if (selectedTheme !== "none") {
      const userThemePath = `${app.getPath("userData")}/themes/${selectedTheme}`;
      const resourcesThemePath = `${process.resourcesPath}/${selectedTheme}`;
      const themeFile = fs.existsSync(userThemePath) ? userThemePath : resourcesThemePath;
      fs.readFile(themeFile, "utf-8", (err, data) => {
        if (err) {
          logger.alert("An error ocurred reading the theme file.", err, alert);
          return;
        }

        const themeStyle = document.createElement("style");
        themeStyle.innerHTML = data;
        document.head.appendChild(themeStyle);
      });
    }

    // read customCSS (it will override the theme)
    const style = document.createElement("style");
    style.innerHTML = settingsStore.get<string, string[]>(settings.customCSS).join("\n");
    document.head.appendChild(style);
  });
}
