// The page in Chromium, as a visitor meets it. Four parts, each with its own success token:
//   languages  (AC-03) a first visit opens in English under a German browser; the EN and DE switch
//              changes every text, attribute and the title without a reload, and is remembered; each
//              language opens its own guide by itself, and only its own guide's button shows;
//   tiles      the four key figures answer first: before anything runs each shows a value or the
//              ellipsis with what it waits for, is named in both languages and has its row in both guides;
//   storage    (brief §5.9) after boot, a language switch, a theme switch and both guides, storage holds
//              only vc-theme, pi.lang and Vici's vc-guide note, with no database, cache or cookie, and the
//              page asked no other host for anything;
//   layout     at 1920 x 1080 and 1280 x 720, light and dark, English and German: no sideways scroll, no
//              page scroll, no text cut off, the Your turn bar covers nothing, and no page error.
// Prints PAGE LANGUAGES OK, PAGE TILES OK, PAGE STORAGE OK and PAGE LAYOUT OK.
// Usage: node tests/page.mjs [languages|tiles|storage|layout]
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE, KEYS } from "./lib/harness.mjs";

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const EN = (await import(path.join(APP_ROOT, "js", "i18n", "en.js"))).default;
const DE = (await import(path.join(APP_ROOT, "js", "i18n", "de.js"))).default;
const DICT = { en: EN, de: DE };
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
    const first = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.getElementById("start-title").textContent, en: !!document.querySelector("#guide-en[open]"), de: !!document.querySelector("#guide-de[open]") }));
    res.push([first.lang === "en-GB" && first.title === EN["p.start.title"], `a German browser's first visit opens in English (${first.lang}, "${first.title}")`]);
    res.push([first.en && !first.de, "the English guide opens by itself, the German one doesn't"]);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    res.push([(await page.evaluate(MISMATCHES, EN)).length === 0, "in English, every text and attribute is English"]);
    await page.evaluate(() => { window.__noReload = true; });
    await page.click('.lang-option[data-lang="de"]');
    await page.waitForSelector('html[lang="de"]', { timeout: 5000 });
    const de = await page.evaluate(MISMATCHES, DE);
    res.push([!de.length, `after the switch every text, attribute and the title is German${de.length ? `: ${de.slice(0, 6).join(", ")}` : ""}`]);
    res.push([await page.evaluate(() => window.__noReload === true), "without a reload"]);
    const buttons = await page.evaluate(() => ({ en: document.querySelector('[data-vc-guide-open="guide-en"]').hidden, de: document.querySelector('[data-vc-guide-open="guide-de"]').hidden, pressed: document.querySelector('.lang-option[data-lang="de"]').getAttribute("aria-pressed") }));
    res.push([buttons.en && !buttons.de && buttons.pressed === "true", "only the German guide's button shows, and DE is pressed"]);
    await page.click('[data-vc-guide-open="guide-de"]');
    await page.waitForSelector("#guide-de[open]", { timeout: 5000 });
    const guide = await page.evaluate(() => ({ lang: document.getElementById("guide-de").getAttribute("lang"), title: document.getElementById("guide-de-title").textContent }));
    res.push([guide.lang === "de" && guide.title === "So funktioniert der Prototyp", "the German guide opens from its button, in German"]);
    await page.keyboard.press("Escape");
    await page.click("#turn-primary");
    await page.waitForSelector("#guide-de[open]", { timeout: 5000 });
    res.push([true, "the Your turn bar opens the guide in the page's language"]);
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

  // ---- layout ------------------------------------------------------------------------------------------
  if (want("layout")) {
    const res = [];
    const MEASURE = () => {
      const out = { sideways: document.documentElement.scrollWidth > innerWidth + 1, scroll: document.documentElement.scrollHeight > innerHeight + 1, cut: [], covered: [], small: [] };
      const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden], dialog:not([open]), .vc-visually-hidden"); };
      for (const el of document.querySelectorAll("body *")) {
        if (!visible(el) || el.closest("#boot")) continue;
        const cs = getComputedStyle(el);
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const clips = cs.overflowX !== "visible" || cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none";
        if (hasText && clips && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && !el.matches(".panel, .stage, .vc-table-wrap")) out.cut.push(`${el.tagName.toLowerCase()}.${el.className}: "${el.textContent.trim().slice(0, 30)}"`);
        if (el.matches("button, a[href], input, select, [role=button]") && !el.closest(".vc-visually-hidden")) {
          const r = el.getBoundingClientRect();
          if (r.height < 40 || r.width < 40) out.small.push(`${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.className).split(" ")[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      const bar = document.getElementById("turn");
      if (bar && visible(bar)) {
        const b = bar.getBoundingClientRect();
        for (const sib of bar.parentElement.children) {
          if (sib === bar || !visible(sib)) continue;
          const r = sib.getBoundingClientRect();
          if (r.bottom > b.top + 1 && r.top < b.bottom - 1) out.covered.push(sib.className || sib.tagName);
        }
      }
      return out;
    };
    const smallAll = new Set();
    for (const [width, height] of [[1920, 1080], [1280, 720]]) for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) {
      const { context, page, errors } = await open(`?guide=0&lang=${lang}`, { width, height, theme });
      const m = await page.evaluate(MEASURE);
      m.small.forEach((s) => smallAll.add(s));
      const where = `${width} x ${height}, ${theme}, ${lang === "en" ? "English" : "German"}`;
      const ok = !m.sideways && !m.scroll && !m.cut.length && !m.covered.length && !errors.length;
      res.push([ok, `${where}: no sideways or page scroll, nothing cut, nothing covered, no error${ok ? "" : `: ${JSON.stringify({ sideways: m.sideways, scroll: m.scroll, cut: m.cut.slice(0, 4), covered: m.covered, errors })}`}`]);
      await context.close();
    }
    console.log(`\nTargets under 40 px (AC-14 holds them to 40 px from version 1.0.0): ${[...smallAll].join("; ") || "none"}`);
    report("layout", res, "PAGE LAYOUT OK");
  }
} finally {
  await browser.close();
  await server.close();
}
if (failed) { console.log(`\n${failed} check(s) failed.`); process.exit(1); }
console.log(`\n${tokens.join("\n")}`);
