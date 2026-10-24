const path = require('path');
const { spawn } = require('child_process');

// On Windows, if native SWC is restricted by Windows Defender Application Control (WDAC),
// configure Next.js to use the WebAssembly compiler fallback.
// On Linux/macOS (e.g. CI/CD or Vercel), native SWC binaries execute by default.
if (process.platform === 'win32' && !process.env.NEXT_TEST_WASM_DIR) {
  try {
    const wasmPkgPath = require.resolve('@next/swc-wasm-nodejs');
    process.env.NEXT_TEST_WASM_DIR = path.dirname(wasmPkgPath);
  } catch (err) {
    // Falls back to standard Next.js binary resolution if not installed
  }
}

const args = process.argv.slice(2);
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
