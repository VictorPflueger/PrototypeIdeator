// The page's security policy, what it loads and where it may store anything (AC-01 and the static half of
// the brief's storage rule, §5.9), checked in the files without a browser:
//   policy    index.html carries exactly the brief's policy in one meta tag, and js/config.js the same;
//   loads     every script, stylesheet, font, image and module comes from this site: no absolute URL in a
//             <script src>, <link href>, CSS url() or @import, or a JavaScript import; the only host any
//             code connects to is api.anthropic.com, and only the shared client calls fetch;
//   inline    no inline script or style: no <script> without src, no <style>, no style or on… attribute,
//             and no code that writes a style attribute or a handler as text, or evaluates text;
//   storage   localStorage and sessionStorage appear only in the modules allowed them (the theme, the
//             language, Vici's own script); IndexedDB, the Cache API and cookies appear nowhere; every
//             literal key is "pi.lang", Vici's "vc-theme" or Vici's "vc-guide:" note; the key store and
//             the session store name no storage at all.
// Each check first proves on planted examples that it catches what it looks for. Adapted from the Data
// Quality Agent 2.2.0's tests/policy.mjs: the hosts, the allowed modules and the keys are this tool's.
// Prints POLICY OK.
// Usage: node tests/policy.mjs
import fs from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

