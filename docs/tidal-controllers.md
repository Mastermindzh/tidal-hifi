# Tidal Controllers

Tidal Hi-Fi uses different **controller types** to interact with the Tidal web player and extract playback information. These controllers provide the foundation for features like media integrations (Discord RPC, ListenBrainz, MPRIS), hotkeys, and the API that other applications can use to get current track information.

<!-- toc -->

- [Tidal Controllers](#tidal-controllers)
  - [What are Tidal Controllers?](#what-are-tidal-controllers)
  - [Available Controllers](#available-controllers)
    - [Choosing the Right Controller... Quick overview](#choosing-the-right-controller-quick-overview)
    - [1. Media Session Controller (Default)](#1-media-session-controller-default)
    - [2. DOM Controller](#2-dom-controller)
    - [3. Tidal API Controller (Beta)](#3-tidal-api-controller-beta)
  - [Troubleshooting](#troubleshooting)
    - [Controller Not Working?](#controller-not-working)
    - [Performance Issues?](#performance-issues)
    - [Missing Features?](#missing-features)
  - [For Developers](#for-developers)
    - [How Controllers Work Together](#how-controllers-work-together)
    - [Creating a Custom Controller](#creating-a-custom-controller)
    - [Adding a New Controller](#adding-a-new-controller)
  - [Future Development](#future-development)

<!-- tocstop -->

## What are Tidal Controllers?

A Tidal Controller is a software component that:

- **Controls playback** (play, pause, skip, shuffle, etc.)
- **Extracts media information** (current song, artist, album, playback status)
- **Responds to user input** (hotkeys, external commands)
- **Provides data to integrations** (Discord, ListenBrainz, system media controls)

Think of controllers as different "strategies" for communicating with Tidal's web player. Each has its own advantages and limitations.

## Available Controllers

You can switch between controller types in **Settings → Advanced → Controller Type**.

### Choosing the Right Controller... Quick overview

| Feature                  | MediaSession Controller     | DOM Controller          | API Controller    |
| ------------------------ | --------------------------- | ----------------------- | ----------------- |
| **Stability**            | ✅ Excellent                | ✅ Excellent            | ❌ In Development |
| **Performance**          | ✅ Very Efficient           | ✅ Efficient            | ❌ Not Ready      |
| **System Integration**   | ✅ Native                   | ✅ Custom               | ❓ Unknown        |
| **Feature Completeness** | ✅ Full (with DOM fallback) | ⚠️ Missing album info   | ❌ Minimal        |
| **Tidal Dependency**     | ⚠️ MediaSession API         | ⚠️ HTML Structure       | ❓ "Official" API |

### 1. Media Session Controller (Default)

**Best for:** Most users, system integration

- How it works: Uses the browser's [MediaSession API](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession) to read metadata that Tidal provides
- Data accuracy: Good - relies on what Tidal exposes through the standard API
- Performance: Very efficient, uses browser's native capabilities
- Reliability: Stable, but dependent on Tidal's MediaSession implementation
- Limitations: Uses DOM Controller as fallback for buttons and features not available through MediaSession

### 2. DOM Controller

**Best for:** Maximum compatibility, fallback functionality

- How it works: Directly reads the webpage's HTML elements and simulates button clicks
- Data accuracy: Excellent - gets detailed information directly from the web interface
- Performance: Lightweight, minimal resource usage
- Reliability: Most stable option, works in all scenarios
- Limitations: Depends on Tidal's HTML structure (may break if Tidal updates their website, or hides info behind click-throughs, such as album info)

**Use this when:**

- Other controllers aren't working properly
- You're experiencing issues with the default controller

### 3. Tidal API Controller (Beta)

**Best for:** Developers, advanced users (currently incomplete)

- How it works: Intended to use Tidal's official API instead of the web player
- Status: Under development - most functions show "Method not implemented" errors
- Future potential: Could provide the most reliable and feature-rich experience
- Current limitations: Most functionality is not yet implemented, uses DOM Controller for actual operations

**Use this when:**

- You're a developer wanting to contribute to its development
- You're testing future features

## Troubleshooting

### Controller Not Working?

1. **Switch to DOM Controller** (direct fallback)
2. **Check browser console** for error messages (F12 → Console)
3. **Restart the application** after changing controller types
4. **Update Tidal Hi-Fi** to the latest version

### Performance Issues?

1. **Increase update frequency** in settings (reduces polling)
2. **Check system resources** and close unnecessary applications
3. **Try DOM Controller** if MediaSession Controller seems resource-heavy

### Missing Features?

1. **Use the default controller** (MediaSession) for maximum feature support
2. **Report bugs** on the [GitHub issues page](https://github.com/Mastermindzh/tidal-hifi/issues)
3. **Join the [Discord community](https://discord.gg/yhNwf4v4He)** for support and discussion

## For Developers

### How Controllers Work Together

Controllers in Tidal Hi-Fi are designed to work collaboratively. The DOM Controller serves as the foundation since it can interact directly with all webpage elements (buttons, menus, etc.). Other controllers use it as a fallback when they need functionality that isn't available through their primary method.

For example:

- **MediaSession Controller** reads track information from the browser's MediaSession API, but uses DOM Controller to handle play/pause buttons and navigation
- **API Controller** will eventually use Tidal's official API, but currently delegates most operations to DOM Controller
- **All controllers** use a polling mechanism with automatic rate limiting (100ms minimum, 60 seconds maximum) and only send updates when something changes

### Creating a Custom Controller

All controllers implement the `TidalController` interface:

```typescript
interface TidalController<TBootstrapOptions = object> {
  // Playback control
  playPause(): void;
  play(): void;
  pause(): void;
  stop(): void;
  next(): void;
  previous(): void;

  // Information extraction
  getCurrentlyPlayingStatus(): MediaStatus;
  getTitle(): string;
  getArtists(): string[];

  // Setup and updates
  bootstrap(options: TBootstrapOptions): void;
  onMediaInfoUpdate(callback: (state: Partial<MediaInfo>) => void): void;
}
```

### Adding a New Controller

1. **Implement the interface** in `src/TidalControllers/`
2. **Add to controller constants** in `src/constants/controller.ts`
3. **Update the selection logic** in `src/preload.ts`
4. **Add to settings UI** in `src/pages/settings/settings.html`

## Future Development

The controller system is designed to be extensible and future-proof:

- **API Controller completion** for official Tidal API support
- **Additional controller types** based on community needs
- **Enhanced MediaSession integration** with more browser APIs
- **Performance optimizations** and smart polling strategies

---

*This documentation reflects Tidal Hi-Fi's controller system as of the current release. Features and behavior may change as controllers are improved and new ones are added.*
