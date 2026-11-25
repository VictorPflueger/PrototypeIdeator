// The simulation in Chromium, as a presenter plays it. Seven parts, each with its own success token:
//   scenarios  (G6, AC-05) S1, S2 and S3 play from Start to Report in English and German with no key and
//              every outside host refused; every step says SIMULATION, every step past Start names the
//              company with "Fictional company, illustrative figures", and a scenario older than 90 days
//              offers "Check for updates";
//   figures    (G7, AC-07) before anything runs each tile shows the scenario's value in the simulation and the
//              ellipsis with what it waits for in a live run; a decision strikes the old value through;
//   choices    (G8, AC-05) a parked issue, an undone merge, two issues merged, another weight and another
//              shortlist give the tiles, the score table, the chart, the stability sentence and the summary
//              the engine gives;
//   weights    (G9, AC-20) a weight moved with the keyboard re-ranks at once, with no request, and the table,
//              the chart and the stability sentence follow the engine;
//   play       (G10) Play walks the steps and stops where the person acts (a weight, a view, an idea opened;
//              not the step's own action), Space plays and pauses, the arrow
//              keys and PageUp and PageDown move, ?scenario=s1&step=4 opens the run at Score, paused, and
//              every step has one primary action, in its Your turn bar;
//   ideas      (G11) one honeycomb cell per idea, each reached with the keyboard, and a cell opens the idea's
//              page with all its sections and the seven ratings with reasons; Escape returns to the cell;
//   guide      (G12, AC-04) the guide opens once per tab, ?guide=0 and ?guide=present work, How it works shows
//              each key figure's value of the scenario's run, and the last chapter is a timed script of three
//              to seven steps with those figures.
//   switch     (M3 G6) switching company after a choice says what it set aside and offers Undo, which brings
//              back the company with every choice, in both languages and from the Report step too; a switch
//              before any choice says nothing.
// Prints PRESENTER SCENARIOS OK, PRESENTER FIGURES OK, PRESENTER CHOICES OK, PRESENTER WEIGHTS OK,
// PRESENTER PLAY OK, PRESENTER IDEAS OK, PRESENTER GUIDE OK and PRESENTER SWITCH OK.
// Usage: node tests/presenter.mjs [scenarios|figures|choices|weights|play|ideas|guide|switch]
import path from "node:path";
import { spawn } from "node:child_process";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE, viciDir, REQUIRE_VICI } from "./lib/harness.mjs";

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const imp = (p) => import(path.join(APP_ROOT, p));
const EN = (await imp("js/i18n/en.js")).default;
const DE = (await imp("js/i18n/de.js")).default;
const DICT = { en: EN, de: DE };
const { scenarios, scenarioById } = await imp("js/scenarios.js");
const { recordedRun, buildRun } = await imp("js/simulation.js");
const { tileModel } = await imp("js/kpis.js");
const { decide } = await imp("js/issues.js");
const { placeIdea } = await imp("js/views/shortlist.js");
const { DEFAULT_WEIGHTS, WEIGHT_RULE } = await imp("js/engine.js");
const { fmtScore, fmtEurCompact } = await imp("js/format.js");

const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8450 + Math.floor(Math.random() * 300));
let failed = 0;
const tokens = [];

/** A fresh context with every outside request refused and counted. */
async function open(query, { width = 1280, height = 720, theme = null, clock = null, ready = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  if (theme) await context.addInitScript((th) => { try { localStorage.setItem("vc-theme", th); } catch {} }, theme);
  const outside = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => { outside.push(route.request().url()); return route.abort("blockedbyclient"); });
  const page = await context.newPage();
  if (clock) await page.clock.setFixedTime(new Date(clock));
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await page.goto(`${server.base}${query}`);
  if (ready) await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForTimeout(250);
  return { context, page, errors, outside };
}

function report(name, results, token) {
  console.log(`\n== ${name} ==`);
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  const bad = results.filter(([ok]) => !ok).length;
  failed += bad;
  if (!bad) tokens.push(token);
}

const current = (page) => page.evaluate(() => [...document.querySelectorAll("#steps .vc-step")].findIndex((li) => li.classList.contains("vc-step--current")));
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent.trim() ?? null, sel);
const pausePlay = async (page) => { if (await page.$('#btn-play[data-state="pause"]')) { await page.click("#btn-play"); await page.waitForTimeout(150); } };
const tiles = (page) => page.evaluate(() => Object.fromEntries(["stake", "covered", "top", "cost"].map((k) => {
  const el = document.getElementById(`kpi-${k}`);
  const was = el.querySelector(".kpi-was");
  // The note's own words, and apart from them the lilac line At stake adds for AI estimates.
  const note = el.querySelector(".kpi-note");
  return [k, { value: el.querySelector(".kpi-value").textContent, note: note.firstChild?.nodeType === 3 ? note.firstChild.textContent : note.textContent, ai: note.querySelector(".kpi-ai")?.textContent || "", was: was.hidden ? "" : was.textContent, state: el.dataset.state }];
})));

/** Plays a scenario through the page's own buttons, from Start to Report, calling visit at each step. */
async function walk(page, visit) {
  await visit(0);
  await page.click("#btn-cta");                 // Start: the Reader reads, Play goes on
  await page.waitForTimeout(300);
  await pausePlay(page);
  for (let step = 1; step <= 5; step++) {
    await visit(step);
    if (step < 5) { await page.click("#btn-cta"); await page.waitForTimeout(300); await pausePlay(page); }
  }
}