// The policy as the brief states it (§5.1), character for character.
const POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";
const failures = [];
const passes = [];
const check = (ok, what) => (ok ? passes : failures).push(what);
const read = (f) => fs.readFileSync(path.join(APP_ROOT, f), "utf8");
const walk = (dir, ext) => fs.readdirSync(path.join(APP_ROOT, dir), { recursive: true }).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`.replace(/\\/g, "/"));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

// ---- the scanners ----------------------------------------------------------------------------------
const ABS = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
function htmlLoads(html) {
  const out = [];
  for (const m of html.matchAll(/<(script|link|img|iframe|source|video|audio|embed|object)\b[^>]*?\s(src|href|data)\s*=\s*["']([^"']+)["']/gi)) {
    const tag = m[1].toLowerCase();
    if (tag === "link" && !/rel=["'](stylesheet|icon|preload|modulepreload|manifest)["']/i.test(m[0])) continue;
    if (ABS.test(m[3])) out.push(`<${tag} ${m[2]}="${m[3]}">`);
  }
  return out;
}
function cssLoads(css) {
  const out = [];
  const plain = stripComments(css);
  for (const m of plain.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/gi)) if (ABS.test(m[1])) out.push(`@import ${m[1]}`);
  for (const m of plain.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) if (ABS.test(m[1]) && !/^data:/i.test(m[1])) out.push(`url(${m[1]})`);
  return out;
}
function jsLoads(js) {
  const out = [];
  const plain = stripComments(js);
  for (const m of plain.matchAll(/\bimport\s*(?:[\w*{}\s,]+from\s*)?\(?\s*["'`]([^"'`]+)["'`]/g)) if (ABS.test(m[1])) out.push(`import ${m[1]}`);
  for (const m of plain.matchAll(/\bimportScripts\s*\(|new\s+(?:Worker|SharedWorker|WebSocket|EventSource)\s*\(/g)) out.push(m[0]);
  return out;
}
const hostsIn = (js) => [...stripComments(js).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase());
function htmlInline(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (!/\bsrc\s*=/.test(m[1]) && m[2].trim()) out.push("<script> without src");
  if (/<style\b/i.test(html)) out.push("<style>");
  for (const m of html.matchAll(/<[a-z][^>]*\s(style|on[a-z]+)\s*=\s*["'][^"']*["']/gi)) out.push(`${m[1]}="…"`);
  return out;
}
function jsInline(js) {
  const out = [];
  const plain = stripComments(js);
  for (const m of plain.matchAll(/setAttribute\(\s*["'`](style|on[a-z]+)["'`]/g)) out.push(`setAttribute("${m[1]}")`);
  for (const m of plain.matchAll(/\.innerHTML\s*=\s*[^;]*<(?:script|style)\b|<[a-z][^>]*\sstyle\s*=\s*\\?["']/gi)) out.push(m[0].slice(0, 50));
  for (const m of plain.matchAll(/\bnew\s+Function\s*\(|\beval\s*\(/g)) out.push(m[0]);
  return out;
}
const STORAGE_API = /\b(localStorage|sessionStorage)\b/;
const OTHER_STORES = /\b(indexedDB|caches\.(?:open|keys|match|delete|has)|document\.cookie|cookieStore|navigator\.storage)\b/;
const storageKeys = (js) => [...stripComments(js).matchAll(/(?:local|session)Storage\.(?:getItem|setItem|removeItem)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);

// The scanners prove themselves on planted examples.
{
  const planted = [
    [htmlLoads('<script src="https://cdn.example.com/x.js"></script>').length === 1, "an outside script"],
    [htmlLoads('<link rel="stylesheet" href="//fonts.example.com/a.css">').length === 1, "an outside stylesheet"],
    [htmlLoads('<script src="js/main.js"></script><link rel="stylesheet" href="css/app.css">').length === 0, "local files pass"],
    [cssLoads("@font-face { src: url(https://fonts.example.com/f.woff2); }").length === 1, "an outside font"],
    [cssLoads("@import url('https://example.com/a.css');").some((x) => x.startsWith("@import")), "an outside @import"],
    [cssLoads(".a { background: url(\"data:image/svg+xml,%3Csvg%3E\"); }").length === 0, "a data URI passes"],
    [jsLoads('import { x } from "https://esm.example.com/x.js";').length === 1, "an outside module"],
    [jsLoads('const m = await import("https://esm.example.com/x.js");').length === 1, "an outside dynamic import"],
    [htmlInline("<script>alert(1)</script>").length === 1, "an inline script"],
    [htmlInline('<div style="color:red"></div><button onclick="x()"></button>').length === 2, "inline style and handler"],
    [jsInline('el.setAttribute("style", "color:red");').length === 1, "a style attribute from code"],
    [STORAGE_API.test("try { sessionStorage.setItem(KEY, key); } catch {}") && OTHER_STORES.test("const db = indexedDB.open('x');") && OTHER_STORES.test("document.cookie = 'a=1'"), "session storage, a database and a cookie"],
    [storageKeys('localStorage.setItem("introSeen", "1")').join() === "introSeen", "a storage key"]
  ];
  for (const [ok, what] of planted) check(ok, `self-test: ${what}`);
}

// ---- policy ----------------------------------------------------------------------------------------
const html = read("index.html");
const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/g)].map((m) => m[1]);
check(metas.length === 1, `index.html has exactly one policy meta tag (${metas.length})`);
check(metas[0] === POLICY, `the policy is exactly the brief's${metas[0] === POLICY ? "" : `: ${metas[0]}`}`);
check(/<head>[\s\S]*?<meta charset="utf-8">[\s\S]*?http-equiv="Content-Security-Policy"[\s\S]*?<link rel="stylesheet"/.test(html), "the policy comes before any stylesheet or script");
const config = read("js/config.js");
check((/export const CSP = "([^"]+)";/.exec(config) || [])[1] === POLICY, "js/config.js holds the same policy");

// ---- loads -----------------------------------------------------------------------------------------
const css = walk("css", ".css");
const js = walk("js", ".js");
const data = [...walk("data", ".js"), ...walk("schemas", ".js")];
const htmlOut = htmlLoads(html);
check(!htmlOut.length, `index.html loads nothing from another site${htmlOut.length ? `: ${htmlOut.join(", ")}` : ""}`);
const cssOut = css.flatMap((f) => cssLoads(read(f)).map((x) => `${f}: ${x}`));
check(!cssOut.length, `${css.length} stylesheet(s) load nothing from another site${cssOut.length ? `: ${cssOut.join(", ")}` : ""}`);
const viciCss = cssLoads(read("vici/dist/vici.min.css"));
check(!viciCss.length, `Vici's stylesheet loads its fonts and icons from this site${viciCss.length ? `: ${viciCss.slice(0, 3).join(", ")}` : ""}`);
const jsOut = [...js, ...data, "vici/dist/vici.js"].flatMap((f) => jsLoads(read(f)).map((x) => `${f}: ${x}`));
check(!jsOut.length, `no script imports or opens anything from another site${jsOut.length ? `: ${jsOut.join(", ")}` : ""}`);
// Hosts named in code: the API (the only one the page connects to), links a person opens and the
// schemas' own identifiers.
const LINK_HOSTS = new Set(["platform.claude.com", "victorpflueger.github.io", "json-schema.org", "example.org"]);
const hosts = new Map();
for (const f of [...js, ...data]) for (const h of hostsIn(read(f))) if (!hosts.has(h)) hosts.set(h, f);
const unknown = [...hosts].filter(([h]) => h !== "api.anthropic.com" && !LINK_HOSTS.has(h));
check(!unknown.length, `code names api.anthropic.com and links only${unknown.length ? `; also ${unknown.map(([h, f]) => `${h} (${f})`).join(", ")}` : ""}`);
const fetches = [...js, ...data].flatMap((f) => [...stripComments(read(f)).matchAll(/\bfetch\(\s*([^,)]+)/g)].map((m) => `${f}: ${m[1].trim()}`));
const okFetch = (x) => /ANTHROPIC\.(messagesUrl|modelsUrl|countTokensUrl)|\burl\b/.test(x);
check(fetches.length > 0 && fetches.every(okFetch) && fetches.every((x) => x.startsWith("js/anthropic.js")), `only the shared client calls fetch, with the API's addresses (${fetches.length} call sites)`);
const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
check(hrefs.every((h) => /^https:\/\/(www\.linkedin\.com\/in\/victorpflueger|victorpflueger\.github\.io\/)/.test(h) || h.startsWith("#")), `the page links only to Victor's profiles and sites (${hrefs.length} links)`);
check(!/github\.com\/VictorPflueger\/PrototypeIdeator/i.test(html), "the page doesn't link to its own repository");

// ---- inline ----------------------------------------------------------------------------------------
const inl = htmlInline(html);
check(!inl.length, `index.html has no inline script, style or handler${inl.length ? `: ${inl.join(", ")}` : ""}`);
const jsInl = [...js, ...data].flatMap((f) => jsInline(read(f)).map((x) => `${f}: ${x}`));
check(!jsInl.length, `no code writes a style attribute, a handler or a script as text, or evaluates text${jsInl.length ? `: ${jsInl.join("; ")}` : ""}`);

// ---- storage ---------------------------------------------------------------------------------------
const ALLOWED = new Set(["js/theme.js", "js/lang.js", "js/i18n/index.js"]);
const using = [...js, ...data].filter((f) => STORAGE_API.test(stripComments(read(f))));
const strayModules = using.filter((f) => !ALLOWED.has(f));
check(!strayModules.length, `localStorage and sessionStorage appear only in ${[...ALLOWED].join(", ")}${strayModules.length ? `; also in ${strayModules.join(", ")}` : ` (${using.length} module(s) use them)`}`);
const other = [...js, ...data, "index.html"].filter((f) => OTHER_STORES.test(stripComments(read(f))));
check(!other.length, `no IndexedDB, Cache API or cookie anywhere${other.length ? `: ${other.join(", ")}` : ""}`);
const literal = js.flatMap((f) => storageKeys(read(f)).map((k) => [f, k]));
const strays = literal.filter(([, k]) => k !== "pi.lang" && k !== "vc-theme" && !k.startsWith("vc-guide:"));
check(!strays.length, `every literal storage key is pi.lang, vc-theme or Vici's vc-guide: note${strays.length ? `: ${strays.map(([f, k]) => `${k} (${f})`).join(", ")}` : ` (${literal.length} uses)`}`);
const prefix = /id:\s*"([a-z]+)"/.exec(config)[1];
const storageBlock = /export const STORAGE = \{([\s\S]*?)\};/.exec(config)[1];
const declared = [...storageBlock.matchAll(/`\$\{P\}([^`]+)`/g)].map((m) => `${prefix}.${m[1]}`);
check(prefix === "pi" && declared.join() === "pi.lang", `js/config.js declares one storage key, under "pi." (${declared.join(", ")})`);
for (const f of ["js/keystore.js", "js/session.js"]) {
  const plain = stripComments(read(f));
  check(!STORAGE_API.test(plain) && !OTHER_STORES.test(plain), `${f} names no browser storage: memory only`);
}
check(/let key = null;/.test(read("js/keystore.js")), "the key lives in one module variable");

for (const p of passes) console.log(`PASS  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`${passes.length}/${passes.length + failures.length} policy checks passed.`);
if (failures.length) process.exit(1);
console.log("POLICY OK");
