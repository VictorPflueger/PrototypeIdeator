// The report and the build brief (brief §6.6, §9 and §9.1, PLAN.md §11; AC-13, AC-21 and AC-09's "a capped
// run's report says so on every page"), in Chromium, against the stand-in where a run is live:
//   structure  the report of S1, S2 and S3 in both languages and of a live run keeps Vici's report rule
//              (reportProblems), has the sections of brief 9.1 in order with one page per idea in rank
//              order, says on its cover what the brief's 9 asks, holds a rank box and a comment box per
//              idea, the name and who will be in the room, and shows no record id
//   pdf        Save as PDF prints the report alone: on every page of the PDF Chromium prints, the footer's
//              four parts once each, "page x of y" counting up to the page count, in the report's language
//              (AC-13); the print copy goes again afterwards
//   tables     no table of the report cuts a heading or runs past its sheet, for S1 to S3 in both
//              languages, on screen at 1920 x 1080 and 1280 x 720 and on paper, with the media as wide as
//              a print dialog reports A4's page area (673 px) and as page.pdf() does (794 px)
//   format     the printed report in the SWOT and PESTEL Challengers' format: text at 9.5 pt, an idea's
//              fact sheet at 9 pt, table heads in sentence case that wrap, each idea on a sheet of its own
//              and the glance's chart beside its table, each with 9 mm in hand at both media widths; the
//              stability check prints whole, moving to the next sheet when it doesn't fit; the
//              cover names the model and setting in a simulation too; Save as PDF and Ctrl+P offer
//              prototype-ideator-<company>-<date>-<lang> as the PDF's name and give the page its title back
//   stopped    a live run stopped at its budget cap offers what is done, and every page of its report
//              says where it stopped; its ideas file says so too (AC-09)
//   html       the HTML file asks for nothing when opened, holds no script, carries its own policy, its
//              chart as inline SVG and its pictures as data, and prints with the footer on every page
//   json       the ideas file validates against schemas/prototype-ideas-1.json for S1 to S3 and a live run,
//              carries the engine's issue map, ideas, weights, scores, stability check and shortlist, and
//              holds no document text, prompt or key
//   downloads  the Your turn bar's Save as PDF with its hint, the HTML file and the ideas file above the
//              report, their file names, Ctrl+P on the Report step and on another step, and Save run as
//              simulation as a quiet link after a live run
//   brief      the build brief: the recording's for the first pick, one composed from another idea's page,
//              and the Brief writer's against the stand-in, sent back once when it touches the template and
//              stopped at the budget cap; every link and all five skills in its blocks, the repository name
//              in both, each block copied to the clipboard, both downloaded as Markdown (AC-21)
// Reads PDFs with Vici's scripts/lib/pdf.mjs and checks with its report and record-id rules, so it needs a
// ViciDesign checkout. Prints REPORT OK and one token a part.
// Usage: node tests/report.mjs [structure|pdf|tables|format|stopped|html|json|downloads|brief] [--require-vici]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE, viciDir, REQUIRE_VICI } from "./lib/harness.mjs";
import { createFakeClaude, KEY } from "./lib/fake-claude.mjs";
import { routeStandIn } from "./lib/live-route.mjs";

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const imp = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);
const vici = viciDir();
if (!vici) {
  console.log("No ViciDesign checkout beside the repository: the report suite needs its PDF reader and report rule.");
  if (REQUIRE_VICI) { console.log("FAIL  a ViciDesign checkout sits beside the repository"); process.exit(1); }
  process.exit(0);
}
const { pdfPageTexts } = await import(pathToFileURL(path.join(vici, "scripts/lib/pdf.mjs")).href);
const { reportProblems } = await import(pathToFileURL(path.join(vici, "scripts/lib/report.mjs")).href);
const { recordIdProblems } = await import(pathToFileURL(path.join(vici, "scripts/lib/ids.mjs")).href);

const T = { en: (await imp("js/i18n/en.js")).default, de: (await imp("js/i18n/de.js")).default };
const { scenarioById } = await imp("js/scenarios.js");
const { recordedRun } = await imp("js/simulation.js");
const { validate, describeErrors } = await imp("js/schema.js");
const { IDEAS_FILE } = await imp("js/schemas.js");
const { BRIEF_LINKS, BRIEF_SKILLS } = await imp("js/brief.js");
const { fileName } = await imp("js/exports.js");
const { APP } = await imp("js/config.js");
const { fmtEur } = await imp("js/format.js");

const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8850 + Math.floor(Math.random() * 120));
const tmp = mkdtempSync(path.join(os.tmpdir(), "pi-report-"));
const tokens = [];
const all = [];
const ORDER = ["structure", "pdf", "tables", "format", "stopped", "html", "json", "downloads", "brief"];
const TOKEN = { structure: "REPORT STRUCTURE OK", pdf: "REPORT PDF OK", tables: "REPORT TABLES FIT", format: "REPORT FORMAT OK", stopped: "REPORT STOPPED OK", html: "REPORT HTML OK", json: "REPORT JSON OK", downloads: "REPORT DOWNLOADS OK", brief: "REPORT BRIEF OK" };

function report(name, results) {
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  all.push(...results);
  const failed = results.filter(([ok]) => !ok).length;
  console.log(failed ? `\n${name}: ${failed} of ${results.length} checks failed.\n` : `\n${name}: all ${results.length} checks passed.\n${TOKEN[name]}\n`);
  if (!failed) tokens.push(TOKEN[name]);
}

const squeeze = (s) => String(s).replace(/\s+/g, "").normalize("NFKC");
const squash = (s) => String(s).replace(/\s+/g, " ").trim();
const SECTIONS = (n) => ["cover", "short", "map", "glance", ...Array(n).fill("idea"), "scored", "built", "vote", "sources", "about"];
const today = new Date().toISOString().slice(0, 10);
const ADDRESS = APP.url;

/** The footer on every page of a PDF, in a language: problems, or none. notice: the words every page must hold. */
function footerProblems(bytes, lang, { notice = null } = {}) {
  const pages = pdfPageTexts(bytes).map(squeeze);
  const w = T[lang];
  const start = squeeze(w["rep.footer.start"]);
  const out = [];
  const count = (text, part) => text.split(part).length - 1;
  pages.forEach((text, k) => {
    const end = squeeze(`${w["rep.footer.end"]}${k + 1}${w["rep.footer.of"]}${pages.length}`);
    if (count(text, start) !== 1) out.push(`page ${k + 1}: "${w["rep.footer.start"].split("\n")[0]}" and the address ${count(text, start)} times`);
    if (count(text, end) !== 1) out.push(`page ${k + 1}: "${w["rep.footer.end"]}${k + 1}${w["rep.footer.of"]}${pages.length}" ${count(text, end)} times`);
    if (notice && !text.includes(squeeze(notice))) out.push(`page ${k + 1}: no notice`);
  });
  return { pages: pages.length, problems: out };
}

