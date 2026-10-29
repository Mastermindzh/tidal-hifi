const { execFileSync } = require("node:child_process");

// Electron Builder hook entry point.
// `context` contains build metadata such as the output directory and target platform.
exports.default = async function (context) {
  const { appOutDir, electronPlatformName } = context;

  // Only run EVS signing for macOS and Windows builds.
  // Skip Linux and any other unsupported targets.
  if (!["darwin", "win32"].includes(electronPlatformName)) {
    console.log(`Skipping EVS signing for ${electronPlatformName}`);
    return;
  }

  // Feature flag: signing only happens when explicitly enabled.
  const enableEvs = process.env.ENABLE_EVS_SIGNING === "true";
  if (!enableEvs) {
    console.log(`Skipping EVS signing for ${electronPlatformName} (ENABLE_EVS_SIGNING != true)`);
    return;
  }

  // Read EVS credentials and config from environment variables.
  const EVS_ACCOUNT_NAME = process.env.EVS_ACCOUNT_NAME;
  const EVS_PASSWD = process.env.EVS_PASSWD;
  const EVS_NO_ASK = process.env.EVS_NO_ASK ?? "1";

  // If credentials are missing, do not attempt signing.
  if (!EVS_ACCOUNT_NAME || !EVS_PASSWD) {
    console.log(`Skipping EVS signing for ${electronPlatformName} (missing EVS credentials)`);
    return;
  }

  // Log the directory that will be passed to the EVS signing tool.
  console.log("EVS signing appOutDir =", appOutDir);

  // Use `py -3` on Windows and `python3` on macOS.
  const python = electronPlatformName === "win32" ? "py" : "python3";

  // Build the Python command arguments for castLabs EVS package signing.
  // Windows uses the Python launcher (`py`) so `-3` is required to force Python 3.
  const args =
    electronPlatformName === "win32"
      ? ["-3", "-m", "castlabs_evs.vmp", "-n", "sign-pkg", appOutDir]
      : ["-m", "castlabs_evs.vmp", "-n", "sign-pkg", appOutDir];

  // Run the signing command synchronously so the build waits for completion.
  // `stdio: "inherit"` forwards output directly to the current process for visibility.
  // The EVS credentials are passed through the child process environment.
  execFileSync(python, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      EVS_ACCOUNT_NAME,
      EVS_PASSWD,
      EVS_NO_ASK,
    },
  });
};
