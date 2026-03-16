# Audio Quality & PipeWire Setup

By default Chromium resamples all audio to 48kHz, which degrades high-quality content from Tidal (HiFi / Max).
TIDAL Hi-Fi includes a setting to force the output sample rate to 192kHz, but your system's audio stack also needs to be configured to take advantage of it.

## Table of Contents

<!-- toc -->

- [Audio Quality \& PipeWire Setup](#audio-quality--pipewire-setup)
  - [Table of Contents](#table-of-contents)
  - [Enabling 192kHz output in TIDAL Hi-Fi](#enabling-192khz-output-in-tidal-hi-fi)
  - [Configuring PipeWire (Linux)](#configuring-pipewire-linux)
  - [Discussions and tips](#discussions-and-tips)

<!-- tocstop -->

## Enabling 192kHz output in TIDAL Hi-Fi

1. Open settings (`Ctrl + =`)
2. Navigate to the **Advanced** tab
3. Enable **Audio output sample rate (192kHz)**
4. Restart the app (flags only take effect on launch)

This passes `--audio-output-sample-rate=192000` to Chromium and disables the out-of-process audio service so the flag is respected.

## Configuring PipeWire (Linux)

The Electron flag alone is not enough — if PipeWire (or PulseAudio) is running at 48kHz it will resample the stream back down before it reaches your DAC.

> **⚠️ Warning:** Setting rates in the PipeWire config that your hardware doesn't support **will crash PipeWire**, leaving you without audio.

First, find the sample rates your DAC supports:

```bash
# List all sound cards
aplay -l

# Check supported rates for a specific card (replace 0 with your card number)
cat /proc/asound/card0/stream0

# Alternative if the above doesn't work (e.g. on some USB DACs)
aplay -D hw:0 --dump-hw-params /dev/null 2>&1 | grep -i rate
```

If you have multiple sound cards, use `aplay -l` to find the right card number and check `/proc/asound/card<N>/stream0`.

The rates listed in the output are the ones you should use in the PipeWire config below. Create (or edit) `~/.config/pipewire/pipewire.conf.d/sample-rate.conf` and set `default.clock.rate` to the highest supported rate, and `default.clock.allowed-rates` to all of them:

```ini
context.properties = {
    # highest supported rate
    default.clock.rate          = 192000
    # <all supported rates, space-separated>
    default.clock.allowed-rates = [ 44100 48000 88200 96000 176400 192000 ]
}
```

Then restart PipeWire:

```bash
systemctl --user restart pipewire pipewire-pulse
```

The `allowed-rates` list lets PipeWire switch dynamically to match the source rate, so 44.1kHz content won't be needlessly upsampled either. You can verify the active rate with `pw-top`.

> **Recovery:** If PipeWire crashes after applying this config, delete (or fix) the file and restart:
>
> ```bash
> rm ~/.config/pipewire/pipewire.conf.d/sample-rate.conf
> systemctl --user restart pipewire pipewire-pulse
> ```

## Discussions and tips

- [#266](https://github.com/Mastermindzh/tidal-hifi/issues/266)