/** A page with no outside host but the stand-in's. */
async function open({ lang = "en", query = "", width = 1280, height = 720, script = [], theme = null, clipboard = false } = {}) {
  const fake = createFakeClaude(script);
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  if (clipboard) await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: server.base.replace(/\/$/, "") });
  if (theme) await context.addInitScript((t) => { try { localStorage.setItem("vc-theme", t); } catch { /* none */ } }, theme);
  const net = await routeStandIn(context, fake);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await page.goto(`${server.base}?guide=0&lang=${lang}${query}`);
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForTimeout(250);
  return { context, page, fake, net, errors };
}
const openReport = (sc, lang, opts = {}) => open({ lang, query: `&scenario=${sc}&step=6`, ...opts });

/** Save as PDF as a person presses it: the print dialog stubbed, the PDF Chromium prints, then afterprint. */
async function pressPrint(page, selector) {
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  await page.click(selector);
  const prepared = await page.evaluate(() => ({ printed: window.__printed, copy: !!document.querySelector("[data-vc-print] .vc-report"), lang: document.querySelector("[data-vc-print] .vc-report")?.getAttribute("lang") || "" }));
  const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  const after = await page.evaluate(() => !!document.querySelector("[data-vc-print]"));
  return { bytes, prepared, after };
}

/** A download by pressing a button: its name and its text. */
async function download(page, selector) {
  const [d] = await Promise.all([page.waitForEvent("download"), page.click(selector)]);
  return { name: d.suggestedFilename(), text: readFileSync(await d.path(), "utf8") };
}

/**
 * The sheets of a printed report (texts squeezed of white space) that hold the stability check's heading and
 * its last row, which leaves out low risk: { head, last }, -1 where not found.
 */
function stabilitySheets(texts, w) {
  const head = texts.findIndex((t) => t.includes(squeeze(w["rep.scored.stability"])));
  const lastRow = squeeze(w["score.st.without"].replace("{criterion}", w["crit.risk"]));
  const last = texts.findIndex((t, k) => k >= head && t.includes(lastRow));
  return { head, last };
}

