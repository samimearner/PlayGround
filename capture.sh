#!/usr/bin/env bash
# Capture desktop + mobile screenshots of the exact $CAPTURE_URL into
# $CAPTURE_DIR as final-desktop.png and final-mobile.png.
# Exit 75 = temporary navigation/browser infrastructure failure.
# Exit 1  = script or rendering defect.
# Leaves the app server running and writes nothing into the source tree.
set -euo pipefail

cd "$(dirname "$0")"

if [[ -z "${CAPTURE_URL:-}" ]]; then
  echo "CAPTURE_URL is not set." >&2
  exit 1
fi
if [[ -z "${CAPTURE_DIR:-}" ]]; then
  echo "CAPTURE_DIR is not set." >&2
  exit 1
fi

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p node <<'NODE_EOF'
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const url = process.env.CAPTURE_URL;
const output = process.env.CAPTURE_DIR;
if (!url || !output) {
  console.error('CAPTURE_URL and CAPTURE_DIR must be set.');
  process.exit(1);
}

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright');
const require = createRequire(join(runtime, 'package.json'));
const { chromium } = require('playwright');
const config = JSON.parse(
  readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8')
);
if (process.platform === 'linux') {
  try {
    process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim();
  } catch {}
}

const transient = (error) => { throw Object.assign(error, { exitCode: 75 }); };
let browser;
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(transient);
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(transient);
    page.setDefaultTimeout(30000);
    page.on('pageerror', (error) => console.error(error.message));
    const response = await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(transient);
    if (!response?.ok()) {
      const transientStatus = !response || [408, 429, 500, 502, 503, 504].includes(response.status());
      throw Object.assign(new Error(`HTTP ${response?.status()} loading preview`), { exitCode: transientStatus ? 75 : 1 });
    }
    await page.locator('body').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForTimeout(1500);
    const shot = join(output, `final-${name}.png`);
    await page.screenshot({ path: shot, timeout: 30000 }).catch((error) => {
      if (error.name === 'TimeoutError' || !browser.isConnected()) transient(error);
      throw error;
    });
    const size = statSync(shot).size;
    console.log(`Captured ${shot} (${size} bytes)`);
    if (size < 1024) throw Object.assign(new Error(`Rendering defect: ${shot} is too small`), { exitCode: 1 });
    await page.close();
  }
} catch (error) {
  console.error(error);
  process.exitCode = error.exitCode || 1;
} finally {
  await browser?.close().catch((error) => { console.error(error); process.exitCode ||= 75; });
}
NODE_EOF
