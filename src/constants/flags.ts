export const flags: { [key: string]: { flag: string; value?: any }[] } = {
  gpuRasterization: [{ flag: "enable-gpu-rasterization", value: undefined }],
  disableHardwareMediaKeys: [{ flag: "disable-features", value: "HardwareMediaKeyHandling" }],
};
