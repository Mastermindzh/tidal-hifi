# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.2.0

- The discord integration now adds a time remaining field based on the song duration
- All fields (current, remaining, and url are also available in the API*)
- the artist field is now correctly identified

* current time only updates on play/pause.

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

-- re-enabled mpris-service wit the electron downloader fixes

## 1.2.0

- Added the ability to disable the tray icon

## 1.1.1

Bugfixes:

- Arch AUR install failed before, it is fixed now by using the included build scripts

## 1.1.0

- updated to electron 8.0.0
- Added a beta-version of the mpris service

- Bugfixes:
  - icon on gnome not showing in launcher
  - app not remembering size on startup
