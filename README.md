<h1>
Tidal-hifi
<img src = "./build/icon.png" height="40" align="right" />
</h1>

The web version of [listen.tidal.com](listen.tidal.com) running in electron with hifi support thanks to widevine.

![tidal-hifi preview](./docs/preview.png)

## Table of contents

<!-- toc -->

- [Installation](#installation)
  - [Using releases](#using-releases)
    - [Snap install](#snap-install)
  - [Using source](#using-source)
- [features](#features)
- [Integrations](#integrations)
- [Why](#why)
- [Why not extend existing projects?](#why-not-extend-existing-projects)
- [Special thanks to..](#special-thanks-to)

<!-- tocstop -->

## Installation

### Using releases

Various packaged versions of the software are available on the [releases](https://github.com/Mastermindzh/tidal-hifi/releases) tab.

#### Snap install

To install with `snap` you need to download the pre-packaged snap-package from this repository, found under releases:

1) Download: 
```sh 
wget <URI> #for instance: https://github.com/Mastermindzh/tidal-hifi/releases/download/1.0/tidal-hifi_1.0.0_amd64.snap
```

2) Install: 
```sh
snap install --dangerous <path> #for instance: tidal-hifi_1.0.0_amd64.snap
```

### Arch Linux

Arch Linux users can use the AUR to install tidal-hifi:

```sh
trizen tidal-hifi
```

### Using source

To install and work with the code on this project follow these steps:

- git clone https://github.com/Mastermindzh/tidal-hifi.git
- cd tidal-hifi
- npm install
- npm start

## features

- HiFi playback
- Notifications
- Shortcuts ([source](https://defkey.com/tidal-desktop-shortcuts))
- API for status and playback
- [Settings feature](./docs/settings.png) to disable certain functionality. (`ctrl+/`)
- Tray(/mini) player (coming soon)

## Integrations

- [i3 blocks config](https://github.com/Mastermindzh/dotfiles/commit/9714b2fa1d670108ce811d5511fd3b7a43180647) - My dotfiles where I use this app to fetch currently playing music (direct commit)

### Known bugs
- [Last.fm login doesn't work](https://github.com/Mastermindzh/tidal-hifi/issues/4).

## Why

I moved from Spotify over to Tidal and found Linux support to be lacking.

When I started this project there weren't any Linux apps that offered Tidal's "hifi" options nor any scripts to control it.

## Why not extend existing projects?

Whilst there are a handful of projects attempting to run Tidal on Electron they are all unappealing to me because of various reasons:

- Lack of a maintainers/developers. (no hotfixes, no issues being handled etc)
- Most are simple web wrappers, not my cup of tea.
- Some are DE oriented. I want this to work on WM's too.
- None have widevine working at the moment

Sometimes it's just easier to start over, cover my own needs and then making it available to the public :)

## Special thanks to..

- [Castlabs](https://castlabs.com/)
  For maintaining Electron with Widevine CDM installation, Verified Media Path (VMP), and persistent licenses (StorageID)
