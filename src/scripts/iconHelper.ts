import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";

/**
 * Standard icon theme directories on Linux systems
 * Following the XDG Base Directory Specification
 */
const ICON_THEME_PATHS = [
  path.join(homedir(), ".icons"),
  path.join(homedir(), ".local/share/icons"),
  "/usr/share/icons",
  "/usr/local/share/icons",
];

/**
 * Common icon sizes for tray icons, in order of preference
 */
const ICON_SIZES = ["16x16", "22x22", "24x24", "32x32", "48x48", "scalable"];

/**
 * Possible app name variations to search for
 */
const APP_NAMES = ["tidal-hifi", "com.mastermindzh.tidal-hifi", "tidal"];

/**
 * Check for icon in a specific category
 * @param themePath base theme directory path
 * @param size icon size (e.g., "16x16", "scalable")
 * @param category icon category (e.g., "apps", "status")
 * @param appName application name
 * @returns path to the icon if found, null otherwise
 */
function checkIconInCategory(
  themePath: string,
  size: string,
  category: string,
  appName: string
): string | null {
  const iconPath = path.join(themePath, size, category, `${appName}.png`);
  if (existsSync(iconPath)) {
    return iconPath;
  }

  // Also try .svg for scalable icons
  if (size === "scalable") {
    const svgPath = path.join(themePath, size, category, `${appName}.svg`);
    if (existsSync(svgPath)) {
      return svgPath;
    }
  }

  return null;
}

/**
 * Search for a system theme icon for the application
 * Follows XDG icon theme specification
 * @returns path to the icon if found, null otherwise
 */
export function findSystemIcon(): string | null {
  // Only search for system icons on Linux
  if (process.platform !== "linux") {
    return null;
  }

  for (const themePath of ICON_THEME_PATHS) {
    if (!existsSync(themePath)) {
      continue;
    }

    // Search through icon sizes
    for (const size of ICON_SIZES) {
      for (const appName of APP_NAMES) {
        // Try common icon categories
        const categories = ["apps", "applications", "status"];
        for (const category of categories) {
          const iconPath = checkIconInCategory(themePath, size, category, appName);
          if (iconPath) {
            return iconPath;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Get the icon path for the system tray
 * Tries to find a system theme icon first, then falls back to the bundled icon
 * @param fallbackIcon path to the bundled icon
 * @returns path to the icon to use
 */
export function getSystemTrayIcon(fallbackIcon: string): string {
  const systemIcon = findSystemIcon();
  return systemIcon || fallbackIcon;
}