try {
  // ---- scenarios ------------------------------------------------------------------------------------------
  if (want("scenarios")) {
    const res = [];
    for (const sc of scenarios()) for (const lang of ["en", "de"]) {
      const d = DICT[lang];
      const where = `${sc.id} in ${lang === "en" ? "English" : "German"}`;
      const { context, page, errors, outside } = await open(`?guide=0&lang=${lang}&scenario=${sc.id}`, { clock: "2026-11-24T10:00:00Z" });
      const seen = [];
      let stale = "unchecked";
      let chips = [];
      await walk(page, async (step) => {
        if (step === 0) {
          stale = await page.$(".fiction-line .stale-link");
          chips = await page.evaluate(() => [...document.querySelectorAll(".doc-chip")].map((li) => ({ id: li.dataset.doc, tags: [...li.querySelectorAll(".vc-tag")].map((t) => t.textContent) })));
        }
        const at = await current(page);
        const mode = await text(page, "#mode-text");
        const title = await text(page, "#step-title");
        const kicker = step === 0 ? await text(page, ".fiction-line .fiction-tag") : await text(page, ".step-company .fiction-tag");
        const company = step === 0 ? null : await text(page, ".step-company__name");
        seen.push({ step, at, ok: at === step && mode === "SIMULATION" && !!title && kicker === d["fiction.tag"] && (step === 0 || company === sc.company.name) });
      });
      const report = await page.$("#report-doc .rep-page--short");
      res.push([seen.every((s) => s.ok) && seen.length === 6, `${where}: six steps, each SIMULATION with a title, and the company's name with "${d["fiction.tag"]}"${seen.every((s) => s.ok) ? "" : `: ${JSON.stringify(seen.filter((s) => !s.ok))}`}`]);
      res.push([!!report && (await text(page, "#report-doc .rep-headline"))?.includes(sc.company.name), `${where}: the Report step shows the report, its short version about ${sc.company.name}`]);
      const standIns = sc.documents.filter((x) => x.stand_in).map((x) => x.id);
      const okChips = chips.length === sc.documents.length && chips.every((c) => c.tags.includes(d["doc.standIn"]) === standIns.includes(c.id));
      res.push([okChips && standIns.length > 0, `${where}: the Start step's chips say "${d["doc.standIn"]}" on the ${standIns.length} stand-in report(s) and on nothing else`]);
      res.push([!outside.length && !errors.length, `${where}: no key, no request to any other host and no page error${outside.length || errors.length ? `: ${[...outside, ...errors].join("; ")}` : ""}`]);
      await context.close();
      // The same scenario 100 days on: the Start step offers "Check for updates".
      if (lang === "en") {
        const late = await open(`?guide=0&lang=en&scenario=${sc.id}`, { clock: "2027-03-15T10:00:00Z" });
        const link = await late.page.$(".stale-link");
        const href = link ? await link.getAttribute("href") : "";
        res.push([stale === null && !!link && /DATA_SOURCES\.md$/.test(href), `${sc.id}: no "Check for updates" while fresh, and the link to DATA_SOURCES.md once older than 90 days`]);
        await late.context.close();
      }
    }
    report("scenarios", res, "PRESENTER SCENARIOS OK");
  }

  // ---- figures --------------------------------------------------------------------------------------------
  if (want("figures")) {
    const res = [];
    for (const lang of ["en", "de"]) {
      const sc = scenarioById("s1");
      const d = DICT[lang];
      const { context, page } = await open(`?guide=0&lang=${lang}&scenario=s1`);
      const preview = recordedRun(sc, lang);
      const model = tileModel({ mode: "simulation", run: preview, preview, reached: 0, lang });
      const got = await tiles(page);
      const ok = ["stake", "covered", "top", "cost"].every((k) => got[k].value === model[k].value && got[k].value !== "…" && !got[k].was);
      res.push([ok, `${lang}: before anything runs, the four tiles show S1's values ${Object.values(got).map((x) => x.value).join(" | ")}${ok ? "" : ` (the engine says ${Object.values(model).map((x) => x.value).join(" | ")})`}`]);
      await page.click("#btn-live");
      await page.waitForTimeout(300);
      const live = await tiles(page);
      const waits = { stake: "kpi.atStake.wait", covered: "kpi.covered.wait", top: "kpi.top.wait", cost: "kpi.cost.wait" };
      const okLive = Object.entries(waits).every(([k, key]) => live[k].value === "…" && live[k].note === d[key] && live[k].state === "waiting");
      res.push([okLive, `${lang}: in a live run each tile shows the ellipsis and what it waits for${okLive ? "" : `: ${JSON.stringify(live)}`}`]);
      await page.click("#btn-live");
      await page.waitForTimeout(300);
      // A decision: park the first kept issue that states an amount.
      await page.click("#btn-cta");
      await page.waitForTimeout(300);
      await pausePlay(page);
      const before = (await tiles(page)).stake.value;
      const victim = preview.issues.find((i) => i.status === "kept" && typeof i.eur_year_expected === "number");
      await page.click(`tr[data-issue="${victim.id}"] [data-action="decide-park"]`);
      await page.waitForTimeout(300);
      const after = await tiles(page);
      const decisions = decide(sc.choices.issues, victim.id, "park", { reason: d[`read.reason.${await page.$eval(`tr[data-issue="${victim.id}"] select`, (s) => s.value)}`] });
      const run = buildRun(sc, lang, { decisions });
      const expect = tileModel({ mode: "simulation", run, preview, reached: 1, lang });
      res.push([after.stake.value === expect.stake.value && after.stake.was === before && after.stake.state === "moved" && after.stake.value !== before, `${lang}: parking "${victim.title.slice(0, 40)}…" moves at stake from ${before} to ${after.stake.value}, the old value struck through beside it`]);
      await context.close();
    }
    // Review B2: on the Read step each kept issue shows the value it counts at in At stake, its group's when
    // a merged member's is larger, also when it states none itself; "not stated" only when no fact holds one.
    for (const id of ["s1", "s2", "s3"]) for (const lang of ["en", "de"]) {
      const run = recordedRun(scenarioById(id), lang);
      const { context, page } = await open(`?guide=0&lang=${lang}&scenario=${id}&step=2`);
      const shown = await page.$$eval("tr.issue-row--kept", (trs) => trs.map((tr) => ({ id: tr.dataset.issue, value: tr.querySelector(".stake-cell strong")?.textContent || null })));
      const off = shown.filter((x) => {
        const fact = run.facts[`issue.${x.id}.eur`]?.value;
        return fact === undefined ? x.value !== null : x.value !== fmtEurCompact(fact, lang);
      });
      res.push([shown.length > 0 && !off.length, `${id} ${lang}: each of the ${shown.length} kept issues shows the value it counts at${off.length ? `; off: ${off.map((x) => `${x.id} ${x.value}`).join(", ")}` : ""}`]);
      // Review A6: At stake says in lilac when it holds the Reader's AI estimates, and only then.
      const ai = (await tiles(page)).stake.ai;
      const estimated = run.figures.atStake.estimated > 0;
      res.push([estimated ? ai === DICT[lang]["kpi.atStake.aiSome"] || ai === DICT[lang]["kpi.atStake.aiAll"] : ai === "", `${id} ${lang}: At stake ${estimated ? `says "${ai}", since ${run.figures.atStake.estimated} of its amounts are the Reader's estimates` : "carries no AI line, since no amount is an AI estimate"}`]);
      await context.close();
    }
    report("figures", res, "PRESENTER FIGURES OK");
  }

  // ---- choices --------------------------------------------------------------------------------------------
  if (want("choices")) {
    const res = [];
    for (const sc of scenarios()) {
      const lang = sc.id === "s2" ? "de" : "en";
      const where = `${sc.id} ${lang}`;
      const { context, page, errors, outside } = await open(`?guide=0&lang=${lang}&scenario=${sc.id}`);
      const preview = recordedRun(sc, lang);
      await page.click("#btn-cta");
      await page.waitForTimeout(300);
      await pausePlay(page);
      // 1. undo the first recorded merge; 2. park the first kept issue an idea names.
      let decisions = sc.choices.issues || [];
      const merged = decisions.find((x) => x.action === "merge");
      await page.click(`tr[data-issue="${merged.id}"] [data-action="decide-keep"]`);
      await page.waitForTimeout(250);
      decisions = decide(decisions, merged.id, "keep");
      const named = new Set(preview.ideas.flatMap((i) => i.issues));
      const park = buildRun(sc, lang, { decisions }).issues.find((i) => i.status === "kept" && named.has(i.id) && i.id !== merged.id);
      await page.click(`tr[data-issue="${park.id}"] [data-action="decide-park"]`);
      await page.waitForTimeout(250);
      const reason = DICT[lang][`read.reason.${await page.$eval(`tr[data-issue="${park.id}"] select`, (s) => s.value)}`];
      decisions = decide(decisions, park.id, "park", { reason });
      // 3. merge two: the last kept issue joins the first kept one, as the Merge button proposes.
      const keptNow = buildRun(sc, lang, { decisions }).issues.filter((i) => i.status === "kept");
      const joiner = keptNow[keptNow.length - 1];
      await page.click(`tr[data-issue="${joiner.id}"] [data-action="decide-merge"]`);
      await page.waitForTimeout(250);
      const into = await page.$eval(`tr[data-issue="${joiner.id}"] select`, (s) => s.value);
      decisions = decide(decisions, joiner.id, "merge", { into });
      // 4. ideas, then one weight up two steps with the keyboard.
      await page.click("#btn-cta");
      await page.waitForTimeout(250);
      await pausePlay(page);
      await page.click("#btn-cta");
      await page.waitForTimeout(250);
      await pausePlay(page);
      await page.click("#btn-weights");
      await page.focus("#w-value");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(250);
      const weights = { ...DEFAULT_WEIGHTS, value: DEFAULT_WEIGHTS.value + 2 * WEIGHT_RULE.step };
      let run = buildRun(sc, lang, { decisions, weights });
      const order = await page.evaluate(() => [...document.querySelectorAll(".chart-point")].map((g) => g.dataset.idea));
      await page.click("label:has(#view-table)");
      await page.waitForTimeout(200);
      const table = await page.evaluate(() => [...document.querySelectorAll("#score-table tbody tr")].map((tr) => tr.dataset.idea));
      await page.click("label:has(#view-stability)");
      await page.waitForTimeout(200);
      const sentence = await text(page, ".stability-sentence");
      res.push([JSON.stringify(table) === JSON.stringify(run.ranked.map((r) => r.id)) && JSON.stringify(order) === JSON.stringify(run.ranked.map((r) => r.id)), `${where}: after an undone merge, a parked issue, two issues merged and Business value at ${weights.value} %, the table and the chart rank ${table.join(" ")} as the engine does`]);
      res.push([sentence === run.sentence, `${where}: the stability sentence is the engine's: "${(sentence || "").slice(0, 60)}…"`]);
      // 5. another shortlist: the fifth idea first, then write the report.
      await page.click("#btn-cta");
      await page.waitForTimeout(250);
      await pausePlay(page);
      const fifth = run.ranked[4].id;
      await page.click(`tr[data-idea="${fifth}"] [data-action="place"][data-place="1"]`);
      await page.waitForTimeout(250);
      const picks = placeIdea(run.shortlist.picks.map((p) => p.idea), fifth, 1);
      await page.click("#btn-cta");
      await page.waitForTimeout(300);
      await pausePlay(page);
      run = buildRun(sc, lang, { decisions, weights, picks, decided: true });
      const expect = tileModel({ mode: "simulation", run, preview, reached: 5, lang });
      const got = await tiles(page);
      const okTiles = ["stake", "covered", "top"].every((k) => got[k].value === expect[k].value && got[k].note === expect[k].note && got[k].ai === (expect[k].ai || ""));
      res.push([okTiles, `${where}: the tiles show ${["stake", "covered", "top"].map((k) => got[k].value).join(" | ")}, as the engine works out${okTiles ? "" : ` (engine: ${["stake", "covered", "top"].map((k) => `${expect[k].value} ${expect[k].note}`).join(" | ")})`}`]);
      const found = await page.evaluate(() => document.querySelector("#report-doc .rep-page--short")?.textContent || "");
      const okReport = Object.values(run.recommendation || {}).every((s) => found.includes(s.slice(0, 50))) && found.includes(run.recommended[0].name);
      res.push([okReport, `${where}: the summary carries the engine's sentences and names ${run.recommended[0].name} first`]);
      res.push([!outside.length && !errors.length, `${where}: no request to any other host and no page error`]);
      await context.close();
    }
    report("choices", res, "PRESENTER CHOICES OK");
  }

  // ---- switch ---------------------------------------------------------------------------------------------
  if (want("switch")) {
    const res = [];
    const s1 = scenarioById("s1");
    const undoOf = (page) => page.evaluate(() => { const u = document.querySelector(".switch-undo"); return u ? { text: u.querySelector(".switch-undo__text").textContent.trim(), button: u.querySelector('[data-action="undo-switch"]')?.textContent.trim() || "" } : null; });
    const chosen = (page) => page.evaluate(() => document.querySelector('.scenario-switch input:checked')?.value || null);
    for (const lang of ["en", "de"]) {
      const D = DICT[lang];
      const { context, page, errors, outside } = await open(`?guide=0&lang=${lang}&scenario=s1`);
      // Before any choice: a switch says nothing.
      await page.click('label:has(#scenario-s2)');
      await page.waitForTimeout(250);
      const quiet = await undoOf(page);
      res.push([quiet === null && (await chosen(page)) === "s2", `${lang}: a switch before any choice says nothing (${quiet ? `"${quiet.text}"` : "no notice"})`]);
      await page.click('label:has(#scenario-s1)');
      await page.waitForTimeout(250);
      // Choices: park the first kept issue an idea names, then move one weight two steps.
      await page.click("#btn-cta");
      await page.waitForTimeout(300);
      await pausePlay(page);
      const preview = recordedRun(s1, lang);
      const named = new Set(preview.ideas.flatMap((i) => i.issues));
      const park = preview.issues.find((i) => i.status === "kept" && named.has(i.id));
      await page.click(`tr[data-issue="${park.id}"] [data-action="decide-park"]`);
      await page.waitForTimeout(250);
      const reason = D[`read.reason.${await page.$eval(`tr[data-issue="${park.id}"] select`, (x) => x.value)}`];
      const decisions = decide(s1.choices.issues || [], park.id, "park", { reason });
      await page.click("#btn-cta");
      await page.waitForTimeout(250);
      await pausePlay(page);
      await page.click("#btn-cta");
      await page.waitForTimeout(250);
      await pausePlay(page);
      await page.click("#btn-weights");
      await page.focus("#w-value");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(120);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(250);
      const weights = { ...DEFAULT_WEIGHTS, value: DEFAULT_WEIGHTS.value + 2 * WEIGHT_RULE.step };
      const before = await tiles(page);
      // Back to Start and to another company.
      await page.click("#steps .vc-step:first-child .vc-step__button");
      await page.waitForTimeout(250);
      await page.click('label:has(#scenario-s3)');
      await page.waitForTimeout(300);
      const notice = await undoOf(page);
      // Parking an issue that others were merged into keeps those again, so more than one issue changes.
      const recorded = new Map((s1.choices.issues || []).map((d) => [d.id, d]));
      const mine = new Map(decisions.map((d) => [d.id, d]));
      const changed = [...new Set([...recorded.keys(), ...mine.keys()])].filter((id) => (recorded.get(id)?.action || "keep") !== (mine.get(id)?.action || "keep") || (recorded.get(id)?.into || null) !== (mine.get(id)?.into || null)).length;
      const want = [s1.company.name, D["start.undo.weights"], D[`start.undo.decisions.${changed === 1 ? "one" : "other"}`].replace("{n}", String(changed))];
      res.push([!!notice && want.every((w) => notice.text.includes(w)) && notice.button === D["start.undo"] && (await chosen(page)) === "s3", `${lang}: after a parked issue and another weight, the switch to Auental Energie says "${notice?.text || "nothing"}" beside "${notice?.button || ""}"`]);
      await page.click('[data-action="undo-switch"]');
      await page.waitForTimeout(300);
      const back = await chosen(page);
      const gone = await undoOf(page);
      const after = await tiles(page);
      const engine = tileModel({ mode: "simulation", run: buildRun(s1, lang, { decisions, weights }), preview, reached: 4, lang });
      const okTiles = ["stake", "covered", "top"].every((k) => after[k].value === before[k].value && after[k].value === engine[k].value);
      res.push([back === "s1" && gone === null && okTiles, `${lang}: Undo brings back Tidewell Lines with the tiles of its choices (${["stake", "covered", "top"].map((k) => after[k].value).join(" | ")})`]);
      // The choices themselves: the issue is still parked and the weight still moved.
      await page.click("#steps .vc-step:nth-child(2) .vc-step__button");
      await page.waitForTimeout(250);
      const parked = await page.$eval(`tr[data-issue="${park.id}"] [data-action="decide-park"]`, (b) => b.classList.contains("is-on")).catch(() => false);
      await page.click("#steps .vc-step:nth-child(4) .vc-step__button");
      await page.waitForTimeout(250);
      if (!(await page.$("#w-value"))) await page.click("#btn-weights");
      await page.waitForTimeout(150);
      const value = await page.$eval("#w-value", (x) => Number(x.value)).catch(() => null);
      res.push([parked && value === weights.value, `${lang}: the parked issue is still parked and Business value still at ${value} %`]);
      res.push([!outside.length && !errors.length, `${lang}: no request to any other host and no page error`]);
      await context.close();
    }
    // From a run that reached the report, back at Start: another company sets the choices aside the same way.
    {
      const lang = "en";
      const { context, page, errors } = await open(`?guide=0&lang=${lang}&scenario=s1&step=4`);
      await page.click("#btn-weights");
      await page.focus("#w-risk");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(250);
      await page.click("#btn-cta");
      await page.waitForTimeout(250);
      await pausePlay(page);
      await page.click("#btn-cta");
      await page.waitForTimeout(300);
      await pausePlay(page);
      const atReport = await page.evaluate(() => !!document.querySelector('.step[data-step="report"]'));
      await page.click("#steps .vc-step:first-child .vc-step__button");
      await page.waitForTimeout(250);
      await page.click('label:has(#scenario-s2)');
      await page.waitForTimeout(300);
      const notice = await undoOf(page);
      res.push([atReport && !!notice && notice.text.includes(s1.company.name) && notice.text.includes(EN["start.undo.weights"]) && (await chosen(page)) === "s2" && !errors.length, `after the report, Arvento Drives chosen at Start says "${notice?.text || "nothing"}"`]);
      await context.close();
    }
    report("switch", res, "PRESENTER SWITCH OK");
  }

  // ---- weights --------------------------------------------------------------------------------------------
  if (want("weights")) {
    const res = [];
    const sc = scenarioById("s1");
    const lang = "en";
    const { context, page, errors, outside } = await open(`?guide=0&lang=${lang}&scenario=s1&step=4`);
    let api = 0;
    page.on("request", (req) => { if (/anthropic/.test(req.url())) api += 1; });
    await page.click("#btn-weights");
    for (const [c, presses] of [["risk", 7], ["value", -4]]) {
      await page.focus(`#w-${c}`);
      for (let k = 0; k < Math.abs(presses); k++) { await page.keyboard.press(presses > 0 ? "ArrowRight" : "ArrowLeft"); await page.waitForTimeout(60); }
    }
    await page.waitForTimeout(250);
    const weights = { ...DEFAULT_WEIGHTS, risk: Math.min(WEIGHT_RULE.max, DEFAULT_WEIGHTS.risk + 7 * WEIGHT_RULE.step), value: DEFAULT_WEIGHTS.value - 4 * WEIGHT_RULE.step };
    const run = buildRun(sc, lang, { weights });
    const focused = await page.evaluate(() => document.activeElement?.id);
    const order = await page.evaluate(() => [...document.querySelectorAll(".chart-point")].map((g) => g.dataset.idea));
    const title = await text(page, "#step-title");
    await page.click("label:has(#view-table)");
    await page.waitForTimeout(200);
    const table = await page.evaluate(() => [...document.querySelectorAll("#score-table tbody tr")].map((tr) => ({ id: tr.dataset.idea, score: tr.querySelector(".score-value").textContent })));
    await page.click("label:has(#view-stability)");
    await page.waitForTimeout(200);
    const sentence = await text(page, ".stability-sentence");
    const want = run.ranked.map((r) => ({ id: r.id, score: fmtScore(r.value, lang) }));
    res.push([JSON.stringify(table) === JSON.stringify(want), `Low risk at ${weights.risk} % and Business value at ${weights.value} %: the table's order and scores are the engine's (${table.map((x) => `${x.id} ${x.score}`).join(", ")})`]);
    res.push([JSON.stringify(order) === JSON.stringify(run.ranked.map((r) => r.id)), "the chart's markers follow the same order"]);
    res.push([sentence === run.sentence && title.includes(run.ranked[0].name), `the stability sentence and the title follow: "${title}"`]);
    res.push([focused === "w-value", "the slider keeps the focus while the step draws itself again"]);
    // Review B4: the read-outs keep their % and, when the weights don't add up to 100 %, each its share;
    // Vici's slider script must not write the bare value into them.
    {
      await page.click("label:has(#view-chart)");
      await page.waitForTimeout(150);
      const outs = await page.$$eval(".weight-out", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      const shares = outs.filter((x) => /share \d+ %$/.test(x)).length;
      res.push([outs.length === 7 && outs.every((x) => /^\d+ %/.test(x)) && (total === 100 || shares === 7), `the seven read-outs keep their % and, at ${total} % in all, each shows its share: ${outs.slice(0, 3).join(" | ")} …`]);
    }
    res.push([api === 0 && !outside.length && !errors.length, "no request at all, to the API or anywhere else, and no page error"]);
    // Control: the default weights give another order, so the check above can fail.
    const base = buildRun(sc, lang, {}).ranked.map((r) => r.id);
    res.push([JSON.stringify(base) !== JSON.stringify(run.ranked.map((r) => r.id)), "control: the default weights rank differently, so a page that ignored the sliders would fail"]);
    await context.close();
    report("weights", res, "PRESENTER WEIGHTS OK");
  }

  // ---- play -----------------------------------------------------------------------------------------------
  if (want("play")) {
    const res = [];
    const d = EN;
    // One primary action per step, in its Your turn bar.
    const one = [];
    for (let step = 1; step <= 6; step++) {
      const { context, page } = await open(`?guide=0&lang=en&scenario=s1&step=${step}`);
      const n = await page.evaluate(() => {
        const primary = [...document.querySelectorAll("#stage .vc-button")].filter((b) => !/vc-button--(secondary|ghost|outline)/.test(b.className) && b.offsetParent);
        return { primary: primary.length, inBar: primary.every((b) => b.closest("#turn")), cta: document.querySelectorAll("#turn #btn-cta").length };
      });
      one.push({ step, ok: n.primary === 1 && n.inBar && n.cta === 1, n });
      await context.close();
    }
    res.push([one.every((x) => x.ok), `every step has one primary action, in its Your turn bar${one.every((x) => x.ok) ? "" : `: ${JSON.stringify(one.filter((x) => !x.ok))}`}`]);
    // A deep link opens Score, paused.
    {
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=4");
      const at = await current(page);
      const state = await page.getAttribute("#btn-play", "data-state");
      const done = await page.evaluate(() => [...document.querySelectorAll("#steps .vc-step--done")].length);
      res.push([at === 3 && state !== "pause" && done === 3, `?scenario=s1&step=4 opens Score, paused, with the three steps before it done (step ${at + 1}, Play ${state}, ${done} done)`]);
      // The keyboard: the arrow keys and PageUp and PageDown move; Space plays and pauses.
      await page.focus("#step-title");
      await page.keyboard.press("ArrowLeft");
      const a = await current(page);
      await page.keyboard.press("ArrowRight");
      const b = await current(page);
      await page.keyboard.press("PageUp");
      const c = await current(page);
      await page.keyboard.press("PageDown");
      const e = await current(page);
      res.push([a === 2 && b === 3 && c === 2 && e === 3, `ArrowLeft, ArrowRight, PageUp and PageDown move a step back and on (${[a, b, c, e].map((x) => x + 1).join(", ")})`]);
      await page.focus("#step-title");
      await page.keyboard.press(" ");
      const on = await page.getAttribute("#btn-play", "data-state");
      await page.keyboard.press(" ");
      const off = await page.getAttribute("#btn-play", "data-state");
      res.push([on === "pause" && off === "play", `Space plays and pauses (${on}, then ${off})`]);
      await context.close();
    }
    // Play walks by itself and stops where the person acts.
    {
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=3");
      await page.focus("#step-title");
      await page.keyboard.press(" ");
      await page.waitForFunction(() => document.querySelectorAll("#steps .vc-step")[3].classList.contains("vc-step--current"), null, { timeout: 16000 }).catch(() => {});
      const moved = await current(page);
      res.push([moved === 3, `from Ideate, Play moves on to Score by itself within 16 s (now at step ${moved + 1})`]);
      await context.close();
      const s = await open("?guide=0&lang=en&scenario=s1");
      await s.page.click("#btn-cta");
      await s.page.waitForTimeout(16000);
      const at = await current(s.page);
      const foot = await text(s.page, "#foot-note");
      res.push([at === 1 && foot === d["p.yourMove"], `Play waits at Read, where the person decides, and says so beside the action ("${foot}")`]);
      await s.context.close();
    }
    // Review B1: Play stops wherever the person acts, on the weights, on a view of the evidence or on an
    // idea, so the page never moves on under the person's hand; the step's own action keeps it going.
    {
      const state = (page) => page.getAttribute("#btn-play", "data-state");
      const playAgain = async (page) => { await page.focus("#step-title"); await page.keyboard.press(" "); await page.waitForTimeout(100); };
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=4");
      await playAgain(page);
      const playing = await state(page);
      await page.click("#btn-weights");
      await page.waitForTimeout(200);
      const afterWeights = await state(page);
      await playAgain(page);
      await page.click('label:has(#view-table)');
      await page.waitForTimeout(200);
      const afterView = await state(page);
      await playAgain(page);
      await page.focus("#w-value");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      const afterSlider = await state(page);
      // Paused, the page stays: twelve seconds later it is still on Score, which Play leaves after at most 14.
      await page.waitForTimeout(12000);
      const stayed = await current(page);
      res.push([playing === "pause" && afterWeights === "play" && afterView === "play" && afterSlider === "play" && stayed === 3, `on Score, Change the weights, the table view and a weight's slider each pause Play (${[playing, afterWeights, afterView, afterSlider].join(", ")}), and the page stays on Score (step ${stayed + 1})`]);
      await context.close();
      // Ideate: an idea opened pauses Play; the step's own action does not.
      const i = await open("?guide=0&lang=en&scenario=s1&step=3");
      await playAgain(i.page);
      await i.page.click('#stage [data-action="open-idea"]');
      await i.page.waitForSelector("#idea-drawer[open]");
      const afterIdea = await state(i.page);
      await i.page.keyboard.press("Escape");
      await i.page.waitForFunction(() => !document.querySelector("dialog[open]"));
      await playAgain(i.page);
      await i.page.click("#btn-cta");
      await i.page.waitForTimeout(300);
      const afterCta = await state(i.page);
      const onScore = await current(i.page);
      res.push([afterIdea === "play" && afterCta === "pause" && onScore === 3, `on Ideate, an idea opened pauses Play (${afterIdea}); Next: score the ideas keeps it playing (${afterCta}, now at step ${onScore + 1})`]);
      await i.context.close();
    }
    // Review C1: a keyboard user tabbing through a step is acting too. On Ideate, Tab passes the step's own
    // action with Play still on, then lands on an idea, which pauses it, and the page keeps the focus there;
    // the page's own focus on the title, after a key, does not pause it.
    {
      const state = (page) => page.getAttribute("#btn-play", "data-state");
      const where = (page) => page.evaluate(() => { const a = document.activeElement; return a === document.body ? "body" : a.id || `${a.tagName.toLowerCase()}.${String(a.className.baseVal ?? a.className).split(" ")[0]}`; });
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=3");
      await page.focus("#step-title");
      await page.keyboard.press(" ");
      await page.waitForTimeout(100);
      await page.focus("#step-title");
      await page.waitForTimeout(150);
      const afterTitle = await state(page);
      await page.keyboard.press("Tab");
      await page.waitForTimeout(150);
      const first = await where(page);
      const afterCta = await state(page);
      await page.keyboard.press("Tab");
      await page.waitForTimeout(150);
      const second = await where(page);
      const afterTab = await state(page);
      // Paused, the page stays: 15 s later it is still on Ideate, which Play leaves after at most 14, and the focus is where the Tab left it.
      await page.waitForTimeout(15000);
      const stayed = await current(page);
      const kept = await where(page);
      res.push([afterTitle === "pause" && first === "btn-cta" && afterCta === "pause" && second === "button.vc-tile" && afterTab === "play" && stayed === 2 && kept === second,
        `on Ideate, the title focused by the page and Tab onto the step's own action keep Play on (${afterTitle}, ${afterCta} on ${first}); Tab onto an idea (${second}) pauses it (${afterTab}), and 15 s later the page is still on Ideate (step ${stayed + 1}) with the focus on ${kept}`]);
      await context.close();
      // Play started by Space on a chart point moves on with the focus on the next step's title, not the page's body.
      const s = await open("?guide=0&lang=en&scenario=s1&step=4");
      await s.page.focus("#stage .chart-point");
      await s.page.keyboard.press(" ");
      await s.page.waitForTimeout(100);
      const on = await state(s.page);
      await s.page.waitForFunction(() => document.querySelectorAll("#steps .vc-step")[4].classList.contains("vc-step--current"), null, { timeout: 16000 }).catch(() => {});
      const moved = await current(s.page);
      const focus = await where(s.page);
      res.push([on === "pause" && moved === 4 && focus === "step-title", `Space on a chart point plays (${on}); Play moves on to Shortlist (step ${moved + 1}) with the focus on its title (${focus}), not the page's body`]);
      await s.context.close();
      // Review D2: Next, which the keyboard is on, goes disabled when Play reaches the furthest step; the
      // focus goes to that step's title, not the page's body.
      const n = await open("?guide=0&lang=en&scenario=s1&step=4");
      await n.page.focus("#step-title");
      await n.page.keyboard.press(" ");
      await n.page.keyboard.press("Shift+Tab");
      await n.page.keyboard.press("Shift+Tab");
      const onNext = await where(n.page);
      await n.page.waitForFunction(() => document.querySelectorAll("#steps .vc-step")[4].classList.contains("vc-step--current"), null, { timeout: 16000 }).catch(() => {});
      const there = await current(n.page);
      const after = await where(n.page);
      const nextOff = await n.page.$eval("#btn-next", (b) => b.disabled);
      res.push([onNext === "btn-next" && there === 4 && nextOff && after === "step-title", `with the keyboard on Next (${onNext}), Play reaches Shortlist (step ${there + 1}), Next goes disabled, and the focus goes to its title (${after})`]);
      await n.context.close();
    }
    // Control: without an act Play stays on, so the checks above see the act, not a timeout.
    {
      const { context, page } = await open("?guide=0&lang=en&scenario=s1&step=4");
      await page.focus("#step-title");
      await page.keyboard.press(" ");
      await page.waitForTimeout(600);
      const still = await page.getAttribute("#btn-play", "data-state");
      res.push([still === "pause", `control: on Score with no act, Play is still on after 0.6 s (${still})`]);
      await context.close();
    }
    report("play", res, "PRESENTER PLAY OK");
  }

  // ---- ideas ----------------------------------------------------------------------------------------------
  if (want("ideas")) {
    const res = [];
    for (const sc of scenarios()) {
      const lang = sc.id === "s3" ? "de" : "en";
      const d = DICT[lang];
      const { context, page, errors } = await open(`?guide=0&lang=${lang}&scenario=${sc.id}&step=3`);
      const cells = await page.evaluate(() => [...document.querySelectorAll(".comb-tile")].map((b) => ({ tag: b.tagName, idea: b.dataset.idea })));
      res.push([cells.length === sc.count && cells.every((c) => c.tag === "BUTTON"), `${sc.id}: ${cells.length} cells for ${sc.count} ideas, each a button`]);
      await page.focus("#step-title");
      const reached = new Set();
      for (let k = 0; k < 60 && reached.size < cells.length; k++) {
        await page.keyboard.press("Tab");
        const id = await page.evaluate(() => document.activeElement?.classList.contains("comb-tile") ? document.activeElement.dataset.idea : null);
        if (id) reached.add(id);
      }
      res.push([reached.size === cells.length, `${sc.id}: the Tab key reaches all ${cells.length} cells`]);
      await page.focus(`.comb-tile[data-idea="${cells[0].idea}"]`);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      const drawer = await page.evaluate(() => {
        const dlg = document.getElementById("idea-drawer");
        return {
          open: dlg.open,
          title: dlg.querySelector("#idea-title")?.textContent || "",
          what: dlg.querySelector(".idea-what")?.textContent || "",
          heads: [...dlg.querySelectorAll(".idea-h")].map((x) => x.textContent),
          ratings: [...dlg.querySelectorAll(".ratings-table tbody tr")].map((tr) => tr.lastElementChild.textContent.trim()),
          tag: dlg.querySelector(".vc-tag--feature")?.textContent || ""
        };
      });
      const heads = ["drawer.answers", "drawer.room", "drawer.figures", "drawer.how", "drawer.data", "drawer.risks", "drawer.ratings"].map((k) => d[k]);
      res.push([drawer.open && !!drawer.title && !!drawer.what && heads.every((x) => drawer.heads.includes(x)), `${sc.id}: a cell opens the idea's page, "${drawer.title}", with ${heads.join(", ")}${heads.every((x) => drawer.heads.includes(x)) ? "" : ` (found ${drawer.heads.join(", ")})`}`]);
      res.push([drawer.ratings.length === 7 && drawer.ratings.every((x) => x.length > 10), `${sc.id}: seven ratings, each with its reason`]);
      res.push([drawer.tag.includes(d["drawer.tag"]), `${sc.id}: the page wears the lilac "${d["drawer.tag"]}" tag`]);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const back = await page.evaluate(() => ({ open: document.getElementById("idea-drawer").open, focus: document.activeElement?.dataset?.idea || null }));
      res.push([!back.open && back.focus === cells[0].idea, `${sc.id}: Escape closes the page and the focus returns to its cell`]);
      res.push([!errors.length, `${sc.id}: no page error`]);
      await context.close();
    }
    report("ideas", res, "PRESENTER IDEAS OK");
  }

  // ---- guide ----------------------------------------------------------------------------------------------
  if (want("guide")) {
    const res = [];
    for (const lang of ["en", "de"]) {
      const sc = scenarioById("s1");
      const run = recordedRun(sc, lang);
      const model = tileModel({ mode: "simulation", run, preview: run, reached: 0, lang });
      const first = await open(`?lang=${lang}&scenario=s1`);
      const opened = await first.page.evaluate((l) => document.getElementById(`guide-${l}`)?.open, lang);
      const figs = await first.page.evaluate((l) => Object.fromEntries([...document.querySelectorAll(`#guide-${l} [data-fig]`)].map((s) => [s.dataset.fig, s.textContent])), lang);
      // Each figure is the tile's value; the top score also names its idea.
      const okFigs = ["stake", "covered", "top", "cost"].every((k) => {
        const v = figs[{ stake: "kpi.atStake", covered: "kpi.covered", top: "kpi.top", cost: "kpi.cost" }[k]] || "";
        return k === "top" ? v.startsWith(model.top.value) && v.includes(run.figures.top.name) : v === model[k].value;
      });
      res.push([opened, `${lang}: the guide opens by itself on the first visit`]);
      res.push([okFigs, `${lang}: How it works shows the tiles' values of S1's run (${Object.entries(figs).filter(([k]) => k.startsWith("kpi.")).map(([, v]) => v).join(" | ")})`]);
      const script = await first.page.evaluate((l) => {
        const g = document.getElementById(`guide-${l}`);
        const chapters = [...g.querySelectorAll(".vc-guide__chapter, section")];
        const last = chapters[chapters.length - 1] || g;
        return { times: last.querySelectorAll(".vc-guide__time").length, says: last.querySelectorAll(".vc-guide__say").length, empty: [...last.querySelectorAll("[data-fig]")].filter((s) => !s.textContent.trim() || s.textContent.trim() === "…").length, figs: last.querySelectorAll("[data-fig]").length };
      }, lang);
      res.push([script.times >= 3 && script.times <= 7 && script.says === script.times && script.figs >= 3 && !script.empty, `${lang}: the last chapter is a script of ${script.times} timed steps with ${script.figs} figures, none empty`]);
      await first.page.keyboard.press("Escape");
      await first.page.waitForTimeout(250);
      await first.page.reload();
      await first.page.waitForSelector('html[data-boot="ready"]');
      await first.page.waitForTimeout(400);
      const again = await first.page.evaluate((l) => document.getElementById(`guide-${l}`)?.open, lang);
      res.push([!again, `${lang}: after a reload in the same tab the guide stays closed`]);
      await first.context.close();
      const off = await open(`?guide=0&lang=${lang}`);
      res.push([!(await off.page.evaluate((l) => document.getElementById(`guide-${l}`)?.open, lang)), `${lang}: ?guide=0 keeps the guide closed`]);
      await off.context.close();
      const pres = await open(`?guide=present&lang=${lang}`);
      const at = await pres.page.evaluate((l) => {
        const g = document.getElementById(`guide-${l}`);
        if (!g?.open) return null;
        const visible = [...g.querySelectorAll(".vc-guide__say")].filter((x) => x.offsetParent).length;
        return visible;
      }, lang);
      res.push([at > 0, `${lang}: ?guide=present opens the guide at the presenter's script`]);
      await pres.context.close();
    }
    // ViciDesign's own drive of the guide over http: it opens once a tab, Escape and the buttons work,
    // ?guide=0 and ?guide=present behave, and the last button starts.
    const dir = viciDir();
    if (dir) {
      const r = await new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(dir, "scripts", "check-guide-render.mjs"), server.base], { cwd: dir, env: process.env });
        let out = "";
        child.stdout.on("data", (x) => { out += x; });
        child.stderr.on("data", (x) => { out += x; });
        child.on("close", (code) => resolve({ code, out }));
      });
      res.push([r.code === 0 && /GUIDE BEHAVIOUR OK/.test(r.out), `Vici's check-guide-render.mjs passes against the page${r.code === 0 ? "" : `: ${r.out.split("\n").filter((l) => l.trim()).slice(-4).join(" | ")}`}`]);
    } else {
      res.push([!REQUIRE_VICI, "Vici's check-guide-render.mjs would run here (no ViciDesign checkout)"]);
    }
    report("guide", res, "PRESENTER GUIDE OK");
  }
} finally {
  await browser.close();
  server.close();
}

console.log(failed ? `\npresenter: ${failed} checks failed.` : `\npresenter: all parts passed.\n${tokens.join("\n")}`);
process.exit(failed ? 1 : 0);
