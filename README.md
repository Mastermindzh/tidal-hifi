<img src = "./build/icon.png" height="50" style="float:right; margin-top: 29px;" />
# Tidal-hifi

The web version of [listen.tidal.com](listen.tidal.com) running in electron with hifi support thanks to widevine.

![tidal-hifi preview](./docs/preview.png)

<!-- toc -->

- [Installation](#installation)
  - [Using releases](#using-releases)
  - [Using source](#using-source)
- [Why](#why)
- [Integrations](#integrations)
- [Why not extend existing projects?](#why-not-extend-existing-projects)
- [Special thanks to..](#special-thanks-to)

<!-- tocstop -->

## Installation

### Using releases

Various packaged versions of the software are available on the [releases](https://github.com/Mastermindzh/tidal-hifi/releases) tab.

### Using source

To install and work with the code on this project follow these steps:

- git clone https://github.com/Mastermindzh/tidal-hifi.git
- cd tidal-hifi
- npm install
- npm start

## Why

I moved from Spotify over to Tidal and found Linux support to be lacking.

When I started this project there weren't any Linux apps that offered Tidal's "hifi" options nor any scripts to control it.

## Integrations

- [i3 blocks config]() - My dotfiles where I use this app to fetch currently playing music

## Why not extend existing projects?

Whilst there are a handful of projects attempting to run Tidal on Electron they are all unappealing to me because of various reasons:

- Lack of a maintainers/developers. (no hotfixes, no issues being handled etc)
- Most are simple web wrappers, not my cup of tea.
- Some are DE oriented. I want this to work on WM's too.
- None have widevine working at the moment and that is really the hardest part..

Sometimes it's just easier to start over, cover my own needs and then making it available to the public :)

## Special thanks to..

- [Castlabs](https://castlabs.com/)
  For maintaining Electron with Widevine CDM installation, Verified Media Path (VMP), and persistent licenses (StorageID)
