# Known Issues

This document lists known bugs and issues with Tidal Hi-Fi along with workarounds where available.

## Table of Contents

<!-- toc -->

- [Known Issues](#known-issues)
  - [Table of Contents](#table-of-contents)
  - [White screen on login/launch](#white-screen-on-loginlaunch)
  - [Subscribe button showing and/or account details not working](#subscribe-button-showing-andor-account-details-not-working)
  - [DRM not working on Windows (error S6007)](#drm-not-working-on-windows-error-s6007)
  - [Discord RPC not working with Flatpak and native Discord](#discord-rpc-not-working-with-flatpak-and-native-discord)
  - [Discord RPC not working between Flatpaks (TIDAL Hi-Fi + Discord/Vesktop)](#discord-rpc-not-working-between-flatpaks-tidal-hi-fi--discordvesktop)

<!-- tocstop -->

## White screen on login/launch

Some users may experience a white screen when launching Tidal Hi-Fi or during the login process. This is typically caused by security restrictions in the underlying Chromium engine.

**Fix**: Run Tidal Hi-Fi from the command line with the `--no-sandbox` flag:

```bash
tidal-hifi --no-sandbox
```

For different installation methods:

- **AppImage**: `./tidal-hifi-*.AppImage --no-sandbox`
- **Flatpak**: `flatpak run com.mastermindzh.tidal-hifi --no-sandbox`
- **From source**: `npm start -- --no-sandbox`

## Subscribe button showing and/or account details not working

If you see a "Subscribe" button or notice that account-related features aren't working properly, this is likely due to the built-in ad blocker being too aggressive.

**Cause**: Tidal hosts account management and advertisements on the same domain, so the ad blocker may inadvertently block account-related functionality.

**Fix**: Temporarily disable the ad blocker in the app:

1. Open Tidal Hi-Fi settings (`Ctrl + =`)
2. Navigate to the "Integrations" tab
3. Disable the ad blocker
4. Refresh the page or restart the app
5. Complete your account-related tasks
6. Re-enable the ad blocker if desired

## DRM not working on Windows (error S6007)

Most Windows users run into DRM issues when trying to use TIDAL Hi-Fi.
Nothing I can do about that I'm afraid... Tidal is working on removing/changing DRM so when they finish with that we can give it another shot.

Until then you'll have to use the official app unfortunately.

## Discord RPC not working with Flatpak and native Discord

If you're running TIDAL Hi-Fi as a Flatpak and Discord as a native application (not Flatpak), Discord RPC integration may not work due to sandboxing.

**Fix**: Use Flatseal to grant TIDAL Hi-Fi access to the Discord socket:

1. Open Flatseal
2. Navigate to TIDAL Hi-Fi → Filesystem → Other files
3. Add a new entry: `xdg-run/discord-ipc-0`

This allows the Flatpak to communicate with the native Discord installation through the IPC socket.

## Discord RPC not working between Flatpaks (TIDAL Hi-Fi + Discord/Vesktop)

If both TIDAL Hi-Fi and Discord/Vesktop are running as Flatpaks, they cannot communicate directly due to sandboxing.

**Fix**: Create symlinks and grant filesystem permissions:

1. **Create symlinks for Vesktop**:

   ```bash
   ln -sf $XDG_RUNTIME_DIR/{.flatpak/dev.vencord.Vesktop/xdg-run,}/discord-ipc-0
   ln -sf $XDG_RUNTIME_DIR/{.flatpak/dev.vencord.Vesktop/xdg-run,app/com.discordapp.Discord}/discord-ipc-0
   ```

2. **Grant filesystem permission**:

   ```bash
   flatpak override --user --filesystem=xdg-run/.flatpak/dev.vencord.Vesktop:create com.mastermindzh.tidal-hifi
   ```

This creates the necessary communication bridges between the sandboxed applications.
