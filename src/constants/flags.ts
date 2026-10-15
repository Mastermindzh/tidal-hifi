export const flags: { [key: string]: { flag: string; value?: string }[] } = {
  gpuRasterization: [{ flag: "enable-gpu-rasterization", value: undefined }],
  disableHardwareMediaKeys: [{ flag: "disable-features", value: "HardwareMediaKeyHandling" }],
  // Applied through BrowserWindow's sandbox preference, not a Chromium switch.
  disableSandbox: [],
  enableWaylandSupport: [
    { flag: "enable-features", value: "UseOzonePlatform" },
    { flag: "ozone-platform-hint", value: "auto" },
    { flag: "enable-features", value: "WaylandWindowDecorations" },
  ],
  audioOutputSampleRate: [
    { flag: "audio-output-sample-rate", value: "192000" },
    { flag: "disable-features", value: "AudioServiceOutOfProcess" },
    { flag: "disable-features", value: "AudioServiceSandbox" },
  ],
};
