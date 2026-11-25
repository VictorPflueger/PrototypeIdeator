// The page in Chromium, as a visitor meets it. Six parts, each with its own success token:
//   languages  (AC-03) a first visit opens in English under a German browser; the EN and DE switch
//              changes every text, attribute and the title without a reload, and is remembered; each
//              language opens its own guide by itself, and only its own guide's button shows;
//   tiles      the four key figures answer first: before anything runs each shows a value or the
//              ellipsis with what it waits for, is named in both languages and has its row in both guides;
//   storage    (brief §5.9) after boot, a language switch, a theme switch, both guides and a challenger's
//              report read in a live run, storage holds
//              only vc-theme, pi.lang and Vici's vc-guide note, with no database, cache or cookie, and the
//              page asked no other host for anything;
//   chart      the chart of score against build effort names every idea on screen and on paper: no label
//              over another label, a marker or a range line, none outside the plot, and leaders that cross
//              no label (S1 to S3, Victor's live run of 25 November 2026 and ten crowded German names);
//   layout     at 1920 x 1080 and 1280 x 720, and between them at 1600 x 900 and 1366 x 768 (every step
//              of S1 and the live intake, which print BETWEEN SIZES LAID OUT), light and dark, English and
//              German: no sideways scroll, no page scroll, no text cut off, the Your turn bar covers nothing,
//              and no page error; and every
//              visible text reaches 4.5:1 and every icon 3:1 against the fill it sits on, as rendered (a
//              callout keeps its pastel in the dark theme, so a page-theme token inside it can vanish); the
//              live screens too (the dialog, a step at work, an error, a stopped step, the live report, from
//              S1's reports against the scripted stand-in), which print LIVE VIEWS LAID OUT; and every
//              target at least 40 px, which prints TARGETS AT LEAST 40 PX; and, from 0.4.0, the report's
//              views (the Report step of S1 to S3, the live report, the build brief's drawers), which print
//              REPORT VIEWS LAID OUT;
//   comb       the comb of ideas for every count from 1 to 10, drawn by the app's honeycomb() where the page
//              draws it (the Ideate step at 1920 x 1080 and 1280 x 720, the report's cover on screen and on
//              paper with the media 673 and 794 px wide): the columns the app gives it, no two cells
//              overlapping, every cell inside its box and every label inside its cell;
//   probe      the Ideator probe's console line (js/probe.js SNIPPET), run in the page as served under its
//              security policy, against a stand-in for api.anthropic.com: it asks for the key in a dialog,
//              sends three requests to the API host only, prints two tables, keeps nothing in storage
//              and never writes the key to the console.
// Prints PAGE LANGUAGES OK, PAGE TILES OK, PAGE STORAGE OK, COMB LAID OUT, CHART LABELS PLACED, PAGE LAYOUT OK
// and PAGE PROBE OK.
// Usage: node tests/page.mjs [languages|tiles|storage|comb|chart|layout|probe]
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
    const script = { dialog: [], busy: [{ answer: a.merges }, { answer: a.ideas }], error: [{ answer: a.merges }, { error: { status: 401, type: "authentication_error", message: "invalid x-api-key" } }], failed: failing, "failed-open": failing, report: [{ answer: a.merges }, { answer: a.ideas }, { answer: a.recommendation }], brief: [{ answer: a.merges }, { answer: a.ideas }, { answer: a.recommendation }] }[kind];
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
    if (kind === "brief") {
      // The live brief's drawer before the Brief writer runs: its cost, the AI notice and Write the idea's part.
      await page.click("#btn-brief");
      await page.waitForSelector("#brief-drawer[open] #brief-write");
      await page.waitForTimeout(250);
      return { context, page, errors, ok: true };
    }
    return { context, page, errors, ok: !!(await page.$(".live-measured")) };
  }

  // ---- comb --------------------------------------------------------------------------------------------
  // The comb of ideas for every count a run can have, 1 to 10, drawn by the app's own honeycomb() where the
  // page draws it: in the Ideate step at both sizes, on the report's cover on screen, and on the cover as
  // A4 prints it (its 178 mm of width). In a honeycomb two cells' centres lie at least a cell's height apart;
  // closer, they overlap. Every cell keeps inside its box, and every label inside its cell.
  if (want("comb")) {
    const res = [];
    const NAMES = ["Allowance Gap Agent", "Route Switch Desk", "Zertifikatslücken-Agent", "Instant Spot Quote", "Emissions per Box", "FuelEU Pool Planner", "Surcharge Explainer", "Spot-Sofortangebot", "Empty Moves Planner", "Leercontainer-Planer"];
    const LAY = async ({ n, names, where, print }) => {
      const { honeycomb } = await import("/js/charts.js");
      const root = print ? document.querySelector("body > [data-vc-print]") : document;
      const old = root.querySelector(where);
      const ideas = names.slice(0, n).map((name, i) => ({ id: `P${i + 1}`, name }));
      const scores = Object.fromEntries(ideas.map((x, i) => [x.id, (4.7 - i * 0.15).toFixed(2)]));
      const still = !!old.closest(".vc-report");
      const comb = honeycomb(ideas, { picks: ideas.slice(0, 3).map((x) => x.id), still, scores: still ? scores : null });
      const keep = old.closest(".ideas-comb-wrap") || old;
      keep.replaceWith(comb);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const ul = comb.matches(".ideas-comb") ? comb : comb.querySelector(".ideas-comb");
      const cells = [...ul.children].map((li) => li.getBoundingClientRect());
      const h = cells[0].height;
      let min = Infinity;
      for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j];
        min = Math.min(min, Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2));
      }
      const box = ul.closest(print ? ".vc-report__page" : ".evidence, .vc-report__page");
      const cs = getComputedStyle(box);
      const r = box.getBoundingClientRect();
      const inner = { left: r.left + parseFloat(cs.paddingLeft) - 1, right: r.right - parseFloat(cs.paddingRight) + 1, top: r.top - 1, bottom: r.bottom + 1 };
      const outside = cells.filter((c) => c.left < inner.left || c.right > inner.right || c.top < inner.top || c.bottom > inner.bottom).length;
      const spill = [...ul.querySelectorAll(".comb-tile")].filter((tile) => tile.scrollHeight > tile.clientHeight + 1 || tile.scrollWidth > tile.clientWidth + 1).map((tile) => tile.textContent.trim().slice(0, 24));
      // The columns the app gives the comb: one row up to six ideas, then four or six columns.
      const cols = getComputedStyle(ul).gridTemplateColumns.split(" ").filter(Boolean).length;
      const want = n <= 6 ? n : n <= 8 ? 4 : 6;
      return { overlap: n > 1 && min < h * 0.99, min: Math.round(min), h: Math.round(h), outside, spill, cols, want };
    };
    const verdict = (label, all) => {
      const bad = all.filter(([, m]) => m.overlap || m.outside || m.spill.length || m.cols !== m.want);
      return [!bad.length, `${label}: 1 to 10 ideas lay out in the columns the app gives them, with no two cells overlapping, every cell inside its box and every label inside its cell${bad.length ? `: ${bad.map(([n, m]) => `${n} ideas (${m.cols} columns for ${m.want}, centres ${m.min} px apart for cells ${m.h} px high${m.outside ? `, ${m.outside} outside` : ""}${m.spill.length ? `, labels spill: ${m.spill.join(", ")}` : ""})`).join("; ")}` : ""}`];
    };
    for (const [width, height] of [[1920, 1080], [1280, 720]]) {
      for (const [step, where, label] of [[3, ".evidence .ideas-comb", "the Ideate step"], [6, "#report-doc .vc-report__cover .ideas-comb", "the report's cover"]]) {
        const { context, page, errors } = await open(`?guide=0&lang=en&scenario=s1&step=${step}`, { width, height, locale: "en-GB" });
        const all = [];
        for (let n = 1; n <= 10; n++) all.push([n, await page.evaluate(LAY, { n, names: NAMES, where, print: false })]);
        res.push(verdict(`${label} at ${width} x ${height}`, all));
        res.push([!errors.length, `${label} at ${width} x ${height}: no page error${errors.length ? `: ${errors.slice(0, 2).join("; ")}` : ""}`]);
        await context.close();
      }
    }
    // On paper: the print copy at A4's 178 mm between its margins, under the print styles. A print dialog
    // reports A4's page area, 178 mm or 673 px, to the media queries (a printed comb fell to Vici's phone
    // rule there, in Victor's first printed report of 25 November 2026); Chromium's page.pdf() reports the
    // sheet's 210 mm, 794 px. The comb is laid out in a window of each width, the copy kept to 178 mm.
    for (const width of [673, 794]) {
      const { context, page, errors } = await open("?guide=0&lang=en&scenario=s1&step=6", { width, height: 1123, locale: "en-GB" });
      await page.evaluate(() => { window.Vici.report.prepare(document.getElementById("report-doc")); document.querySelector("body > [data-vc-print]").style.width = "178mm"; });
      await page.emulateMedia({ media: "print" });
      const all = [];
      for (let n = 1; n <= 10; n++) all.push([n, await page.evaluate(LAY, { n, names: NAMES, where: ".vc-report__cover .ideas-comb", print: true })]);
      res.push(verdict(`the report's cover on paper, media ${width} px wide`, all));
      res.push([!errors.length, `the cover on paper at ${width} px: no page error${errors.length ? `: ${errors.slice(0, 2).join("; ")}` : ""}`]);
      await context.close();
    }
    report("comb", res, "COMB LAID OUT");
  }

  // ---- chart -------------------------------------------------------------------------------------------
  // The chart of score against build effort names every idea, on screen (the Score step) and on paper (the
  // report's glance): every marker has its label, no label covers another label, a marker or a range line,
  // none leaves the plot, and a leader, where one is drawn, crosses no other label. Victor's first printed
  // live run of 25 November 2026 left one of five ideas without a name, and the range lines ran through the
  // names. Measured with the labels as rendered (getBBox), for the three scenarios in both languages, for that
  // live run's five ideas, and for ten ideas with long German names crowded round one score.
  if (want("chart")) {
    const res = [];
    const MEASURE_CHART = (sel) => {
      const svg = document.querySelector(sel)?.querySelector("svg.score-chart");
      if (!svg) return { points: 0, labels: 0, out: ["no chart"] };
      const bb = (el) => { const b = el.getBBox(); return { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height }; };
      const hits = (a, b) => a.x1 < b.x2 - 0.5 && b.x1 < a.x2 - 0.5 && a.y1 < b.y2 - 0.5 && b.y1 < a.y2 - 0.5;
      const points = [...svg.querySelectorAll(".chart-point")];
      const labels = [...svg.querySelectorAll(".chart-label")];
      const hexes = points.map((g) => bb(g.querySelector(".chart-hex")));
      const lines = points.map((g) => { const b = bb(g.querySelector(".chart-whisker")); return { ...b, y1: b.y1 - 1, y2: b.y2 + 1 }; });
      const boxes = labels.map(bb);
      const axis = svg.querySelector(".chart-axis line");
      const plot = { x1: Number(axis.getAttribute("x1")) - 1, y2: Number(axis.getAttribute("y1")), x2: svg.viewBox.baseVal.width };
      const out = [];
      const named = new Set(labels.map((l) => l.dataset.idea));
      for (const g of points) if (!named.has(g.dataset.idea)) out.push(`no label for ${g.dataset.idea}`);
      boxes.forEach((a, i) => {
        const name = labels[i].textContent;
        boxes.forEach((b, j) => { if (j > i && hits(a, b)) out.push(`"${name}" covers "${labels[j].textContent}"`); });
        hexes.forEach((hx, j) => { if (hits(a, hx)) out.push(`"${name}" covers the marker of ${points[j].dataset.idea}`); });
        lines.forEach((l, j) => { if (hits(a, l)) out.push(`"${name}" sits on the range line of ${points[j].dataset.idea}`); });
        if (a.x1 < plot.x1 || a.x2 > plot.x2 || a.y1 < 0 || a.y2 > plot.y2) out.push(`"${name}" leaves the plot`);
      });
      // The x axis's ticks read what they mark: each label's number lies where the first and last put it.
      const xt = [...svg.querySelectorAll(".chart-axis text:not(.chart-axis-title)")].filter((t) => t.getAttribute("text-anchor") === "middle").map((t) => ({ x: Number(t.getAttribute("x")), v: Number(t.textContent.replace(/[^\d-]/g, "")) }));
      if (xt.length >= 3) {
        const [a, z] = [xt[0], xt.at(-1)];
        for (const t of xt) {
          const at = a.v + ((t.x - a.x) * (z.v - a.v)) / (z.x - a.x);
          if (Math.abs(at - t.v) > 0.01) out.push(`the tick "${t.v}" marks ${Math.round(at * 100) / 100}`);
        }
      }
      const leaders = [...svg.querySelectorAll(".chart-leader")];
      for (const ln of leaders) {
        const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map((k) => Number(ln.getAttribute(k)));
        for (let k = 1; k < 20; k++) {
          const px = x1 + ((x2 - x1) * k) / 20, py = y1 + ((y2 - y1) * k) / 20;
          const through = boxes.findIndex((b) => px > b.x1 + 1 && px < b.x2 - 1 && py > b.y1 + 1 && py < b.y2 - 1);
          if (through >= 0) { out.push(`a leader crosses "${labels[through].textContent}"`); break; }
        }
      }
      return { points: points.length, labels: labels.length, leaders: leaders.length, out };
    };
    const DRAW = async ({ rows, picks, still }) => {
      const { scoreChart } = await import("/js/charts.js");
      const sel = still ? "#report-doc .rep-page--glance .score-figure" : ".evidence .score-figure";
      const fig = scoreChart(rows, { picks, still, height: still ? 220 : 320 });
      document.querySelector(sel).replaceWith(fig);
      return true;
    };
    const cases = [];
    for (const sc of ["s1", "s2", "s3"]) for (const lang of ["en", "de"]) for (const step of [4, 6]) cases.push({ query: `?guide=0&lang=${lang}&scenario=${sc}&step=${step}`, name: `${sc.toUpperCase()} ${lang}, ${step === 4 ? "Score step" : "report's glance"}`, sel: step === 4 ? ".evidence .score-figure" : "#report-doc .rep-page--glance .score-figure" });
    // Victor's live run of 25 November 2026 (Haiku 5.5, Fast) and ten long German names round one score.
    const victor = [["Heat Plan Advisor", 3.9, 25, 35], ["Grid Load Forecaster", 3.85, 30, 40], ["Meter Visit Planner", 3.75, 20, 28], ["Rival Offer Watch", 3.4, 18, 25], ["Tariff Billing Bridge", 3.2, 20, 30]];
    const crowd = [["Zertifikatslücken-Agent", 4.3, 8, 14], ["Routenwahl-Assistent", 4.25, 10, 16], ["Frachtindex-Wächter", 4.2, 9, 13], ["Emissionen je Container", 4.15, 11, 15], ["FuelEU-Poolplaner", 4.1, 10, 14], ["Spot-Sofortangebot", 4.05, 9, 12], ["Zuschlags-Erklärer", 4, 8, 13], ["Leercontainer-Planer", 3.95, 12, 18], ["Anlaufhafen-Prognose", 3.9, 7, 11], ["Kundendaten-Brücke", 3.85, 10, 15]];
    const rowsOf = (list) => list.map(([name, value, low, high], i) => ({ id: `P${i + 1}`, name, value, low, high }));
    for (const [list, label] of [[victor, "Victor's live run"], [crowd, "ten crowded German names"]]) for (const still of [false, true]) {
      cases.push({ query: `?guide=0&lang=en&scenario=s1&step=${still ? 6 : 4}`, name: `${label}, ${still ? "report's glance" : "Score step"}`, sel: still ? "#report-doc .rep-page--glance .score-figure" : ".evidence .score-figure", draw: { rows: rowsOf(list), picks: ["P1", "P2", "P3"], still } });
    }
    const bad = [];
    let leaders = 0;
    let labelled = 0;
    for (const c of cases) {
      const { context, page, errors } = await open(c.query, { width: 1280, height: 720, locale: "en-GB" });
      await page.evaluate(() => document.fonts.ready);
      if (c.draw) await page.evaluate(DRAW, c.draw);
      const m = await page.evaluate(MEASURE_CHART, c.sel);
      leaders += m.leaders || 0;
      labelled += m.labels;
      if (m.out.length || !m.points || m.labels !== m.points || errors.length) bad.push(`${c.name}: ${[...m.out, ...errors].slice(0, 4).join("; ") || `${m.labels} labels for ${m.points} ideas`}`);
      await context.close();
    }
    res.push([!bad.length, `${cases.length} charts (S1 to S3 in both languages on the Score step and the report's glance, Victor's live run and ten crowded German names on both): ${labelled} labels, one for every idea, none over another label, a marker or a range line, none outside the plot, ${leaders} leaders crossing no label${bad.length ? `:\n      ${bad.slice(0, 8).join("\n      ")}` : ""}`]);
    // Control: a label moved onto another idea's marker, and a label taken away, are caught.
    {
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=4", { width: 1280, height: 720, locale: "en-GB" });
      const caught = await page.evaluate((m) => {
        const measure = new Function(`return (${m})`)();
        const svg = document.querySelector(".evidence svg.score-chart");
        const labels = [...svg.querySelectorAll(".chart-label")];
        const hex = svg.querySelectorAll(".chart-point .chart-hex")[1].getBBox();
        labels[0].setAttribute("x", String(hex.x)); labels[0].setAttribute("y", String(hex.y + hex.height / 2 + 4));
        const moved = measure(".evidence .score-figure").out.some((x) => /covers the marker/.test(x));
        labels[2].remove();
        const gone = measure(".evidence .score-figure").out.some((x) => /^no label for/.test(x));
        return moved && gone;
      }, MEASURE_CHART.toString());
      res.push([caught, "control: a label moved onto another idea's marker, and a label taken away, are caught"]);
      await context.close();
    }
    report("chart", res, "CHART LABELS PLACED");
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
    // Between the two sizes (AC-14 says "1920 x 1080 to 1280 x 720"): a laptop's 1366 x 768 and 1600 x 900,
    // every step of S1 and the live intake, in both languages and themes; they print BETWEEN SIZES LAID OUT.
    for (const [width, height] of [[1600, 900], [1366, 768]]) for (const lang of ["en", "de"]) for (const theme of ["light", "dark"]) {
      for (let step = 1; step <= 6; step++) states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}&scenario=s1&step=${step}`, name: `S1 step ${step}`, between: true });
      states.push({ width, height, lang, theme, query: `?guide=0&lang=${lang}`, name: "live intake", extra: "live", between: true });
    }
    const example = readFileSync(path.join(APP_ROOT, "tests", "fixtures", "strategy-challenge-example.json"), "utf8");
    const failures = [];
    // The report's views (the Report step of S1 to S3, the live report and the brief's drawers): whatever fails
    // in them, for the token REPORT VIEWS LAID OUT.
    const reportIssues = [];
    // What fails between the two sizes, for the token BETWEEN SIZES LAID OUT.
    const betweenIssues = [];
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
      if (/step 6$/.test(st.name)) reportIssues.push(...(ok ? [] : [failures.at(-1)]), ...m.small, ...k.low);
      if (st.between) betweenIssues.push(...(ok ? [] : [failures.at(-1)]), ...m.small.map((x) => `${st.name}, ${st.width} x ${st.height}: ${x}`));
      await context.close();
    }
    const between = states.filter((st) => st.between).length;
    res.push([!failures.length, `${states.length} views (every step of S1 to S3, Score's weights, table and stability, Play running, the Start step with Undo after a switch, the live intake before and after files) at 1920 x 1080 and 1280 x 720, and ${between} between them at 1600 x 900 and 1366 x 768: no sideways or page scroll, nothing cut, nothing under the Your turn bar, no page error${failures.length ? `:\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`]);
    if (between && !betweenIssues.length) console.log("BETWEEN SIZES LAID OUT");
    else console.log(`Between the sizes: ${betweenIssues.slice(0, 8).join("; ")}`);
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
    for (const [width, height] of [[1920, 1080], [1280, 720]]) for (const lang of ["en", "de"]) for (const theme of ["light", "dark"]) for (const kind of ["dialog", "busy", "error", "failed", "failed-open", "report", "brief"]) liveStates.push({ width, height, lang, theme, kind });
    for (const st of liveStates) {
      const view = await liveView(st);
      const m = await view.page.evaluate(MEASURE);
      for (const x of m.small) smallAll.add(`live ${st.kind}: ${x}`);
      const k = await view.page.evaluate(CONTRAST);
      measuredAll += k.measured;
      for (const x of k.low) lowAll.push(`live ${st.kind}, ${st.theme}, ${st.lang}: ${x}`);
      const ok = view.ok && !m.sideways && !m.scroll && !m.cut.length && !m.covered.length && !view.errors.length;
      if (["report", "brief"].includes(st.kind)) reportIssues.push(...(ok ? [] : [`live ${st.kind}`]), ...m.small, ...k.low);
      if (!ok) liveFailures.push(`live ${st.kind}, ${st.width} x ${st.height}, ${st.theme}, ${st.lang}: ${JSON.stringify({ shown: view.ok, sideways: m.sideways, scroll: m.scroll, cut: m.cut.slice(0, 3), covered: m.covered, errors: view.errors })}`);
      await view.context.close();
    }
    res.push([!liveFailures.length, `${liveStates.length} live views (the live-run dialog, a step at work, an API error, a step stopped after two failed checks, with its list of what the checks found closed and open, the live report and the live brief's drawer) at both sizes, in both themes and languages: no sideways or page scroll, nothing cut, nothing under the Your turn bar, no page error${liveFailures.length ? `:\n      ${liveFailures.slice(0, 12).join("\n      ")}` : ""}`]);
    if (!liveFailures.length) console.log("LIVE VIEWS LAID OUT");
    // The idea drawer, the build brief's drawer and the guide sit over the page: their contrast and targets
    // are measured here, and the brief's drawer at both sizes for sideways scroll and cut text too.
    const briefFailures = [];
    for (const [width, height] of [[1920, 1080], [1280, 720]]) for (const theme of ["light", "dark"]) for (const lang of ["en", "de"]) for (const which of ["drawer", "guide", "brief"]) {
      if (which !== "brief" && width === 1280) continue;
      const { context, page, errors } = await open(which === "guide" ? `?lang=${lang}` : `?guide=0&lang=${lang}&scenario=s1&step=${which === "brief" ? 6 : 3}`, { theme, width, height });
      if (which === "drawer") { await page.click('[data-action="open-idea"]'); await page.waitForTimeout(350); }
      if (which === "brief") { await page.click("#btn-brief"); await page.waitForTimeout(350); }
      await page.waitForSelector("dialog[open]");
      if (which === "brief") {
        const b = await page.evaluate(MEASURE);
        reportIssues.push(...b.small);
        const inside = await page.evaluate(() => { const d = document.getElementById("brief-drawer"); return d.scrollWidth <= d.clientWidth + 1 && [...d.querySelectorAll(".brief-block")].every((x) => x.scrollWidth <= x.clientWidth + 1); });
        if (!inside || b.cut.length || errors.length) briefFailures.push(`brief, ${width} x ${height}, ${theme}, ${lang}: ${JSON.stringify({ inside, cut: b.cut.slice(0, 3), errors })}`);
      }
      const k = await page.evaluate(CONTRAST);
      measuredAll += k.measured;
      for (const x of k.low) lowAll.push(`${which}, ${theme}, ${lang}: ${x}`);
      if (which === "brief") reportIssues.push(...k.low);
      // Their targets count too: the measure reads the open dialog's.
      const m = await page.evaluate(MEASURE);
      for (const x of m.small) smallAll.add(`${which}: ${x}`);
      await context.close();
    }
    const lowSeen = [...new Set(lowAll)];
    res.push([!lowSeen.length, `${measuredAll} texts and icons in those views, the idea drawer, the brief's drawer and the guide, light and dark: every text at least 4.5:1 and every icon 3:1 against its own fill${lowSeen.length ? `:\n      ${lowSeen.slice(0, 12).join("\n      ")}` : ""}`]);
    res.push([!briefFailures.length, `the build brief's drawer at both sizes, in both themes and languages: nothing wider than the drawer, no text cut, no page error${briefFailures.length ? `:\n      ${briefFailures.slice(0, 6).join("\n      ")}` : ""}`]);
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
    if (!reportIssues.length && !briefFailures.length) console.log("REPORT VIEWS LAID OUT");
    else console.log(`Report views: ${[...reportIssues, ...briefFailures].slice(0, 8).join("; ")}`);
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
