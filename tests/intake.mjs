// The live run's intake (G13, AC-18): what the drop zone takes, what it refuses and what it reads without
// a request. Two parts:
//   rules  js/documents.js on entries made here: a challenger's report reads into issues; a Word or
//          PowerPoint file is refused with "Save it as PDF first"; six files, more than 20 MB and more than
//          100 PDF pages each give their own message; two companies and two reports of one challenger too;
//   page   in Chromium, after Run it live: the brief's example handoff file dropped on the zone becomes one
//          issue on screen with PI4's title and figures, with no request to any host; a Word file shows
//          the PDF message on its row; a sixth file names the limit.
// Prints INTAKE OK.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE } from "./lib/harness.mjs";
import { createReport } from "./lib/report.mjs";

const r = createReport("intake");
const imp = (p) => import(path.join(APP_ROOT, p));
const { checkIntake, kindOf } = await imp("js/documents.js");
const { LIMITS } = await imp("js/config.js");
const EN = (await imp("js/i18n/en.js")).default;
const DE = (await imp("js/i18n/de.js")).default;
const fixture = (name) => JSON.parse(readFileSync(path.join(APP_ROOT, "tests", "fixtures", name), "utf8"));
const PI4 = fixture("pi4-handoff.json");
const example = fixture(PI4.input);
const want = PI4.expected.issues[0];

// ---- rules ----------------------------------------------------------------------------------------------
const entry = (name, extra = {}) => ({ id: `f-${name}`, name, kind: kindOf(name, ""), bytes: 2048, pages: null, json: undefined, content: "text", ...extra });
{
  const handoff = entry("tidewell-bmc.json", { json: example });
  const got = checkIntake([handoff]);
  r.check(got.ready && got.handoffOnly && got.files[0].handoff?.issues.length === 1 && got.files[0].handoff.issues[0].title === want.title, `a challenger's report reads into one issue, "${want.title}", ready without the Reader`);
  for (const name of ["notes.docx", "deck.pptx", "budget.xlsx", "old.doc"]) {
    const x = checkIntake([entry(name)]);
    r.check(x.files[0].refusal?.code === "office" && !x.ready, `${name} is refused as an Office file`);
  }
  r.check(EN["intake.refused.office"].startsWith("Save it as PDF first") && DE["intake.refused.office"].length > 20, `the refusal says "${EN["intake.refused.office"]}"`);
  const six = checkIntake(Array.from({ length: LIMITS.files + 1 }, (_, k) => entry(`notes-${k}.md`)));
  r.check(six.problems.some((p) => p.code === "files") && six.files.filter((f) => f.refusal?.code === "tooMany").length === 1, "six files: the sixth is over the limit and the problem names five at most");
  const big = checkIntake([entry("a.md", { bytes: 15 * 1024 * 1024 }), entry("b.md", { bytes: 6 * 1024 * 1024 })]);
  r.check(big.problems.some((p) => p.code === "bytes") && !big.ready, "more than 20 MB in all: its own problem");
  const pages = checkIntake([entry("a.pdf", { pages: 80, content: null }), entry("b.pdf", { pages: 30, content: null })]);
  r.check(pages.problems.some((p) => p.code === "pages" && p.pages === 110) && !pages.ready, "110 PDF pages: its own problem, with the count");
  const other = structuredClone(example);
  other.company.name = "Another Carrier";
  other.tool = { ...other.tool, id: "swot-challenger", name: "SWOT Challenger" };
  const two = checkIntake([entry("a.json", { json: example }), entry("b.json", { json: other })]);
  r.check(two.problems.some((p) => p.code === "companies"), "two companies: its own problem");
  const twice = checkIntake([entry("a.json", { json: example }), entry("b.json", { json: structuredClone(example) })]);
  r.check(twice.problems.some((p) => p.code === "twice"), "two reports from one challenger: its own problem");
  const messages = ["files", "bytes", "pages", "companies", "twice"].map((k) => EN[`intake.problem.${k}`]);
  r.check(new Set(messages).size === 5 && messages.every(Boolean), "each limit has its own words");
  r.control(checkIntake([entry("ok.md")]).ready, "one Markdown file within every limit is ready, so the refusals above are not the only answer");
}

// ---- page -----------------------------------------------------------------------------------------------
const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8350 + Math.floor(Math.random() * 90));
const dir = mkdtempSync(path.join(os.tmpdir(), "pi-intake-"));
const file = (name, body) => { const p = path.join(dir, name); writeFileSync(p, body); return p; };
try {
  for (const lang of ["en", "de"]) {
    const d = lang === "en" ? EN : DE;
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const outside = [];
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => { outside.push(route.request().url()); return route.abort("blockedbyclient"); });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    await page.goto(`${server.base}?guide=0&lang=${lang}`);
    await page.waitForSelector('html[data-boot="ready"]');
    await page.click("#btn-live");
    await page.waitForTimeout(300);
    const notice = await page.evaluate(() => document.querySelector(".vc-dropzone__notice")?.textContent || "");
    r.check(notice.includes(d["p.public"]), `${lang}: the drop zone says "${d["p.public"].slice(0, 40)}…"`);
    await page.setInputFiles("#intake-files", [file("tidewell-bmc.json", JSON.stringify(example)), file("notes.docx", "PK not a document")]);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => [...document.querySelectorAll(".vc-dropzone__file")].map((li) => ({ state: li.dataset.state || "", text: li.textContent })));
    const word = rows.find((x) => x.text.includes("notes.docx"));
    r.check(rows.length === 2 && word?.state === "refused" && word.text.includes(d["intake.refused.office"]), `${lang}: the Word file's row is refused with "${d["intake.refused.office"].slice(0, 30)}…"`);
    r.check(!(await page.isDisabled("#btn-cta")), `${lang}: with the report in, Read the files is ready`);
    await page.click("#btn-cta");
    await page.waitForTimeout(400);
    const issues = await page.evaluate(() => [...document.querySelectorAll(".issue-row")].map((tr) => ({ title: tr.querySelector(".issue-title")?.textContent, stake: tr.querySelector(".stake-cell strong")?.textContent, sub: tr.querySelector(".stake-sub")?.textContent })));
    const one = issues[0] || {};
    r.check(issues.length === 1 && one.title === want.title && one.stake === want.shown[lang].expected, `${lang}: one issue on screen, "${one.title}", at ${one.stake} a year, as PI4 says`);
    const tile = await page.evaluate(() => document.querySelector("#kpi-stake .kpi-value").textContent);
    r.check(tile === want.shown[lang].expected, `${lang}: the at-stake tile shows ${tile}`);
    r.check(!outside.length && !errors.length, `${lang}: no request to any host and no page error${outside.length || errors.length ? `: ${[...outside, ...errors].join("; ")}` : ""}`);
    // Back to the files: a sixth file names the limit.
    await page.click("#steps .vc-step:first-child .vc-step__button");
    await page.waitForTimeout(300);
    await page.setInputFiles("#intake-files", Array.from({ length: 5 }, (_, k) => file(`notes-${k}.md`, "# Notes\n\nPublic notes.\n")));
    await page.waitForTimeout(400);
    const problems = await page.evaluate(() => document.querySelector(".intake-problems")?.textContent || document.getElementById("cta-reason")?.textContent || "");
    const limit = d["intake.problem.files"].replace("{max}", String(LIMITS.files));
    r.check(problems.includes(limit), `${lang}: six readable files name the limit: "${limit}"`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

r.finish("INTAKE OK");
