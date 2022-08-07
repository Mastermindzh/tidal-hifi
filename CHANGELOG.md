# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 4.1.0

- Added `tidal://` protocol support
- Switched icon strategies to fix bugs with icons
- Fixed tray icon bugs
  - Menu now shows in KDE as well
  - Toggle window is supported from tray icon
  - regular click is still ignored, see [this issue](https://github.com/electron/electron/issues/6773)
- Fixed about tab not showing
- Fixed playback, mpris and API issues

## 4.0.1

- Updated build config to make use of a base file that doesn't build anything.
  - This fixes the issue of unwanted extra build targets that were introduced with the electron-builder update

## 4.0.0

- Updated to Electron 19.0.5

## 3.1.1

- Media update timeout set to 500 instead of 200
- Updated property name for duration because of a tidal update
- flag for "disable hardware media keys" now working again

## 3.1.0

- Added a separate advanced options settings panel with flags
  - Added gpu-rasterization flag
- config setting `disableHardwareMediaKeys` moved to `flags.disableHardwareMediaKeys`, it will be migrated automatically

## 3.0.0

- Updated to Electron 15
- Fixed the develop "build-unpacked" command
- Added setting to disable multiple tidal-hifi windows (defaults to true)
- Added setting to disable HardwareMediaKeyHandling (defaults to false)

## 2.8.2

- Updated dependencies
- Downgraded packaged version of electron to 8.5.2, doesn't seem to like a newer build
- Fixed the annoying (and useless) terminal warning about `allowRendererProcessReuse`

## 2.8.1

- Mar0xy fixed some build issues (thanks!)
- vincens2005 fixed the quit button in the menubar

## 2.8.0

- Added the ability to mute artists automatically
- Added better error handling for discord rpc

## 2.7.2

- Disabled sandboxing to fix a display compositor issue on Linux.

## 2.7.1

- Fixed bug: Triggering full screen from the Tidal web app would cause the menubar to be visible even if it was disabled in the settings

## 2.7.0

- Switched to the native Notifier (removed node-notifier)
- Album art now also has a name, based on [best effort](https://github.com/Mastermindzh/tidal-hifi/pull/88#pullrequestreview-840814847)

## 2.6.0

- Add album images to media info and discord

## 2.5.0

- Notify-send now correctly shows "Tidal HiFi" as the program name
- Updated dependencies (including electron itself)

### known issues

- Requires older version of nodejs due to electron-builder (use lts/gallium)

### builds

updated to nodejs 16 in actions

## 2.4.0

- Added more MPRIS settings
- Added instruction for rescrobbler to get last.fm working without sandbox mode

## 2.3.0

- Added a setting to minimize to tray on app close (off by default)
- Added the main menu to the tray icon

## 2.2.1

- artists is now gotten specifically from the footer. This fixes the [unknown artists bug](https://github.com/Mastermindzh/tidal-hifi/issues/45).
- the discord module will check whether the artists is empty and if so substitute it with a default message. This is to prevent sending an empty state to Discord (which it doesn't support). fixes [#45](https://github.com/Mastermindzh/tidal-hifi/issues/54)

### removed arch build details from source control

moved to: [https://github.com/Mastermindzh/tidal-hifi-aur](https://github.com/Mastermindzh/tidal-hifi-aur)

## 2.2.0

- The discord integration now adds a time remaining field based on the song duration
- All fields (current, remaining, and url are also available in the API\*)
- the artist field is now correctly identified

\* current time only updates on play/pause.

## 2.1.1

- The discord integration now doesn't send an update every 15 seconds it sends an update whenever the media info changes
- consolidated updating the media info changes with the status changes into a single global event

## 2.1.0

- [Mar0xy](https://github.com/Mar0xy) added Discord integration.
- Several versions have been bumped to fix vulnerabilities

## 2.0.0

### Breaking changes

- Changed settings hotkey from "ctrl+/" to "ctrl+=" to avoid a conflict with the default Tidal hotkeys

## Other changes

- Added a setting to disable custom hotkeys
- Fixed the bug that the previous song hotkey would register 3 times. (Twice due to a duplicate block of code + once from the default tidal hotkey)

## 1.3.0

-- re-enabled MPRIS-service wit the electron downloader fixes

## 1.2.0

- Added the ability to disable the tray icon

## 1.1.1

Bugfixes:

- Arch AUR install failed before, it is fixed now by using the included build scripts

## 1.1.0

- updated to electron 8.0.0
- Added a beta-version of the MPRIS service

- Bugfixes:
  - icon on gnome not showing in launcher
  - app not remembering size on startup
