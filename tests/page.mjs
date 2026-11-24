// The page in Chromium, as a visitor meets it. Four parts, each with its own success token:
//   languages  (AC-03) a first visit opens in English under a German browser; the EN and DE switch
//              changes every text, attribute and the title without a reload, and is remembered; each
//              language opens its own guide by itself, and only its own guide's button shows;
//   tiles      the four key figures answer first: before anything runs each shows a value or the
//              ellipsis with what it waits for, is named in both languages and has its row in both guides;
//   storage    (brief §5.9) after boot, a language switch, a theme switch, both guides and a challenger's
//              report read in a live run, storage holds
//              only vc-theme, pi.lang and Vici's vc-guide note, with no database, cache or cookie, and the
//              page asked no other host for anything;
//   layout     at 1920 x 1080 and 1280 x 720, light and dark, English and German: no sideways scroll, no
//              page scroll, no text cut off, the Your turn bar covers nothing, and no page error; and every
//              visible text reaches 4.5:1 and every icon 3:1 against the fill it sits on, as rendered (a
//              callout keeps its pastel in the dark theme, so a page-theme token inside it can vanish); the
//              live screens too (the dialog, a step at work, an error, a stopped step, the live report, from
//              S1's reports against the scripted stand-in), which print LIVE VIEWS LAID OUT; and every
//              target at least 40 px, which prints TARGETS AT LEAST 40 PX;
//   probe      the Ideator probe's console line (js/probe.js SNIPPET), run in the page as served under its
//              security policy, against a stand-in for api.anthropic.com: it asks for the key in a dialog,
//              sends three requests to the API host only, prints two tables, keeps nothing in storage
//              and never writes the key to the console.
// Prints PAGE LANGUAGES OK, PAGE TILES OK, PAGE STORAGE OK, PAGE LAYOUT OK and PAGE PROBE OK.
// Usage: node tests/page.mjs [languages|tiles|storage|layout|probe]
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE, KEYS, MOCK_KEY } from "./lib/harness.mjs";
import { createFakeClaude } from "./lib/fake-claude.mjs";
import { routeStandIn } from "./lib/live-route.mjs";

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const EN = (await import(path.join(APP_ROOT, "js", "i18n", "en.js"))).default;
const DE = (await import(path.join(APP_ROOT, "js", "i18n", "de.js"))).default;
const DICT = { en: EN, de: DE };
const { scenarioById } = await import(path.join(APP_ROOT, "js", "scenarios.js"));
const KPI = { "kpi-stake": "kpi.atStake", "kpi-covered": "kpi.covered", "kpi-top": "kpi.top", "kpi-cost": "kpi.cost" };

const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8700 + Math.floor(Math.random() * 250));
let failed = 0;
const tokens = [];

/** A fresh context: a German browser by default, every outside request refused and counted. */
async function open(query = "", { width = 1280, height = 720, locale = "de-DE", theme = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale, extraHTTPHeaders: { "Accept-Language": "de-DE,de;q=0.9" } });
  if (theme) await context.addInitScript((t) => { try { localStorage.setItem("vc-theme", t); } catch {} }, theme);
  const outside = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => { outside.push(route.request().url()); return route.abort("blockedbyclient"); });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  let navigations = 0;
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) navigations += 1; });
  await page.goto(`${server.base}${query}`);
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForTimeout(300);
  return { context, page, errors, outside, navigations: () => navigations };
}

function report(name, results, token) {
  console.log(`\n== ${name} ==`);
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  const bad = results.filter(([ok]) => !ok).length;
  failed += bad;
  if (!bad) tokens.push(token);
}

/** Every data-i18n text and data-i18n-attr attribute on the page against a dictionary: the mismatches. */
const MISMATCHES = (dict) => {
  const out = [];
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const want = dict[el.dataset.i18n];
    if (el.textContent !== want) out.push(`${el.dataset.i18n}: "${el.textContent.slice(0, 40)}"`);
  }
  for (const el of document.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (el.getAttribute(attr) !== dict[key]) out.push(`${attr} of ${key}`);
    }
  }
  if (document.title !== dict["app.title"]) out.push("the title");
  return out;
};

