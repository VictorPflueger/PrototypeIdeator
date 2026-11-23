// Shared test harness: finds Playwright and serves the app folder over HTTP. The app loads nothing from a
// third party and reaches only api.anthropic.com, so every external request in a test is either answered
// by the scripted API stand-in or blocked. Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): this
// tool's storage keys and output folder, a lower-case ViciDesign folder, and CHROME_ARGS for a browser
// that has to bypass a proxy to reach 127.0.0.1.
import { createRequire } from "node:module";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

/** The app folder: the parent of tests/. */
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8"
};

export const CORS = { "access-control-allow-origin": "*", "access-control-expose-headers": "*" };

/** Case names given on the command line (empty: run all cases). */
export const ONLY = process.argv.slice(2);
export const wanted = (name) => ONLY.length === 0 || ONLY.includes(name);

/** Where screenshots, downloads and result files go (outside the app folder by default). */
export async function outDir(suite) {
  const dir = path.join(process.env.PI_TEST_OUT || path.join(os.tmpdir(), "prototype-ideator-tests"), suite);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Playwright is not part of the app. Install it once, globally or in any folder:
 *   npm install -g playwright && npx playwright install chromium
 * and run with NODE_PATH="$(npm root -g)", or point PLAYWRIGHT_MODULE at its folder.
 */
export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* try the next one */ }
  }
  console.error("Playwright was not found. Install it with `npm install -g playwright` and `npx playwright install chromium`,\nthen run the tests with NODE_PATH=\"$(npm root -g)\" (or set PLAYWRIGHT_MODULE to the playwright folder).");
  process.exit(2);
}

/** Chromium from Playwright, or the browser at CHROME_PATH, with any extra CHROME_ARGS. */
export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const args = (process.env.CHROME_ARGS || "").split(" ").filter(Boolean);
  return chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args });
}

/**
 * Serves `root` on 127.0.0.1:`port`. Paths in `blockLocal` (prefixes) answer 404, to simulate a
 * missing file. Returns { base, blockLocal, close }.
 */
export async function serveStatic(root, port) {
  const blockLocal = new Set();
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, path.normalize(p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if ([...blockLocal].some((b) => p.startsWith(b))) { res.writeHead(404); res.end("blocked by test"); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { base: `http://127.0.0.1:${port}/`, blockLocal, close: () => new Promise((r) => server.close(r)) };
}

/** Console noise that blocked external requests cause in every test. */
export const NETWORK_NOISE = /Failed to load resource|net::ERR_|ERR_BLOCKED_BY_CLIENT|ERR_FAILED/;

/** A key-shaped string that is obviously not a real key. */
export const MOCK_KEY = "sk-ant-test-MOCKKEY-0123456789abcdefghijklmnopqrstuvwxyz0123456789";

/** The browser storage keys the page may write (brief §5.9): its language, Vici's theme and Vici's guide note. */
export const KEYS = { lang: "pi.lang", theme: "vc-theme", guidePrefix: "vc-guide:" };

/** Suites that need ViciDesign fail without it on GitHub Actions or with --require-vici; else they skip. */
export const REQUIRE_VICI = process.argv.includes("--require-vici") || process.env.GITHUB_ACTIONS === "true";

/** A ViciDesign checkout: the folder in VICI_DIR, or ../ViciDesign (or ../vicidesign) next to this repository. */
export function viciDir() {
  return [process.env.VICI_DIR, path.resolve(APP_ROOT, "..", "ViciDesign"), path.resolve(APP_ROOT, "..", "vicidesign")].filter(Boolean).find((d) => existsSync(path.join(d, "scripts", "lib", "guide.mjs"))) || null;
}
