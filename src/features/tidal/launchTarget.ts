const PROTOCOL = "tidal://";

/**
 * Data a newly launched instance forwards to the running one via `requestSingleInstanceLock`.
 */
export interface LaunchData {
  argv: string[];
}

export function isLaunchData(value: unknown): value is LaunchData {
  const argv = (value as LaunchData | null)?.argv;
  return Array.isArray(argv) && argv.every((arg) => typeof arg === "string");
}

/**
 * Find the first launch argument that points at Tidal and turn it into a URL the main window can load.
 * Accepts `tidal://<path>` and https URLs on the same host as `baseUrl`; everything else is ignored.
 * @param args raw launch arguments (may include the executable, flags, etc.)
 * @param baseUrl the configured Tidal URL, e.g. https://tidal.com
 * @returns the URL to load, or null if no argument is a valid Tidal target
 */
export function resolveLaunchTarget(args: readonly string[], baseUrl: string): string | null {
  const base = new URL(baseUrl);

  for (const arg of args) {
    let candidate: string;
    if (arg.startsWith(PROTOCOL)) {
      candidate = `${baseUrl.replace(/\/+$/, "")}/${arg.slice(PROTOCOL.length)}`;
    } else if (arg.startsWith("https://")) {
      candidate = arg;
    } else {
      continue;
    }

    try {
      const parsed = new URL(candidate);
      if (
        (parsed.protocol === "https:" || parsed.protocol === "http:") &&
        parsed.hostname === base.hostname
      ) {
        return parsed.href;
      }
    } catch {
      // not a valid URL, keep looking
    }
  }

  return null;
}