try {
  // ---- languages ---------------------------------------------------------------------------------------
  if (want("languages")) {
    const res = [];
    const { context, page, errors } = await open("");
    const first = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.getElementById("step-title").textContent, en: !!document.querySelector("#guide-en[open]"), de: !!document.querySelector("#guide-de[open]") }));
    res.push([first.lang === "en-GB" && first.title === EN["scenario.s1.title"], `a German browser's first visit opens in English (${first.lang}, "${first.title}")`]);
    res.push([first.en && !first.de, "the English guide opens by itself, the German one doesn't"]);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    res.push([(await page.evaluate(MISMATCHES, EN)).length === 0, "in English, every text and attribute is English"]);
    await page.evaluate(() => { window.__noReload = true; });
    await page.click('.lang-option[data-lang="de"]');
    await page.waitForSelector('html[lang="de"]', { timeout: 5000 });
    const de = await page.evaluate(MISMATCHES, DE);
    res.push([!de.length, `after the switch every text, attribute and the title is German${de.length ? `: ${de.slice(0, 6).join(", ")}` : ""}`]);
    const stepDe = await page.evaluate(() => document.getElementById("step-title").textContent);
    res.push([stepDe === DE["scenario.s1.title"], `the step on screen is drawn again in German: "${stepDe}"`]);
    res.push([await page.evaluate(() => window.__noReload === true), "without a reload"]);
    const buttons = await page.evaluate(() => ({ en: document.querySelector('[data-vc-guide-open="guide-en"]').hidden, de: document.querySelector('[data-vc-guide-open="guide-de"]').hidden, pressed: document.querySelector('.lang-option[data-lang="de"]').getAttribute("aria-pressed") }));
    res.push([buttons.en && !buttons.de && buttons.pressed === "true", "only the German guide's button shows, and DE is pressed"]);
    await page.click('[data-vc-guide-open="guide-de"]');
    await page.waitForSelector("#guide-de[open]", { timeout: 5000 });
    const guide = await page.evaluate(() => ({ lang: document.getElementById("guide-de").getAttribute("lang"), title: document.getElementById("guide-de-title").textContent }));
    res.push([guide.lang === "de" && guide.title === "So funktioniert der Prototyp", "the German guide opens from its button, in German"]);
    await page.keyboard.press("Escape");
    await page.click('.lang-option[data-lang="en"]');
    await page.waitForSelector('html[lang="en-GB"]', { timeout: 5000 });
    res.push([(await page.evaluate(MISMATCHES, EN)).length === 0, "and back: every text English again"]);
    await page.click('.lang-option[data-lang="de"]');
    await page.waitForSelector('html[lang="de"]');
    await page.reload();
    await page.waitForSelector('html[data-boot="ready"]');
    res.push([await page.evaluate(() => document.documentElement.lang === "de"), "the choice is remembered on reload"]);
    res.push([!errors.length, `no page error${errors.length ? `: ${errors.join("; ")}` : ""}`]);
    await context.close();
    const fresh = await open("?lang=de");
    const auto = await fresh.page.evaluate(() => ({ de: !!document.querySelector("#guide-de[open]"), en: !!document.querySelector("#guide-en[open]"), lang: document.documentElement.lang }));
    res.push([auto.de && !auto.en && auto.lang === "de", "a first visit in German opens the German guide by itself"]);
    await fresh.page.keyboard.press("Escape");
    await fresh.page.click('.lang-option[data-lang="en"]');
    await fresh.page.reload();
    await fresh.page.waitForSelector('html[data-boot="ready"]');
    await fresh.page.waitForTimeout(400);
    res.push([await fresh.page.evaluate(() => !document.querySelector("dialog[open]")), "the guide opens once per tab, whichever language the page switches to"]);
    await fresh.context.close();
    report("languages", res, "PAGE LANGUAGES OK");
  }

  // ---- tiles -------------------------------------------------------------------------------------------
  if (want("tiles")) {
    const res = [];
    for (const lang of ["en", "de"]) {
      const { context, page } = await open(`?guide=0&lang=${lang}`);
      const tiles = await page.evaluate(() => [...document.querySelectorAll(".kpis [data-vc-kpi]")].map((el) => ({ id: el.id, en: el.dataset.vcKpi, de: el.dataset.vcKpiDe, label: el.querySelector(".vc-stat__label").textContent, value: el.querySelector(".kpi-value").textContent.trim(), note: el.querySelector(".kpi-note").textContent.trim() })));
      res.push([tiles.length === 4, `${lang}: four key figures (${tiles.length})`]);
      for (const tile of tiles) {
        const key = KPI[tile.id];
        const ok = tile.en === EN[`${key}.label`] && tile.de === DE[`${key}.label`] && tile.label === DICT[lang][`${key}.label`] && (tile.value === "…" ? tile.note === DICT[lang][`${key}.wait`] : tile.value.length > 0 && tile.note.length > 0);
        res.push([ok, `${lang}: ${tile.label} shows ${JSON.stringify(tile.value)} and "${tile.note}"`]);
      }
      const rows = await page.evaluate((l) => [...document.querySelectorAll(`#guide-${l} [data-vc-chapter="how"] tbody tr`)].map((tr) => tr.querySelector("th").textContent.trim()), lang);
      const named = tiles.map((tile) => (lang === "de" ? tile.de : tile.en));
      res.push([named.every((n) => rows.includes(n)), `${lang}: the guide's How it works chapter has a row for each (${rows.join(", ")})`]);
      await context.close();
    }
    report("tiles", res, "PAGE TILES OK");
  }

  // ---- storage -----------------------------------------------------------------------------------------
  if (want("storage")) {
    const res = [];
    const { context, page, errors, outside } = await open("");
    const requests = [];
    page.on("request", (rq) => requests.push(rq.url()));
    await page.keyboard.press("Escape");
    await page.click('.lang-option[data-lang="de"]');
    await page.waitForSelector('html[lang="de"]');
    await page.click("[data-vc-theme-toggle]");
    await page.click('[data-vc-guide-open="guide-de"]');
    await page.waitForSelector("#guide-de[open]");
    await page.keyboard.press("Escape");
    await page.click("#btn-live");
    await page.waitForTimeout(300);
    // A challenger's report dropped in and read: the files and the issues stay in memory.
    await page.setInputFiles("#intake-files", [{ name: "tidewell-bmc.json", mimeType: "application/json", buffer: Buffer.from(readFileSync(path.join(APP_ROOT, "tests", "fixtures", "strategy-challenge-example.json"), "utf8")) }]);
    await page.waitForTimeout(300);
    await page.click("#btn-cta");
    await page.waitForTimeout(300);
    const read = await page.evaluate(() => document.querySelectorAll(".issue-row").length);
    res.push([read === 1, "a challenger's report dropped on the live Start step is read into one issue"]);
    const look = () => page.evaluate(async () => ({
      local: Object.keys(localStorage).sort(),
      session: Object.keys(sessionStorage).sort(),
      dbs: (await indexedDB.databases()).map((d) => d.name),
      caches: await caches.keys(),
      cookie: document.cookie
    }));
    const allowed = (s) => s.local.every((k) => k === KEYS.lang || k === KEYS.theme) && s.session.every((k) => k.startsWith(KEYS.guidePrefix)) && !s.dbs.length && !s.caches.length && s.cookie === "";
    // The check can fail: a planted key is caught, then removed.
    await page.evaluate(() => sessionStorage.setItem("pi.planted", "x"));
    const planted = await look();
    res.push([!allowed(planted), "control: a planted session-storage key is caught"]);
    await page.evaluate(() => sessionStorage.removeItem("pi.planted"));
    const s = await look();
    res.push([allowed(s) && s.local.includes(KEYS.lang) && s.local.includes(KEYS.theme) && s.session.length >= 1, `storage holds only ${[...s.local, ...s.session].join(", ")}; no database, cache or cookie`]);
    res.push([!outside.length && requests.every((u) => u.startsWith(server.base)), `no request to another host (${outside.length} refused, ${requests.length} to this site after boot)`]);
    res.push([!errors.length, `no page error${errors.length ? `: ${errors.join("; ")}` : ""}`]);
    await context.close();
    report("storage", res, "PAGE STORAGE OK");
  }

  /**
   * A live screen of S1's three reports against the stand-in: the dialog open, a step at work (the Ideator's
   * answer held), an API error on the Ideator, the Ideator's answer failing twice (failed-open: with the list
   * of what the checks found opened), or the live report.
   * Returns { context, page, errors, ok }, ok when the screen asked for is on show.
   */
  async function liveView({ width, height, lang, theme, kind }) {
    const sc = scenarioById("s1");
    const a = sc.answers[lang];
    const bad = structuredClone(a.ideas);
    bad.ideas[0].issues = ["bmc-I99"];
    const failing = [{ answer: a.merges }, { answer: bad }, { answer: bad }];
    const script = { dialog: [], busy: [{ answer: a.merges }, { answer: a.ideas }], error: [{ answer: a.merges }, { error: { status: 401, type: "authentication_error", message: "invalid x-api-key" } }], failed: failing, "failed-open": failing, report: [{ answer: a.merges }, { answer: a.ideas }, { answer: a.recommendation }] }[kind];
    const fake = createFakeClaude(script);
    const context = await browser.newContext({ viewport: { width, height } });
    if (theme) await context.addInitScript((t) => { try { localStorage.setItem("vc-theme", t); } catch {} }, theme);
    await routeStandIn(context, fake, { hold: kind === "busy" ? (n) => (n === 2 ? 120000 : 0) : null });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    await page.goto(`${server.base}?guide=0&lang=${lang}`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await page.click("#btn-live");
    const files = sc.documents.filter((d) => d.kind === "handoff").map((d) => ({ name: d.name[lang], mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sc.files[d.id][lang], null, 2)) }));
    await page.setInputFiles("#intake-files", files);
    await page.waitForTimeout(200);
    await page.selectOption("#intake-count", String(a.ideas.ideas.length));
    await page.click("#btn-cta");
    await page.waitForSelector("#live-dialog[open]");
    if (kind === "dialog") { await page.waitForTimeout(250); return { context, page, errors, ok: true }; }
    await page.fill("#live-key", MOCK_KEY);
    await page.check("#live-ack");
    await page.click("#live-start");
    const settled = (step) => page.waitForFunction((n) => !!document.querySelector(`.step[data-step="${n}"]`) && !document.querySelector("#turn[aria-busy]"), step, { timeout: 30000 });
    await settled("read");
    await page.click("#btn-cta");
    if (kind === "busy") { await page.waitForSelector("#turn.turn-bar--busy"); await page.waitForTimeout(1200); return { context, page, errors, ok: true }; }
    if (kind === "error" || kind.startsWith("failed")) {
      await page.waitForSelector("#turn.turn-bar--stopped", { timeout: 30000 });
      // failed-open: the person opens What the checks found, and the bar grows.
      if (kind === "failed-open") await page.click(".stop-problems summary");
      await page.waitForTimeout(250);
      return { context, page, errors, ok: kind !== "failed-open" || !!(await page.$(".stop-problems[open]")) };
    }
    await settled("ideate");
    for (const step of ["score", "shortlist", "report"]) { await page.click("#btn-cta"); await settled(step); }
    await page.waitForTimeout(250);
    return { context, page, errors, ok: !!(await page.$(".live-measured")) };
  }

  // ---- layout ------------------------------------------------------------------------------------------
  if (want("layout")) {
    const res = [];
    const MEASURE = () => {
      const out = { sideways: document.documentElement.scrollWidth > innerWidth + 1, scroll: document.documentElement.scrollHeight > innerHeight + 1, cut: [], covered: [], small: [] };
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden], dialog:not([open]), .vc-visually-hidden"); };
      const scope = document.querySelector("dialog[open]") || document.body;
      for (const el of scope.querySelectorAll("*")) {
        if (!visible(el) || el.closest("#boot")) continue;
        const cs = getComputedStyle(el);
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const clips = cs.overflowX !== "visible" || cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none";
        if (hasText && clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && !el.matches(".panel, .stage, .vc-table-wrap")) out.cut.push(`${el.tagName.toLowerCase()}.${el.className}: "${el.textContent.trim().slice(0, 30)}"`);
        if (el.matches("button, a[href], input, select, summary, [role=button]") && !el.closest(".vc-visually-hidden")) {
          // A real input kept out of sight (the drop zone's) is reached through its label: the label is the target.
          let target = el;
          const box = el.getBoundingClientRect();
          if (el.matches("input") && (box.width < 4 || box.height < 4 || cs.opacity === "0")) target = el.labels?.[0] || el.closest("label") || el;
          // A box or a radio inside its label: the whole label takes the click, so the label is the target.
          else if (el.matches("input[type=checkbox], input[type=radio]") && el.closest("label")) target = el.closest("label");
          // A link inside running text follows the line it sits in (the inline exception of WCAG 2.5.8).
          const para = el.matches("a") ? el.closest("p") : null;
          if (para && para.textContent.trim().length > el.textContent.trim().length + 3) continue;
          const r = target.getBoundingClientRect();
          if (r.height < 39.5 || r.width < 39.5) out.small.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.className).split(" ")[0]} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      const bar = document.getElementById("turn");
      if (bar && visible(bar)) {
        const b = bar.getBoundingClientRect();
        for (const sib of bar.parentElement.children) {
          if (sib === bar || !visible(sib)) continue;
          const r = sib.getBoundingClientRect();
          if (r.bottom > b.top + 1 && r.top < b.bottom - 1) out.covered.push(`${sib.className || sib.tagName} by ${Math.round(r.bottom - b.top)} px`);
        }
      }
      return out;
    };
    // Rendered contrast: each visible text node's colour against the fill it sits on (a tag's or a step
    // marker's hexagon is painted on ::before, so a covering ::before fill counts first; a ring cut out with
    // evenodd and a bullet do not). Disabled controls are exempt (WCAG 1.4.3), and so is text made
    // transparent on purpose, such as a done step's number under its tick.
    const CONTRAST = () => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1;
      const g = cv.getContext("2d", { willReadFrequently: true });
      const rgba = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data]; };
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const lum = ([r, gr, b]) => 0.2126 * lin(r) + 0.7152 * lin(gr) + 0.0722 * lin(b);
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const pseudo = (e) => {
        const ps = getComputedStyle(e, "::before");
        if (ps.content === "none" || ps.position !== "absolute" || /evenodd/.test(ps.clipPath)) return null;
        const r = e.getBoundingClientRect();
        if (parseFloat(ps.width) < r.width * 0.9 || parseFloat(ps.height) < r.height * 0.9) return null;
        const c = rgba(ps.backgroundColor); return c[3] > 200 ? c : null;
      };
      const fill = (el) => { for (let e = el; e; e = e.parentElement) { const p = pseudo(e); if (p) return p; const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 200) return c; } return rgba(getComputedStyle(document.body).backgroundColor); };
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden], dialog:not([open]), .vc-visually-hidden, [inert]"); };
      const low = [];
      let measured = 0;
      for (const el of (document.querySelector("dialog[open]") || document.body).querySelectorAll("*")) {
        if (el.closest("svg:not(.vc-icon), #boot, :disabled, [aria-disabled='true']")) continue;
        const icon = el.matches(".vc-icon");
        if (!icon && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        if (!visible(el)) continue;
        const fg = rgba(getComputedStyle(el).color);
        if (fg[3] < 20) continue;
        measured += 1;
        const c = ratio(fg, fill(icon ? el.parentElement : el));
        if (c < (icon ? 3 : 4.5)) low.push(`${icon ? "icon" : `"${el.textContent.trim().slice(0, 30)}"`} (${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(" ")[0]}) at ${c.toFixed(2)}:1`);
      }
      return { measured, low };
    };
    const lowAll = [];
    let measuredAll = 0;
    const smallAll = new Set();
    // Every step of every scenario, the Score step's other views, and the live intake before and after
    // files: S1 in every size, theme and language; S2 and S3 in both sizes and languages, light.
    const states = [];
    for (const [width, height] of [[1920, 1080], [1280, 720]]) for (const lang of ["en", "de"]) {
      for (const theme of ["light", "dark"]) {
        for (let step = 1; step <= 6; step++) states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}&scenario=s1&step=${step}`, name: `S1 step ${step}` });
        for (const extra of ["weights", "table", "stability"]) states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}&scenario=s1&step=4`, name: `S1 Score, ${extra}`, extra });
        states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}&scenario=s1&step=1`, name: "S1 playing", extra: "play" });
        for (const to of ["s2", "s3"]) states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}&scenario=s1&step=4`, name: `Start after a switch to ${to.toUpperCase()}, with Undo`, extra: "undo", to });
        states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}`, name: "live intake", extra: "live" });
        states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}`, name: "live intake with files", extra: "files" });
      }
      for (const sc of ["s2", "s3"]) for (let step = 1; step <= 6; step++) states.push({ width, height, lang, theme: "light", query: `?guide=0&lang=${lang}&scenario=${sc}&step=${step}`, name: `${sc.toUpperCase()} step ${step}` });
    }
    const example = readFileSync(path.join(APP_ROOT, "tests", "fixtures", "strategy-challenge-example.json"), "utf8");
    const failures = [];
    for (const st of states) {
      const { context, page, errors } = await open(st.query, { width: st.width, height: st.height, theme: st.theme });
      if (st.extra === "weights") await page.click("#btn-weights");
      if (st.extra === "table" || st.extra === "stability") await page.click(`label:has(#view-${st.extra})`);
      if (st.extra === "play") { await page.click("#btn-play"); await page.waitForTimeout(400); }
      if (st.extra === "undo") {
        await page.click("#btn-weights");
        await page.focus("#w-value");
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(150);
        await page.click("#steps .vc-step:first-child .vc-step__button");
        await page.waitForTimeout(150);
        await page.click(`label:has(#scenario-${st.to})`);
        await page.waitForSelector(".switch-undo");
      }
      if (st.extra === "live" || st.extra === "files") await page.click("#btn-live");
      if (st.extra === "files") {
        const files = ["tidewell-bmc.json", "notes.docx", "q3-notes.md"].map((name) => ({ name, mimeType: "application/octet-stream", buffer: Buffer.from(name.endsWith(".json") ? example : "# Notes\n\nPublic notes.\n") }));
        await page.setInputFiles("#intake-files", files);
      }
      await page.waitForTimeout(250);
      const m = await page.evaluate(MEASURE);
      m.small.forEach((x) => smallAll.add(x));
      const k = await page.evaluate(CONTRAST);
      measuredAll += k.measured;
      for (const x of k.low) lowAll.push(`${st.name}, ${st.theme}, ${st.lang}: ${x}`);
      const ok = !m.sideways && !m.scroll && !m.cut.length && !m.covered.length && !errors.length;
      if (!ok) failures.push(`${st.name}, ${st.width} x ${st.height}, ${st.theme}, ${st.lang}: ${JSON.stringify({ sideways: m.sideways, scroll: m.scroll, cut: m.cut.slice(0, 3), covered: m.covered, errors })}`);
      await context.close();
    }
    res.push([!failures.length, `${states.length} views (every step of S1 to S3, Score's weights, table and stability, Play running, the Start step with Undo after a switch, the live intake before and after files) at 1920 x 1080 and 1280 x 720: no sideways or page scroll, nothing cut, nothing under the Your turn bar, no page error${failures.length ? `:\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`]);
    // Control: a story made taller than its panel is caught as covered or as page scroll.
    {
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=2", { width: 1280, height: 720 });
      await page.evaluate(() => { const p = document.createElement("p"); p.textContent = "x"; p.className = "control-block"; p.style.minHeight = "600px"; document.querySelector(".story").insertBefore(p, document.getElementById("turn")); });
      const m = await page.evaluate(MEASURE);
      res.push([m.covered.length > 0 || m.scroll, "control: a block pushed under the Your turn bar is caught"]);
      await context.close();
    }
    // The live screens (G17): the live-run dialog, a step whose agent is at work, an API error, a step that
    // failed its checks twice, and the live report, each from S1's three reports against the stand-in.
    const liveFailures = [];
    const liveStates = [];
    for (const [width, height] of [[1920, 1080], [1280, 720]]) for (const lang of ["en", "de"]) for (const theme of ["light", "dark"]) for (const kind of ["dialog", "busy", "error", "failed", "failed-open", "report"]) liveStates.push({ width, height, lang, theme, kind });
    for (const st of liveStates) {
      const view = await liveView(st);
      const m = await view.page.evaluate(MEASURE);
      for (const x of m.small) smallAll.add(`live ${st.kind}: ${x}`);
      const k = await view.page.evaluate(CONTRAST);
      measuredAll += k.measured;
      for (const x of k.low) lowAll.push(`live ${st.kind}, ${st.theme}, ${st.lang}: ${x}`);
      const ok = view.ok && !m.sideways && !m.scroll && !m.cut.length && !m.covered.length && !view.errors.length;
      if (!ok) liveFailures.push(`live ${st.kind}, ${st.width} x ${st.height}, ${st.theme}, ${st.lang}: ${JSON.stringify({ shown: view.ok, sideways: m.sideways, scroll: m.scroll, cut: m.cut.slice(0, 3), covered: m.covered, errors: view.errors })}`);
      await view.context.close();
    }
    res.push([!liveFailures.length, `${liveStates.length} live views (the live-run dialog, a step at work, an API error, a step stopped after two failed checks, with its list of what the checks found closed and open, and the live report) at both sizes, in both themes and languages: no sideways or page scroll, nothing cut, nothing under the Your turn bar, no page error${liveFailures.length ? `:\n      ${liveFailures.slice(0, 12).join("\n      ")}` : ""}`]);
    if (!liveFailures.length) console.log("LIVE VIEWS LAID OUT");
    // The idea drawer and the guide sit over the page, so only their contrast is measured here.
    for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) for (const which of ["drawer", "guide"]) {
      const { context, page } = await open(which === "guide" ? `?lang=${lang}` : `?guide=0&lang=${lang}&scenario=s1&step=3`, { theme });
      if (which === "drawer") { await page.click('[data-action="open-idea"]'); await page.waitForTimeout(350); }
      await page.waitForSelector("dialog[open]");
      const k = await page.evaluate(CONTRAST);
      measuredAll += k.measured;
      for (const x of k.low) lowAll.push(`${which}, ${theme}, ${lang}: ${x}`);
      // Their targets count too: the measure reads the open dialog's.
      const m = await page.evaluate(MEASURE);
      for (const x of m.small) smallAll.add(`${which}: ${x}`);
      await context.close();
    }
    const lowSeen = [...new Set(lowAll)];
    res.push([!lowSeen.length, `${measuredAll} texts and icons in those views, the idea drawer and the guide, light and dark: every text at least 4.5:1 and every icon 3:1 against its own fill${lowSeen.length ? `:\n      ${lowSeen.slice(0, 12).join("\n      ")}` : ""}`]);
    // Control: a text in a pale grey on the Your turn bar's pastel is caught. (Before Vici's callout fix the
    // page-theme --vc-on-accent-soft did this in the dark theme; a callout now gives it its own ink.)
    {
      const { context, page } = await open("?guide=0&lang=en", { width: 1280, height: 720, theme: "dark" });
      await page.click("#btn-live");
      await page.waitForTimeout(250);
      await page.evaluate(() => { document.getElementById("cta-reason").style.color = "var(--vc-neutral-300)"; });
      const k = await page.evaluate(CONTRAST);
      res.push([k.low.some((x) => x.includes("turn-reason")), `control: the reason under the action in a pale grey is caught on the bar's pastel (${k.low.find((x) => x.includes("turn-reason")) || "not caught"})`]);
      await context.close();
    }
    // Every target at least 40 px wide and tall (AC-14, brought forward to 0.3.0), with a control: a planted
    // 30 px button is caught.
    const smallSeen = [...smallAll];
    res.push([!smallSeen.length, `every visible target in those views at least 40 px wide and tall${smallSeen.length ? `:\n      ${smallSeen.slice(0, 16).join("\n      ")}` : ""}`]);
    let plantedCaught = false;
    {
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=2", { width: 1280, height: 720 });
      await page.evaluate(() => { const b = document.createElement("button"); b.type = "button"; b.textContent = "x"; b.style.cssText = "min-height:0;height:30px;width:30px;padding:0"; document.querySelector(".story").prepend(b); });
      const m = await page.evaluate(MEASURE);
      plantedCaught = m.small.some((x) => / 30x30$/.test(x));
      res.push([plantedCaught, "control: a planted 30 px button is caught"]);
      await context.close();
    }
    if (!smallSeen.length && plantedCaught) console.log("TARGETS AT LEAST 40 PX");
    report("layout", res, "PAGE LAYOUT OK");
  }

  // ---- probe -------------------------------------------------------------------------------------------
  if (want("probe")) {
    const res = [];
    const { SNIPPET } = await import(path.join(APP_ROOT, "js", "probe.js"));
    const answer = readFileSync(path.join(APP_ROOT, "tests", "fixtures", "ideator-s1-answer.json"), "utf8");
    const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-expose-headers": "*" };
    const events = [
      { type: "message_start", message: { id: "msg_stand_in", model: "stand-in", role: "assistant", content: [], usage: { input_tokens: 3200, output_tokens: 1 } } },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: answer } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 5400 } },
      { type: "message_stop" }
    ];
    const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const api = [];
    const outside = [];
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (u.host !== "api.anthropic.com") { outside.push(u.host); return route.abort("blockedbyclient"); }
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      api.push({ path: u.pathname, key: req.headers()["x-api-key"], body: req.postDataJSON() });
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "text/event-stream" }, body });
    });
    const page = await context.newPage();
    const consoleText = [];
    const tables = [];
    const errors = [];
    page.on("console", (m) => { consoleText.push(m.text()); if (m.type() === "table") tables.push(m); if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    let asked = null;
    page.on("dialog", async (d) => { asked = d.message(); await d.accept(MOCK_KEY); });
    await page.goto(`${server.base}?guide=0`);
    await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    const before = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    await page.evaluate(SNIPPET);
    await page.waitForFunction(() => globalThis.piProbe && globalThis.piProbe.runs.length === 3, null, { timeout: 30000 });
    await page.waitForTimeout(200);
    const after = await page.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookie: document.cookie, dbs: (await indexedDB.databases()).length, caches: (await caches.keys()).length, runs: globalThis.piProbe.runs.map((x) => ({ ideas: x.answer?.ideas?.length || 0, refusals: x.refusals.length, audit: x.audit.length, model: x.request.model })) }));
    res.push([asked === "Claude API key, kept in this tab only", `the line asks for the key in a dialog, not in the console ("${asked}")`]);
    res.push([api.length === 3 && api.every((a) => a.path === "/v1/messages" && a.key === MOCK_KEY) && !outside.length, `it sends three requests to api.anthropic.com/v1/messages with the key in its header, and nothing anywhere else${outside.length ? ` (also asked: ${outside.join(", ")})` : ""}`]);
    res.push([JSON.stringify(api.map((a) => a.body.model)) === JSON.stringify(["claude-haiku-5-5", "claude-haiku-5-5", "claude-sonnet-5-5"]) && after.runs.every((x) => x.ideas === 8 && x.refusals === 0 && x.audit === 0), "the three settings run in order and each answer reads, with eight ideas and nothing refused"]);
    res.push([tables.length === 2, `it prints two tables, the runs and the ideas (${tables.length})`]);
    res.push([JSON.stringify(after.local) === JSON.stringify(before.local) && JSON.stringify(after.session) === JSON.stringify(before.session) && !after.cookie && !after.dbs && !after.caches, "storage is as before the line ran, with no cookie, database or cache"]);
    res.push([!consoleText.some((t) => t.includes(MOCK_KEY) || /sk-ant-/.test(t)), "the key is never written to the console"]);
    res.push([!errors.length, `no page error and no security-policy error${errors.length ? `: ${errors.slice(0, 3).join("; ")}` : ""}`]);
    await context.close();
    report("probe", res, "PAGE PROBE OK");
  }
} finally {
  await browser.close();
  await server.close();
}
if (failed) { console.log(`\n${failed} check(s) failed.`); process.exit(1); }
console.log(`\n${tokens.join("\n")}`);
