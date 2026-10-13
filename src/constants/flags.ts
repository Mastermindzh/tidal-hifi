export const flags: { [key: string]: { flag: string; value?: string }[] } = {
  gpuRasterization: [{ flag: "enable-gpu-rasterization", value: undefined }],
  disableHardwareMediaKeys: [{ flag: "disable-features", value: "HardwareMediaKeyHandling" }],
  // No Chromium switch on purpose: the sandboxed zygote is already running by
  // the time flags are applied, so a runtime `--no-sandbox` only half-applies
  // and processes forked from it crash (#958). The setting still controls the
  // BrowserWindow `sandbox` preference, see scripts/sandbox.ts.
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
