# Known Issues

This document lists known bugs and issues with Tidal Hi-Fi along with workarounds where available.

## Table of Contents

<!-- toc -->

- [Known Issues](#known-issues)
  - [Table of Contents](#table-of-contents)
  - [Adblock taking +- 2 minutes to start](#adblock-taking---2-minutes-to-start)
  - [Disable-sandboxing](#disable-sandboxing)
  - [White/Gray screen on login/launch](#whitegray-screen-on-loginlaunch)
    - [Advanced setting](#advanced-setting)
  - [Subscribe button showing and/or account details not working](#subscribe-button-showing-andor-account-details-not-working)
    - [2-minute (~110 second) startup delay](#2-minute-110-second-startup-delay)
  - [DRM not working on Windows (error S6007)](#drm-not-working-on-windows-error-s6007)
  - [Discord RPC not working with Flatpak and native Discord](#discord-rpc-not-working-with-flatpak-and-native-discord)
  - [Discord RPC not working between Flatpaks (TIDAL Hi-Fi + Discord/Vesktop)](#discord-rpc-not-working-between-flatpaks-tidal-hi-fi--discordvesktop)
  - [Volume resets on restart](#volume-resets-on-restart)
  - [Audio quality](#audio-quality)

<!-- tocstop -->

## Adblock taking +- 2 minutes to start

Due to changes with Tidal's ad serving the app will now timeout for 2 minutes on startup due to our URL filtering setup.
To fix this turn off adblock:

- open `~/.config/tidal-hifi/config.json` and replace `"adBlock": true` with `"adBlock": false`
- or run `sed -i -e 's/\"adBlock\"\:\ true/\"adBlock\"\:\ false/g' ~/.config/tidal-hifi/config.json`

## Disable-sandboxing

Various issues can be solved by disabling the sandbox, to do so simply pass `--no-sandbox` to `tidal-hifi`.
You are disabling [some security concerns](https://www.electronjs.org/docs/latest/tutorial/sandbox), you should be aware of that.

## White/Gray screen on login/launch

Some users may experience a white screen when launching Tidal Hi-Fi or during the login process. This is typically caused by security restrictions in the underlying Chromium engine. You can disable it permanently in the settings or following the steps below:

**Fix**: Run Tidal Hi-Fi from the command line with the `--no-sandbox` or `--disable-seccomp-filter-sandbox` flag:

```bash
tidal-hifi --no-sandbox
```

For different installation methods:

- **AppImage**: `./tidal-hifi-*.AppImage --no-sandbox`
- **Flatpak**: `flatpak run com.mastermindzh.tidal-hifi --no-sandbox`
- **From source**: `npm start -- --no-sandbox`

### Advanced setting

Under "Advanced" in the settings menu you'll find a section to toggle flags, there you can also toggle the sandbox flag.
The default value of this flag is "true", which means the sandbox is disabled. Though note, this might not always work, if not use `--no-sandbox`.

![The flag as shown in the settings window](./images/disable-sandbox.png)

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

### 2-minute (~110 second) startup delay

> **Note**: Adblock blocks the `/users/<id>/...` requests (favorites, clients, subscription) at the network level. Tidal now awaits those requests before rendering, so blocking them stalled startup for ~110 seconds (issue #973).

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

## Volume resets on restart

Some users notice their volume resets to a specific level (e.g. ~48%) when restarting the app. This is not a bug in Tidal Hi-Fi — it is caused by Tidal's built-in **volume normalization** feature, which adjusts playback volume to a consistent level across tracks.

**Fix**: Disable volume normalization in Tidal's own settings:

1. Click your profile picture (top right)
2. Go to **Settings**
3. Turn off **Normalize volume**

## Audio quality

For details on enabling 192kHz output in TIDAL Hi-Fi and configuring PipeWire on Linux, see the **[Audio Quality & PipeWire Setup guide](./audio-quality.md)**.
