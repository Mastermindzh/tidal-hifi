export const flags: { [key: string]: { flag: string; value?: string }[] } = {
  gpuRasterization: [{ flag: "enable-gpu-rasterization", value: undefined }],
  disableHardwareMediaKeys: [{ flag: "disable-features", value: "HardwareMediaKeyHandling" }],
  disableSandbox: [{ flag: "no-sandbox", value: undefined }],
  enableWaylandSupport: [
    { flag: "enable-features", value: "UseOzonePlatform" },
    { flag: "ozone-platform-hint", value: "auto" },
    { flag: "enable-features", value: "WaylandWindowDecorations" },
  ],
};