// ---- live runs against the stand-in ----------------------------------------------------------------------
const s1 = scenarioById("s1");
function handoffFiles(sc, lang) {
  const dir = mkdtempSync(path.join(tmp, `${sc.id}-${lang}-`));
  return sc.documents.filter((d) => d.kind === "handoff").map((d) => {
    const p = path.join(dir, d.name[lang]);
    writeFileSync(p, JSON.stringify(sc.files[d.id][lang], null, 2));
    return p;
  });
}
const stepIs = (page, name) => page.waitForFunction((n) => !!document.querySelector(`.step[data-step="${n}"]`) && !document.querySelector("#turn[aria-busy]"), name, { timeout: 30000 });
async function fillDialog(page, { preset = null, cap = null } = {}) {
  await page.waitForSelector("#live-dialog[open]");
  await page.fill("#live-key", KEY);
  if (preset) await page.click(`label:has(input[name="live-preset"][value="${preset}"])`);
  if (cap !== null) await page.evaluate((v) => { const el = document.getElementById("live-cap"); el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, cap);
  await page.check("#live-ack");
  await page.click("#live-start");
}
/** S1's three challenger reports, live in a language, up to the Read step. */
async function liveRead(page, lang, dialog = {}) {
  await page.click("#btn-live");
  await page.waitForSelector('.step[data-step="start"][data-mode="live"]');
  await page.setInputFiles("#intake-files", handoffFiles(s1, lang));
  await page.waitForTimeout(250);
  await page.selectOption("#intake-count", "8");
  await page.click("#btn-cta");
  await fillDialog(page, dialog);
  await stepIs(page, "read");
}
/** From the Read step to the Report step. */
async function liveReport(page) {
  await page.click("#btn-cta");
  await stepIs(page, "ideate");
  for (const step of ["score", "shortlist", "report"]) { await page.click("#btn-cta"); await stepIs(page, step); }
}
const s1Live = (lang) => [{ answer: s1.answers[lang].merges }, { answer: s1.answers[lang].ideas }, { answer: s1.answers[lang].recommendation }];

/** What the report on screen shows: its markup, its pages' kinds, the cover's text, the vote sheet's boxes. */
const reportOf = (page) => page.evaluate(() => {
  const r = document.getElementById("report-doc");
  const pages = [...r.querySelectorAll(":scope > .vc-report__page")];
  return {
    html: r.outerHTML,
    lang: r.getAttribute("lang"),
    kinds: pages.map((p) => (p.classList.contains("vc-report__cover") ? "cover" : [...p.classList].find((c) => c.startsWith("rep-page--"))?.slice(10) || "?")),
    ideaTitles: pages.filter((p) => p.classList.contains("rep-page--idea")).map((p) => p.querySelector("h4")?.textContent || ""),
    cover: pages[0]?.textContent || "",
    meta: [...pages[0].querySelectorAll(".vc-report__meta dd")].map((d) => d.textContent),
    voteRows: [...r.querySelectorAll(".rep-vote tbody tr")].map((tr) => ({ rank: !!tr.querySelector(".rep-box--rank"), why: !!tr.querySelector(".rep-box--why") })),
    voteName: !!r.querySelector(".rep-vote-lines .rep-box--line"),
    voteRoom: !!r.querySelector(".rep-vote-lines .rep-box--lines"),
    about: r.querySelector(".rep-page--about")?.textContent || "",
    aboutLink: !!r.querySelector(`.rep-page--about a[href="${"https://victorpflueger.github.io/PrototypeIdeator/"}"]`),
    sources: [...r.querySelectorAll(".rep-sources li")].map((li) => ({ text: li.textContent, link: !!li.querySelector("a") })),
    notes: [...r.querySelectorAll(".rep-page--sources .rep-note")].map((p) => p.textContent),
    text: r.innerText
  };
});

/** What brief §9 asks of the cover and the last page: problems, or none. */
function coverProblems(rep, lang, { live = false, company = "", ideas = 0, fictional = !live } = {}) {
  const w = T[lang];
  const out = [];
  const cover = squash(rep.cover);
  const title = ideas ? (ideas === 1 ? w["rep.title.one"] : w["rep.title.other"]).replace("{n}", ideas).replace("{company}", company) : w["rep.titleIssues"].replace("{company}", company);
  for (const [what, text] of [["the tool", "Prototype Ideator"], ["the title", title], ["the AI label", w["rep.ai"]], ["the date's label", w["rep.meta.date"]], ["the mode's label", w["rep.meta.mode"]], ["the model's label", w["rep.meta.model"]]]) {
    if (!cover.includes(squash(text))) out.push(`the cover lacks ${what} ("${text}")`);
  }
  if (!/\b20\d\d\b/.test(rep.meta[0] || "")) out.push(`the cover's date reads "${rep.meta[0]}"`);
  if (rep.meta[1] !== w[live ? "rep.meta.live" : "rep.meta.sim"]) out.push(`the cover's mode reads "${rep.meta[1]}"`);
  // The model and setting stand on the cover in both modes (brief §9): a simulation names what a live run starts on.
  if (!/Haiku 5\.5|Sonnet 5\.5/.test(rep.meta[2] || "")) out.push(`the cover's model and setting name no model: "${rep.meta[2]}"`);
  if (!live && !squash(rep.meta[2] || "").startsWith(squash(w["rep.meta.modelSim"].split("{model}")[0]))) out.push(`a scenario's model and setting read "${rep.meta[2]}"`);
  // The fictional label follows the company: the scenarios', and a live run on files that say so.
  if (fictional !== cover.includes(squash(w["fiction.tag"]))) out.push(fictional ? "the cover doesn't say the company is fictional" : "the cover calls a real company fictional");
  const about = squash(rep.about);
  for (const [what, text] of [["the disclaimer", w["report.public"]], ["the public-information notice", w["p.public"]]]) if (!about.includes(squash(text))) out.push(`About this report lacks ${what}`);
  if (!rep.aboutLink) out.push("About this report does not link the tool's address");
  if (live ? !rep.notes.some((x) => squash(x) === squash(w["report.cutoff"])) : rep.sources.filter((x) => x.link).some((x) => !/20\d\d/.test(x.text))) out.push(live ? "a live run's sources lack the knowledge-cutoff note" : "a source read on no date");
  return out;
}

try {
  // ---- structure ----------------------------------------------------------------------------------------
  if (want("structure")) {
    const res = [];
    // The cover rule can fail: a clean report passes and each planted gap is caught.
    {
      const { context, page } = await openReport("s1", "en");
      const rep = await reportOf(page);
      const clean = coverProblems(rep, "en", { company: s1.company.name, ideas: 8 });
      const planted = {
        "no AI label": { ...rep, cover: rep.cover.replace(T.en["rep.ai"], "") },
        "no fictional label": { ...rep, cover: rep.cover.split(T.en["fiction.tag"]).join("") },
        "no disclaimer": { ...rep, about: rep.about.replace(T.en["report.public"], "") },
        "no model": { ...rep, meta: rep.meta.map((m, k) => (k === 2 ? "" : m)) },
        "no address": { ...rep, aboutLink: false }
      };
      const missed = Object.entries(planted).filter(([, x]) => !coverProblems(x, "en", { company: s1.company.name, ideas: 8 }).length).map(([k]) => k);
      res.push([!clean.length && !missed.length, `control: the cover rule passes S1's report and catches ${Object.keys(planted).length - missed.length} of ${Object.keys(planted).length} planted gaps${clean.length ? `; the clean one fails: ${clean.join("; ")}` : ""}${missed.length ? `; missed: ${missed.join(", ")}` : ""}`]);
      const broken = rep.html.replace("vc-report__cover", "vc-report__xcover");
      res.push([reportProblems(broken).length > 0, "control: Vici's report rule catches a report without its cover"]);
      await context.close();
    }
    for (const id of ["s1", "s2", "s3"]) for (const lang of ["en", "de"]) {
      const sc = scenarioById(id);
      const run = recordedRun(sc, lang);
      const { context, page, errors } = await openReport(id, lang);
      const rep = await reportOf(page);
      const where = `${id} ${lang}`;
      const problems = reportProblems(rep.html);
      res.push([!problems.length, `${where}: the report keeps Vici's report rule${problems.length ? `: ${problems.join("; ")}` : ""}`]);
      const want9 = SECTIONS(run.ideas.length);
      res.push([JSON.stringify(rep.kinds) === JSON.stringify(want9), `${where}: the sections of brief 9.1 in order, one page per idea (${rep.kinds.length} pages: ${rep.kinds.filter((k) => k !== "idea").join(", ")} and ${rep.kinds.filter((k) => k === "idea").length} ideas)`]);
      const order = run.ranked.map((r, k) => `${k + 1}. ${run.ideas.find((i) => i.id === r.id).name}`);
      res.push([JSON.stringify(rep.ideaTitles) === JSON.stringify(order), `${where}: the idea pages follow the ranking (${rep.ideaTitles[0]} first)`]);
      const cover = coverProblems(rep, lang, { company: sc.company.name, ideas: run.ideas.length });
      res.push([!cover.length && rep.lang === (lang === "de" ? "de" : "en-GB"), `${where}: the cover and the last page say what brief 9 asks, in the report's language${cover.length ? `: ${cover.join("; ")}` : ""}`]);
      const votes = rep.voteRows.length === run.ideas.length && rep.voteRows.every((v) => v.rank && v.why) && rep.voteName && rep.voteRoom;
      res.push([votes, `${where}: the vote sheet has a rank box and a comment box for each of the ${rep.voteRows.length} ideas, the name and who will be in the room`]);
      // Review C3: the shortlist's share of At stake carries the AI mark when the sum holds the Reader's estimates.
      const share = await page.evaluate((start) => { const p = [...document.querySelectorAll("#report-doc p")].find((x) => x.textContent.startsWith(start)); return p ? { ai: p.querySelector(".ai-tag")?.textContent.trim() || "" } : null; }, T[lang]["report.share"].split("{share}")[0]);
      const est = run.figures.atStake;
      const mark = est.estimated > 0 ? T[lang][est.estimated < est.stated ? "kpi.atStake.aiSome" : "kpi.atStake.aiAll"] : "";
      res.push([!!share && share.ai === mark, `${where}: the shortlist's share of At stake ${mark ? `says "${share?.ai}", as the sum does with ${est.estimated} AI estimates` : "carries no AI mark, as no amount is an AI estimate"}${share ? "" : " (no share line found)"}`]);
      const ids = [...run.issues.map((i) => i.id), ...run.ideas.map((i) => i.id), ...run.documents.map((d) => d.id)];
      const idProblems = recordIdProblems(rep.html, ids);
      res.push([!idProblems.length && !errors.length, `${where}: no record id in the report and no page error${idProblems.length || errors.length ? `: ${[...idProblems, ...errors].join("; ")}` : ""}`]);
      await context.close();
    }
    // A live run's report, against the stand-in.
    {
      const { context, page, fake, errors } = await open({ script: s1Live("en") });
      await liveRead(page, "en");
      await liveReport(page);
      const rep = await reportOf(page);
      const problems = reportProblems(rep.html);
      // S1's challenger reports say Tidewell Lines is fictional, so a live run on them says so too.
      const cover = coverProblems(rep, "en", { live: true, company: s1.company.name, ideas: 8, fictional: true });
      res.push([!problems.length && !cover.length && JSON.stringify(rep.kinds) === JSON.stringify(SECTIONS(8)) && fake.agents().join() === "merges,ideator,writer" && !errors.length, `live: the report keeps the rule, has every section, and its cover names the live run on ${rep.meta[2]}${problems.length || cover.length || errors.length ? `: ${[...problems, ...cover, ...errors].join("; ")}` : ""}`]);
      await context.close();
    }
    report("structure", res);
  }

  // ---- pdf ------------------------------------------------------------------------------------------------
  if (want("pdf")) {
    const res = [];
    // The footer rule can fail: the page printed before the run has a report has no footer. (Chromium's own
    // print fires beforeprint, so on the Report step even page.pdf() prints the report alone: Ctrl+P's path.)
    {
      const { context, page } = await open({ query: "&scenario=s1&step=2" });
      const plain = await page.pdf({ preferCSSPageSize: true });
      res.push([footerProblems(plain, "en").problems.length > 0, "control: the Read step printed before there is a report fails the footer rule"]);
      await context.close();
    }
    for (const id of ["s1", "s2", "s3"]) for (const lang of ["en", "de"]) {
      const sc = scenarioById(id);
      const run = recordedRun(sc, lang);
      const { context, page, errors } = await openReport(id, lang);
      const { bytes, prepared, after } = await pressPrint(page, "#btn-cta");
      writeFileSync(path.join(tmp, `${id}-${lang}.pdf`), bytes);
      const f = footerProblems(bytes, lang);
      const where = `${id} ${lang}`;
      res.push([prepared.printed === 1 && prepared.copy && prepared.lang === (lang === "de" ? "de" : "en-GB") && !after, `${where}: Save as PDF opens the print dialog once on a copy of the report alone, which goes again afterwards`]);
      res.push([!f.problems.length && f.pages >= run.ideas.length + 8, `${where}: every one of the ${f.pages} pages carries "${T[lang]["rep.footer.start"].split("\n")[0]}", the address and "${T[lang]["rep.footer.end"]}x${T[lang]["rep.footer.of"]}${f.pages}" once${f.problems.length ? `: ${f.problems.slice(0, 4).join("; ")}` : ""}`]);
      const first = squeeze(pdfPageTexts(bytes)[0]);
      res.push([first.includes(squeeze(sc.company.name)) && !first.includes("SIMULATION") && !errors.length, `${where}: the first page is the report's cover, not the app`]);
      await context.close();
    }
    report("pdf", res);
  }

  // ---- tables -----------------------------------------------------------------------------------------------
  // No table of the report cuts a heading or runs past its sheet: on screen at both sizes, and on paper (the
  // print copy at A4's 178 mm between its margins, in a window A4's 210 mm wide, under the print styles).
  if (want("tables")) {
    const res = [];
    const FIT = (print) => {
      const root = print ? document.querySelector("body > [data-vc-print]") : document.getElementById("report-doc");
      const name = (el) => `${(el.closest("table")?.className.match(/rep-[a-z]+|figures-table|ratings-table/) || ["table"])[0]}: "${el.textContent.trim().slice(0, 24)}"`;
      const out = [];
      for (const th of root.querySelectorAll("thead th")) if (th.scrollWidth > th.clientWidth + 1) out.push(`head cut, ${name(th)} (${th.scrollWidth} > ${th.clientWidth})`);
      for (const cell of root.querySelectorAll("tbody :is(th, td)")) if (cell.scrollWidth > cell.clientWidth + 1) out.push(`cell runs over, ${name(cell)} (${cell.scrollWidth} > ${cell.clientWidth})`);
      for (const wrap of root.querySelectorAll(".vc-table-wrap")) if (wrap.scrollWidth > wrap.clientWidth + 1) out.push(`table wider than its sheet, ${name(wrap.querySelector("th, td") || wrap)} (${wrap.scrollWidth} > ${wrap.clientWidth})`);
      const sheet = root.querySelector(".vc-report__page:not(.vc-report__cover)");
      return { out, tables: root.querySelectorAll("table").length, width: Math.round(sheet.getBoundingClientRect().width) };
    };
    for (const id of ["s1", "s2", "s3"]) for (const lang of ["en", "de"]) {
      const where = `${id} ${lang}`;
      for (const [width, height] of [[1920, 1080], [1280, 720]]) {
        const { context, page, errors } = await openReport(id, lang, { width, height });
        const m = await page.evaluate(FIT, false);
        res.push([!m.out.length && m.tables >= 8 && !errors.length, `${where} at ${width} x ${height}: the ${m.tables} tables keep to their ${m.width} px sheets, every head whole${m.out.length || errors.length ? `: ${[...m.out, ...errors].slice(0, 4).join("; ")}` : ""}`]);
        await context.close();
      }
      // On paper, with the media as wide as a print dialog reports it (A4's page area, 673 px) and as page.pdf()
      // does (the sheet, 794 px).
      for (const width of [673, 794]) {
        const { context, page, errors } = await openReport(id, lang, { width, height: 1123 });
        await page.evaluate(() => { window.Vici.report.prepare(document.getElementById("report-doc")); document.querySelector("body > [data-vc-print]").style.width = "178mm"; });
        await page.emulateMedia({ media: "print" });
        const m = await page.evaluate(FIT, true);
        res.push([!m.out.length && m.tables >= 8 && !errors.length, `${where} on paper, media ${width} px: the ${m.tables} tables keep to 178 mm, every head whole${m.out.length || errors.length ? `: ${[...m.out, ...errors].slice(0, 4).join("; ")}` : ""}`]);
        await context.close();
      }
    }
    report("tables", res);
  }

  // ---- format -----------------------------------------------------------------------------------------------
  // The printed report in the challengers' format: text at 9.5 pt as the SWOT Challenger prints, an idea's
  // fact sheet a half step smaller, table heads in sentence case that wrap, each idea on a sheet of its own
  // and the glance's chart beside its table; the cover names the model and setting in a simulation as in a
  // live run; Save as PDF and Ctrl+P offer the report's file name, and the page's title comes back after.
  if (want("format")) {
    const res = [];
    const pt = (px) => Math.round(parseFloat(px) * 0.75 * 10) / 10;
    for (const id of ["s1", "s2", "s3"]) for (const lang of ["en", "de"]) {
      const sc = scenarioById(id);
      const run = recordedRun(sc, lang);
      const where = `${id} ${lang}`;
      const w = T[lang];
      const { context, page, errors } = await openReport(id, lang, { width: 794, height: 1123 });
      const rep = await reportOf(page);
      await page.evaluate(() => { window.Vici.report.prepare(document.getElementById("report-doc")); document.querySelector("body > [data-vc-print]").style.width = "178mm"; });
      await page.emulateMedia({ media: "print" });
      // A4 holds 261 mm between its margins. Each idea's sheet and the glance with its chart keep 9 mm in
      // hand, so a browser that breaks a line or two otherwise (CI's Chromium did) still prints them whole.
      const TALL = () => [...document.querySelectorAll("body > [data-vc-print] :is(.rep-page--idea, .rep-page--glance)")].map((p) => ({ head: p.querySelector("h2, h3, h4, h5")?.textContent || "", mm: Math.round(p.getBoundingClientRect().height * 25.4 / 96) })).filter((p) => p.mm > 252);
      const tall = await page.evaluate(TALL);
      // The same with the media as wide as a print dialog reports it, A4's page area of 673 px.
      await page.setViewportSize({ width: 673, height: 1123 });
      const tall673 = await page.evaluate(TALL);
      await page.setViewportSize({ width: 794, height: 1123 });
      res.push([!tall.length && !tall673.length, `${where}: every idea's page and the glance keep 9 mm in hand on A4, with the media 794 and 673 px wide${tall.length || tall673.length ? `: ${[...tall, ...tall673].map((p) => `${p.head} ${p.mm} mm`).join("; ")}` : ""}`]);
      const type = await page.evaluate(() => {
        const box = document.querySelector("body > [data-vc-print]");
        const cs = (sel) => { const el = box.querySelector(sel); return el ? getComputedStyle(el) : null; };
        const heads = [...box.querySelectorAll("thead th")].map((th) => getComputedStyle(th));
        return { body: cs(".rep-page--short").fontSize, lead: cs(".rep-page--map .rep-lead").fontSize, idea: cs(".rep-page--idea").fontSize, heads: heads.length, upper: heads.filter((s) => s.textTransform !== "none").length, nowrap: heads.filter((s) => s.whiteSpace === "nowrap").length };
      });
      await page.emulateMedia({ media: null });
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      res.push([pt(type.body) === 9.5 && pt(type.lead) === 9.5 && pt(type.idea) === 9, `${where}: on paper the text is 9.5 pt (${pt(type.body)} pt) and an idea's fact sheet 9 pt (${pt(type.idea)} pt)`]);
      res.push([type.heads >= 20 && !type.upper && !type.nowrap, `${where}: all ${type.heads} table heads print in sentence case and may wrap${type.upper || type.nowrap ? ` (${type.upper} in capitals, ${type.nowrap} kept on one line)` : ""}`]);
      res.push([/Haiku 5\.5/.test(rep.meta[2] || "") && squash(rep.cover).includes(squash(w["rep.meta.model"])), `${where}: the cover names the model and setting a live run starts on ("${rep.meta[2]}")`]);
      // Each idea on a sheet of its own, the chart on the glance's sheet: read off the PDF Chromium prints.
      const { bytes, prepared } = await pressPrint(page, "#btn-cta");
      const texts = pdfPageTexts(bytes).map(squeeze);
      const names = run.ranked.map((r, k) => squeeze(`${k + 1}. ${run.ideas.find((i) => i.id === r.id).name}`));
      // The glance's sheet holds its title and its chart's (the short version names the glance too, not the chart).
      const glance = texts.findIndex((t) => t.includes(squeeze(w["rep.glance.title"])) && t.includes(squeeze(w["score.chart.title"])));
      // Each idea's first sheet after the glance: the next idea must start on the sheet after it.
      const sheets = names.map((n) => texts.findIndex((t, k) => k > glance && t.includes(n)));
      const own = glance >= 0 && sheets.every((k, i) => k === glance + 1 + i) && !!texts[glance + 1 + names.length]?.includes(squeeze(w["rep.scored.title"]));
      res.push([own, `${where}: the glance's chart prints on the glance's sheet (${glance + 1}), and each of the ${names.length} ideas on a sheet of its own after it (sheets ${sheets.map((k) => k + 1).join(", ")} of ${texts.length}), then How they were scored`]);
      // The stability check prints whole: its heading and its last row on one sheet.
      const whole = stabilitySheets(texts, w);
      res.push([whole.head >= 0 && whole.head === whole.last, `${where}: the stability check prints whole, its heading and its last row on sheet ${whole.head + 1}${whole.head === whole.last ? "" : ` and ${whole.last + 1}`}`]);
      res.push([prepared.printed === 1 && !errors.length, `${where}: no page error${errors.length ? `: ${errors.slice(0, 2).join("; ")}` : ""}`]);
      await context.close();
    }
    // Control: Auental Energie's stability check does not fit under the scores on the scoring sheet (as in
    // Victor's live run of 25 November 2026, whose last row printed alone on the next sheet). Kept whole, it
    // moves to the next sheet in one piece; with break-inside set back to auto it splits, and the check
    // above catches that.
    {
      const { context, page, errors } = await openReport("s3", "en", { width: 794, height: 1123 });
      await page.evaluate(() => { document.querySelector("#report-doc .rep-page--scored .rep-keep").style.breakInside = "auto"; });
      const { bytes } = await pressPrint(page, "#btn-cta");
      const whole = stabilitySheets(pdfPageTexts(bytes).map(squeeze), T.en);
      res.push([whole.head >= 0 && whole.last > whole.head && !errors.length, `control: without its keep-together rule, Auental Energie's stability check splits across sheets ${whole.head + 1} and ${whole.last + 1}`]);
      await context.close();
    }
    // The PDF's name: Save as PDF and Ctrl+P give the page the report's file name while it prints, then the
    // page's own title again.
    for (const lang of ["en", "de"]) {
      const { context, page, errors } = await openReport("s1", lang);
      const name = fileName(s1.company.name, lang, "", today);
      const before = await page.title();
      await page.evaluate(() => { window.__title = null; window.print = () => { window.__title = document.title; }; });
      await page.click("#btn-cta");
      const during = await page.evaluate(() => window.__title);
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      const after = await page.title();
      await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
      const keys = await page.evaluate(() => ({ title: document.title, copy: !!document.querySelector("body > [data-vc-print] .vc-report") }));
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      const back = await page.title();
      res.push([during === name && after === before, `${lang}: Save as PDF offers "${during}" as the PDF's name and gives the page back its title "${after}"`]);
      res.push([keys.title === name && keys.copy && back === before && !errors.length, `${lang}: Ctrl+P prints the report as "${keys.title}" and the title comes back${errors.length ? `: ${errors.join("; ")}` : ""}`]);
      await context.close();
    }
    report("format", res);
  }

  // ---- stopped ----------------------------------------------------------------------------------------------
  if (want("stopped")) {
    const res = [];
    // After reading on Thorough, the merges answer's usage leaves too little of €0.05 for the Ideator.
    const { context, page, fake, errors } = await open({ script: [{ answer: s1.answers.en.merges, usage: { input_tokens: 10000, output_tokens: 1000 } }] });
    await liveRead(page, "en", { preset: "thorough", cap: 0.05 });
    await page.click("#btn-cta");
    await page.waitForFunction(() => document.querySelector("#turn.turn-bar--stopped"), null, { timeout: 30000 });
    // What is done stands folded under the bar's actions, one line, and opens to the report's downloads.
    const folded = await page.evaluate(() => { const d = document.querySelector(".stop-done"); return d ? { open: d.open, summary: d.querySelector("summary")?.textContent.trim() || "" } : null; });
    await page.click(".stop-done summary");
    const done = await page.evaluate(() => ({ text: document.querySelector(".stop-done__text")?.textContent || "", buttons: [...document.querySelectorAll(".stop-done [data-action]")].map((b) => b.dataset.action), shown: [...document.querySelectorAll(".stop-done [data-action]")].every((b) => b.getBoundingClientRect().height >= 39.5) }));
    res.push([!!folded && !folded.open && folded.summary === T.en["report.doneOpen"] && done.text === T.en["report.done"] && done.buttons.join() === "download-pdf,download-html,download-json" && done.shown && fake.requests.length === 1, `a run stopped at its cap before the Ideator offers what is done, folded under "${folded?.summary}": "${done.text}" with ${done.buttons.join(", ")}`]);
    const notice = T.en["rep.stopped.budget"].replace("{agent}", T.en["rep.agent.ideator"]);
    const { bytes, prepared } = await pressPrint(page, '.stop-done [data-action="download-pdf"]');
    const f = footerProblems(bytes, "en", { notice });
    res.push([prepared.copy && !f.problems.length && f.pages >= 4, `every one of the ${f.pages} pages of its report carries the footer and "${notice}"${f.problems.length ? `: ${f.problems.slice(0, 4).join("; ")}` : ""}`]);
    writeFileSync(path.join(tmp, "stopped.pdf"), bytes);
    const title = squeeze(T.en["rep.titleIssues"].replace("{company}", s1.company.name));
    res.push([squeeze(pdfPageTexts(bytes)[0]).includes(title), `its cover says the run holds the issue map, not ideas (${path.join(tmp, "stopped.pdf")})`]);
    const json = JSON.parse((await download(page, '.stop-done [data-action="download-json"]')).text);
    res.push([JSON.stringify(json.stopped) === JSON.stringify({ after: "read", reason: "budget" }) && json.ideas.length === 0 && validate(json, IDEAS_FILE, IDEAS_FILE.$defs).valid, `its ideas file says where it stopped (${JSON.stringify(json.stopped)}) and validates`]);
    const html = (await download(page, '.stop-done [data-action="download-html"]')).text;
    res.push([html.includes(notice.split(".")[0]) && !errors.length, "its HTML file carries the notice too, and no page error"]);
    await context.close();
    report("stopped", res);
  }

  // ---- html -----------------------------------------------------------------------------------------------
  if (want("html")) {
    const res = [];
    for (const [id, lang] of [["s1", "en"], ["s3", "de"]]) {
      const sc = scenarioById(id);
      const { context, page, errors } = await openReport(id, lang);
      const file = await download(page, '[data-action="download-html"]');
      const html = file.text;
      const where = `${id} ${lang}`;
      res.push([file.name === fileName(sc.company.name, lang, ".html", today), `${where}: the file is named ${file.name}`]);
      const csp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1];
      res.push([csp === "default-src 'none'; style-src 'unsafe-inline'; img-src data:" && !/<script\b/i.test(html), `${where}: its own policy (${csp}) and no script`]);
      const imgs = [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1]);
      res.push([/<svg\b[^>]*class="score-chart"/.test(html) && imgs.length >= 2 && imgs.every((s) => s.startsWith("data:image/")), `${where}: the chart as inline SVG and its ${imgs.length} pictures as data`]);
      const problems = reportProblems(html);
      res.push([!problems.length && /<h1\b[^>]*class="vc-report__title/.test(html), `${where}: the file keeps Vici's report rule, its title the h1${problems.length ? `: ${problems.join("; ")}` : ""}`]);
      await context.close();
      // Opened on its own, with every request refused: it asks for nothing and prints with the footer.
      const p = path.join(tmp, `${id}-${lang}.html`);
      writeFileSync(p, html);
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const asked = [];
      await ctx.route("**/*", (route) => { const u = route.request().url(); if (u.startsWith("file:")) return route.continue(); asked.push(u); return route.abort(); });
      const view = await ctx.newPage();
      const viewErrors = [];
      view.on("console", (m) => { if (m.type() === "error") viewErrors.push(m.text()); });
      view.on("pageerror", (e) => viewErrors.push(String(e.message || e)));
      await view.goto(pathToFileURL(p).href);
      await view.waitForTimeout(400);
      const shown = await view.evaluate(() => ({ pages: document.querySelectorAll(".vc-report__page").length, text: document.body.innerText.length }));
      res.push([!asked.length && !viewErrors.length && shown.pages > 8 && shown.text > 2000, `${where}: opened on its own it asks for nothing (${asked.length} requests) and shows its ${shown.pages} pages with no error${viewErrors.length ? `: ${viewErrors[0]}` : ""}`]);
      const bytes = await view.pdf({ preferCSSPageSize: true, printBackground: true });
      const f = footerProblems(bytes, lang);
      res.push([!f.problems.length && !errors.length, `${where}: printed, every one of its ${f.pages} pages carries the footer${f.problems.length ? `: ${f.problems.slice(0, 3).join("; ")}` : ""}`]);
      await ctx.close();
    }
    report("html", res);
  }

  // ---- json -----------------------------------------------------------------------------------------------
  if (want("json")) {
    const res = [];
    const checkFile = (data, run, where, { mode = "simulation" } = {}) => {
      const v = validate(data, IDEAS_FILE, IDEAS_FILE.$defs);
      res.push([v.valid, `${where}: the ideas file validates against prototype-ideas-1.json${v.valid ? "" : `: ${describeErrors(v.errors).split("\n").slice(0, 3).join("; ")}`}`]);
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const engine = same(data.scores, run.ranked.map((r) => ({ idea: r.id, value: r.value, rank: r.rank })))
        && same(data.weights, run.weights)
        && same(data.stability.rankings, run.stability.rankings) && same(data.stability.counts, run.stability.counts) && data.stability.sentence === run.sentence
        && same(data.shortlist, { decided: true, picks: run.shortlist.picks })
        && same(data.issues.map((i) => [i.id, i.status, i.merged_into]), run.issues.map((i) => [i.id, i.status, i.merged_into]))
        && same(data.ideas.map((i) => i.id), run.ideas.map((i) => i.id));
      res.push([engine && data.mode === mode && data.schema === "prototype-ideas/1", `${where}: it carries the engine's issue map, ideas, weights, scores, stability check and shortlist`]);
      const text = JSON.stringify(data);
      const quotes = run.issues.flatMap((i) => (i.quotes || []).map((q) => q.text));
      const leaks = [...quotes.filter((q) => text.includes(q)).map((q) => `a quote ("${q.slice(0, 30)}…")`), /sk-ant-/.test(text) ? "a key" : null, /You are the (Reader|Ideator|Writer|Brief writer)/.test(text) ? "a prompt" : null, /\{\{fact:/.test(text) ? "a placeholder" : null].filter(Boolean);
      res.push([!leaks.length, `${where}: no document text, prompt, placeholder or key${leaks.length ? `: ${leaks.join(", ")}` : ""}`]);
    };
    for (const id of ["s1", "s2", "s3"]) {
      const sc = scenarioById(id);
      const { context, page, errors } = await openReport(id, "en");
      const file = await download(page, '[data-action="download-json"]');
      res.push([file.name === fileName(sc.company.name, "en", ".json", today) && !errors.length, `${id}: the file is named ${file.name}`]);
      checkFile(JSON.parse(file.text), recordedRun(sc, "en"), id);
      await context.close();
    }
    // A planted ideas file fails: the schema check can fail.
    {
      const { context, page } = await openReport("s1", "en");
      const data = JSON.parse((await download(page, '[data-action="download-json"]')).text);
      data.ideas[0].ratings.value.score = 7;
      res.push([!validate(data, IDEAS_FILE, IDEAS_FILE.$defs).valid, "control: an ideas file with a rating of 7 fails its schema"]);
      await context.close();
    }
    {
      const { context, page, errors } = await open({ script: s1Live("en") });
      await liveRead(page, "en");
      await liveReport(page);
      const file = await download(page, '[data-action="download-json"]');
      const data = JSON.parse(file.text);
      res.push([data.mode === "live" && data.model === "claude-haiku-5-5" && data.setting === "balanced" && data.stopped === null && validate(data, IDEAS_FILE, IDEAS_FILE.$defs).valid && !/sk-ant-/.test(file.text) && !errors.length, `live: the ideas file validates, names the model (${data.model}) and the setting (${data.setting}), and holds no key`]);
      await context.close();
    }
    report("json", res);
  }

  // ---- downloads --------------------------------------------------------------------------------------------
  if (want("downloads")) {
    const res = [];
    {
      const { context, page, errors } = await openReport("s1", "en");
      const bar = await page.evaluate(() => ({
        cta: document.getElementById("btn-cta")?.textContent.trim(),
        inBar: [...document.querySelectorAll("#turn .turn-actions button")].map((b) => b.textContent.trim()),
        hint: document.querySelector("#turn .turn-hint")?.textContent || "",
        files: [...document.querySelectorAll(".report-downloads [data-action]")].map((b) => b.dataset.action),
        saveRun: !!document.querySelector('[data-action="save-run"]')
      }));
      res.push([bar.cta === T.en["report.pdf"] && bar.inBar.join("|") === `${T.en["report.pdf"]}|${T.en["brief.open"]}` && bar.hint === T.en["report.pdfHint"], `the Your turn bar holds "${bar.cta}" and "${bar.inBar[1]}", with the hint "${bar.hint}"`]);
      res.push([bar.files.join() === "download-html,download-json" && !bar.saveRun, "the HTML file and the ideas file stand above the report; the simulation has no Save run"]);
      const { prepared } = await pressPrint(page, "#btn-cta");
      const said = await page.textContent("#announce");
      res.push([prepared.printed === 1 && prepared.copy && said === T.en["report.pdfHint"], `Save as PDF says "${said}" and prints the report alone`]);
      // Ctrl+P: the browser's own print prints the report alone too.
      const keys = await page.evaluate(() => {
        window.dispatchEvent(new Event("beforeprint"));
        const during = !!document.querySelector("[data-vc-print] .vc-report");
        window.dispatchEvent(new Event("afterprint"));
        return { during, after: !!document.querySelector("[data-vc-print]") };
      });
      res.push([keys.during && !keys.after, "Ctrl+P on the Report step prints the report alone, and the copy goes afterwards"]);
      await page.click('#steps .vc-step[data-step="score"] .vc-step__button');
      await page.waitForSelector('.step[data-step="score"]');
      const elsewhere = await page.evaluate(() => { window.dispatchEvent(new Event("beforeprint")); const x = !!document.querySelector("[data-vc-print] .vc-report"); window.dispatchEvent(new Event("afterprint")); return x; });
      res.push([elsewhere && !errors.length, "Ctrl+P on the Score step of a run with a report prints the report too"]);
      await context.close();
    }
    {
      // Before the report: Ctrl+P prints the page as it is.
      const { context, page } = await open({ query: "&scenario=s1&step=2" });
      const none = await page.evaluate(() => { window.dispatchEvent(new Event("beforeprint")); const x = !!document.querySelector("[data-vc-print]"); window.dispatchEvent(new Event("afterprint")); return x; });
      res.push([!none, "control: before the run has a report, Ctrl+P prints the page as it is"]);
      await context.close();
    }
    // File names: the company, the day and the language, umlauts written out.
    const names = [fileName("Müller Öl & Söhne GmbH", "de", ".pdf", "2026-11-24"), fileName("Auental Energie", "en", ".html", "2026-11-23"), fileName("", "en", ".json", "2026-11-23")];
    res.push([JSON.stringify(names) === JSON.stringify(["prototype-ideator-mueller-oel-soehne-gmbh-2026-11-24-de.pdf", "prototype-ideator-auental-energie-2026-11-23-en.html", "prototype-ideator-run-2026-11-23-en.json"]), `file names: ${names.join(", ")}`]);
    {
      const { context, page, errors } = await open({ lang: "de", query: "&scenario=s3&step=6" });
      const html = await download(page, '[data-action="download-html"]');
      res.push([html.name === fileName(scenarioById("s3").company.name, "de", ".html", today) && !errors.length, `a German report downloads as ${html.name}`]);
      await context.close();
    }
    {
      const { context, page, errors } = await open({ script: s1Live("en") });
      await liveRead(page, "en");
      await liveReport(page);
      const link = await page.evaluate(() => { const b = document.querySelector('[data-action="save-run"]'); return b ? { quiet: b.classList.contains("vc-button--ghost"), withFiles: !!b.closest(".report-downloads")?.querySelector('[data-action="download-json"]'), inBar: !!b.closest("#turn") } : null; });
      res.push([!!link && link.quiet && link.withFiles && !link.inBar, "after a live run, Save run as simulation stands with the HTML and ideas files above the report, as a quiet link"]);
      const saved = await download(page, '[data-action="save-run"]');
      res.push([/^prototype-ideator-tidewell-lines-\d{4}-\d{2}-\d{2}-en-run\.json$/.test(saved.name) && !errors.length, `and still saves the run (${saved.name})`]);
      await context.close();
    }
    report("downloads", res);
  }

  // ---- brief ------------------------------------------------------------------------------------------------
  if (want("brief")) {
    const res = [];
    const LINKS = Object.values(BRIEF_LINKS);
    const missing = (text) => [...LINKS.filter((l) => !text.includes(l)), ...BRIEF_SKILLS.filter((s) => !text.includes(s))];
    const blocks = (page) => page.evaluate(() => ({ instructions: document.getElementById("brief-text-instructions")?.textContent || "", message: document.getElementById("brief-text-message")?.textContent || "", source: document.querySelector(".brief-source")?.textContent || "" }));
    // The rule can fail: a block without the template's links is caught.
    res.push([missing("Nothing here.").length === LINKS.length + BRIEF_SKILLS.length, "control: a text without the template's links and skills misses all of them"]);
    {
      const { context, page, errors } = await openReport("s1", "en", { clipboard: true });
      await page.click("#btn-brief");
      await page.waitForSelector("#brief-drawer[open]");
      let b = await blocks(page);
      const run = recordedRun(s1, "en");
      const p1 = run.ideas.find((i) => i.id === "P1");
      res.push([b.source.includes(T.en["brief.source.recorded"]) && (await page.textContent("#brief-title")) === p1.name, `the first pick, ${p1.name}, opens with the Brief writer's recorded part`]);
      const gone = missing(b.instructions + b.message);
      res.push([!gone.length && b.message.includes(s1.answers.en.brief.golden_cases[0].expect), `its blocks hold every link and all five skills of the template and the recorded golden cases${gone.length ? `: missing ${gone.join(", ")}` : ""}`]);
      await page.fill("#brief-repo", "allowance gap/agent!");
      b = await blocks(page);
      res.push([b.instructions.includes("https://github.com/VictorPflueger/allowance-gapagent,") && b.instructions.includes("https://victorpflueger.github.io/allowance-gapagent/"), "the repository name goes into both of its addresses, cleaned to what GitHub allows"]);
      for (const key of ["instructions", "message"]) {
        await page.click(`#brief-copy-${key}`);
        // Wait for the page to say it copied, not a fixed time, which a loaded machine can outlast (review B16).
        await page.waitForFunction((want) => (document.getElementById("announce")?.textContent || "").includes(want), T.en[`brief.block.${key}`], { timeout: 5000 }).catch(() => {});
        const got = await page.evaluate(() => navigator.clipboard.readText());
        const said = await page.textContent("#announce");
        res.push([got === b[key] && said.includes(T.en[`brief.block.${key}`]), `Copy puts the ${key === "instructions" ? "project instructions" : "first message"} on the clipboard, word for word, and says so`]);
      }
      const md = await download(page, "#brief-download");
      res.push([md.name === fileName(s1.company.name, "en", "-brief-allowance-gap-agent.md", today) && md.text.includes(b.instructions) && md.text.includes(b.message), `both blocks download as Markdown (${md.name})`]);
      // Another shortlisted idea: composed by code from its page, said so, with the same fixed parts.
      await page.check('#brief-drawer input[name="brief-idea"][value="P3"]');
      await page.waitForTimeout(150);
      b = await blocks(page);
      const p3 = run.ideas.find((i) => i.id === "P3");
      res.push([(await page.textContent("#brief-title")) === p3.name && b.source.includes(T.en["brief.source.composed"]) && !missing(b.instructions + b.message).length && b.message.includes(p3.what_it_does) && !b.message.includes("{{fact:"), `another pick, ${p3.name}, is composed from its page, says so and keeps every link and skill`]);
      const ids = [...run.issues.map((i) => i.id), ...run.ideas.map((i) => i.id)];
      const idProblems = recordIdProblems(b.instructions + b.message, ids);
      res.push([!idProblems.length && !errors.length, `no record id in the brief and no page error${idProblems.length || errors.length ? `: ${[...idProblems, ...errors].join("; ")}` : ""}`]);
      await context.close();
    }
    // Live: the Brief writer, sent back once when its answer touches the template.
    {
      const good = s1.answers.en.brief;
      const touching = { ...structuredClone(good), data: [...good.data, "Vici's rules at https://victorpflueger.github.io/ViciDesign/index.html"] };
      const { context, page, fake, errors } = await open({ script: [...s1Live("en"), { answer: touching }, { answer: good }] });
      await liveRead(page, "en");
      await liveReport(page);
      const before = await page.textContent("#kpi-cost .kpi-value");
      await page.click("#btn-brief");
      await page.waitForSelector("#brief-drawer[open]");
      const offer = await page.evaluate(() => ({ write: !!document.getElementById("brief-write"), ai: document.querySelector("#brief-footer .vc-tag")?.textContent || "", lead: document.querySelector(".brief-live-lead")?.textContent || "", blocks: !!document.getElementById("brief-text-message") }));
      res.push([offer.write && offer.ai === T.en["p.ai"] && /€/.test(offer.lead) && !offer.blocks, `live, the drawer offers "${T.en["brief.write"]}" beside "${offer.ai}", with its cost first: "${offer.lead.slice(0, 70)}…"`]);
      await page.click("#brief-write");
      await page.waitForSelector("#brief-text-message", { timeout: 30000 });
      const b = await blocks(page);
      const reqs = fake.requests.filter((r) => /^You are the Brief writer/.test(r.req.system));
      const note = reqs[1]?.req.messages.at(-1)?.content?.[0]?.text || "";
      res.push([reqs.length === 2 && /repeats a link the template holds/.test(note) && reqs[0].req.output_config.format.schema.properties.golden_cases && !fake.violations.length, "the Brief writer's answer that repeats a template link goes back once, its problem listed"]);
      res.push([b.source.includes(T.en["brief.source.live"]) && !missing(b.instructions + b.message).length && b.message.includes(good.golden_cases[1].expect), "the repaired part fills the blocks, with every link and skill of the template"]);
      const after = await page.textContent("#kpi-cost .kpi-value");
      res.push([after !== before && !errors.length, `the brief's request counts against the run: the session cost goes from ${before} to ${after}`]);
      await context.close();
    }
    // Live: the brief stops at the budget cap, and the report stays as it is.
    {
      const { context, page, fake, errors } = await open({ script: [{ answer: s1.answers.en.merges }, { answer: s1.answers.en.ideas }, { answer: s1.answers.en.recommendation, usage: { input_tokens: 150000, output_tokens: 9000 } }] });
      await liveRead(page, "en", { cap: 0.05 });
      await liveReport(page);
      await page.click("#btn-brief");
      await page.waitForSelector("#brief-drawer[open]");
      await page.click("#brief-write");
      await page.waitForSelector("#brief-retry", { timeout: 30000 });
      const stop = await page.evaluate(() => ({ text: document.querySelector(".brief-stopped .turn-text")?.textContent || "", stage: [...document.getElementById("turn").classList].includes("turn-bar--stopped"), pdf: document.getElementById("btn-cta")?.textContent.trim() }));
      const words = T.en["live.budget.brief"].split(":")[0];
      res.push([stop.text.startsWith(words) && stop.text.includes(fmtEur(0.05, "en")) && !stop.stage && stop.pdf === T.en["report.pdf"] && fake.requests.length === 3 && !errors.length, `at its cap the brief stops before any request ("${stop.text.slice(0, 60)}…"), and the Report step keeps Save as PDF`]);
      await context.close();
    }
    report("brief", res);
  }
} finally {
  await browser.close();
  await server.close();
}

const ran = ORDER.filter(want);
const ok = ran.every((p) => tokens.includes(TOKEN[p]));
console.log(ok ? `report: ${ran.length} part${ran.length === 1 ? "" : "s"} passed (${all.length} checks).` : `report: ${ran.filter((p) => !tokens.includes(TOKEN[p])).join(", ")} failed.`);
if (ok && ran.length === ORDER.length) console.log("REPORT OK");
process.exit(ok ? 0 : 1);
