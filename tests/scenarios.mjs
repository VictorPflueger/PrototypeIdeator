// The scenario checker can fail (AC-06): tools/check-scenarios.mjs passes S1 to S3 as they are, and each
// kind of defect the brief's section 7 lists, planted into a copy, fails for its own reason. Three parts,
// each with its own success token:
//   defects    a broken schema, a missing id, a missing language, an untranslated text, placeholders
//              that differ, prose the fact audit refuses, a figure off its frozen reference, a fact
//              missing from DATA_SOURCES.md, a key-shaped string and a thinking block; plus another
//              path than the recorded one that really differs           SCENARIO DEFECTS CAUGHT
//   stand-ins  every stand-in validates against the shared schema, is marked on its document and in its
//              disclaimer, and fails once its challenger's own export sits beside the repository
//                                                                         STAND-INS MARKED
//   pdf        S3's annual report has five pages in each language, built from five sections of its HTML
//              source; every quote the Reader cites is on the page it names; a quote moved to another
//              page or a PDF of another size fails                       S3 PDF OK
// Usage: node tests/scenarios.mjs [defects|stand-ins|pdf]
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { scenarios } = await import(path.join(ROOT, "js", "scenarios.js"));
const { checkScenario, otherChoices } = await import(path.join(ROOT, "js", "scenario_check.js"));
const { recordedRun, buildRun } = await import(path.join(ROOT, "js", "simulation.js"));
const { validateHandoff } = await import(path.join(ROOT, "js", "handoff.js"));
const { contextFor } = await import(path.join(ROOT, "tools", "check-scenarios.mjs"));
const { pdfPages, squash } = await import(path.join(ROOT, "tests", "lib", "pdf-text.mjs"));

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const all = scenarios();
const byId = (id) => all.find((s) => s.id === id);
// An empty folder as the siblings' folder, so that no real checkout changes the result.
const noSiblings = mkdtempSync(path.join(os.tmpdir(), "pi-no-siblings-"));
const base = contextFor(ROOT, { siblingsDir: noSiblings });
const ctx = (sc, extra = {}) => ({ ...base, pdf: base.pdf(sc), ...extra });
const kinds = (problems) => new Set(problems.map((p) => p.kind));
const tokens = [];
let failed = 0;

function run(name, token, body) {
  const r = createReport(name);
  body(r);
  // finish() exits on failure; collect instead, so that every part reports.
  const exit = process.exit;
  let code = 0;
  process.exit = (c) => { code = c; throw new Error("exit"); };
  try { r.finish(token); } catch (e) { if (e.message !== "exit") throw e; } finally { process.exit = exit; }
  if (code) failed += 1; else tokens.push(token);
}

/** A copy of a scenario with a change applied. */
const planted = (id, change) => { const sc = structuredClone(byId(id)); change(sc); return sc; };
const both = (sc, fn) => { for (const l of ["en", "de"]) fn(sc.answers[l], l); };

if (want("defects")) run("scenario defects", "SCENARIO DEFECTS CAUGHT", (r) => {
  for (const sc of all) {
    const found = checkScenario(sc, ctx(sc));
    r.check(found.length === 0, `${sc.id} ${sc.company.name} passes as it is${found.length ? `: ${found.map((p) => `[${p.kind}] ${p.message}`).join("; ")}` : ""}`);
  }
  const cases = [
    ["schema", "an idea without its why", planted("s1", (sc) => { delete sc.answers.en.ideas.ideas[0].why; })],
    ["schema", "a merge proposal written as text", planted("s2", (sc) => { sc.answers.de.merges.merges[0].merged = "pestel-I1"; })],
    ["id", "an idea naming an issue that doesn't exist", planted("s1", (sc) => both(sc, (a) => { a.ideas.ideas[1].issues = ["bmc-I9"]; }))],
    ["id", "a recorded shortlist naming an idea that doesn't exist", planted("s3", (sc) => { sc.choices.shortlist = ["P1", "P9", "P3"]; })],
    ["language", "a German text left empty", planted("s2", (sc) => { sc.answers.de.recommendation.found = ""; })],
    ["language", "an English text standing untranslated in the German run", planted("s1", (sc) => { sc.answers.de.ideas.ideas[2].why = sc.answers.en.ideas.ideas[2].why; })],
    ["placeholders", "a placeholder missing from the German headline", planted("s1", (sc) => { sc.answers.de.recommendation.headline = "{{fact:top.name}} erreicht den besten Wert für Tidewell Lines"; })],
    ["audit", "a number written into an idea's prose", planted("s1", (sc) => both(sc, (a) => { a.ideas.ideas[0].what_it_does = a.ideas.ideas[0].what_it_does.replace(/\.$/, a === sc.answers.en ? " for 40 ships." : " für 40 Schiffe."); }))],
    ["audit", "a share written out in the Writer's text", planted("s3", (sc) => { sc.answers.en.recommendation.found += " Half of it is gas."; sc.answers.de.recommendation.found += " Die Hälfte davon ist Gas."; })],
    ["audit", "an em dash as punctuation", planted("s2", (sc) => both(sc, (a) => { a.ideas.ideas[0].why = a.ideas.ideas[0].why.replace(/^(\S+ \S+) /, "$1 — "); }))],
    ["reference", "a frozen figure that no longer matches", planted("s2", (sc) => { sc.reference.at_stake.eur = 6400000; })],
    ["reference", "a rating changed, so the frozen order moves", planted("s3", (sc) => both(sc, (a) => { a.ideas.ideas[4].ratings.value.score = 5; a.ideas.ideas[4].ratings.demo.score = 5; a.ideas.ideas[4].ratings.buildable.score = 5; }))],
    ["fact", "a fact missing from DATA_SOURCES.md", planted("s1", () => {}), { dataSources: new Map([...base.dataSources].filter(([id]) => id !== "S1-WCI")) }],
    ["fact", "a fact read on another day", planted("s2", (sc) => { sc.facts[0].read_on = "2026-11-02"; })],
    ["key", "something shaped like a key", planted("s3", (sc) => { sc.answers.en.ideas.ideas[1].data[0] = "Use sk-ant-api03-AbCdEfGhIjKlMnOpQr to call the API"; })],
    ["thinking", "a thinking block in a recorded answer", planted("s2", (sc) => { sc.answers.en.ideas.thinking = [{ type: "thinking", thinking: "Let me weigh the ideas.", signature: "x" }]; })]
  ];
  for (const [kind, what, sc, extra] of cases) {
    const got = kinds(checkScenario(sc, ctx(sc, extra || {})));
    r.check(got.has(kind), `planted: ${what} fails as "${kind}"${got.has(kind) ? "" : `, got ${[...got].join(", ") || "nothing"}`}`);
  }
  // Another path than the recorded one really differs, and the checker plays it.
  for (const sc of all) {
    const o = otherChoices(sc, "en");
    const a = recordedRun(sc, "en");
    const b = buildRun(sc, "en", o);
    const differs = a.figures.atStake.eur !== b.figures.atStake.eur || a.figures.covered.covered !== b.figures.covered.covered;
    const parked = b.issues.some((i) => i.status === "parked");
    const picks = b.shortlist.picks.map((p) => p.idea).join();
    r.check(parked && differs && picks !== a.shortlist.picks.map((p) => p.idea).join() && b.shortlist.decided, `${sc.id}: the other path parks an issue, moves At stake or coverage and shortlists other ideas (${a.shortlist.picks.map((p) => p.idea)} → ${picks})`);
  }
});

if (want("stand-ins")) run("stand-ins", "STAND-INS MARKED", (r) => {
  for (const sc of all) for (const d of sc.documents.filter((x) => x.kind === "handoff")) {
    for (const l of ["en", "de"]) {
      const v = validateHandoff(sc.files[d.id][l]);
      r.check(v.valid, `${sc.id} ${d.name[l]} validates against schemas/strategy-challenge-1.json`);
      r.check(d.stand_in === true && /stand-in|Platzhalter/i.test(sc.files[d.id][l].disclaimer), `${sc.id} ${d.name[l]} is marked a stand-in on its document and in its disclaimer`);
    }
  }
  const unmarked = planted("s1", (sc) => { sc.documents[1].stand_in = false; });
  r.check(kinds(checkScenario(unmarked, ctx(unmarked))).has("stand-in"), "planted: a stand-in no longer marked as one fails");
  // A challenger's own export beside the repository: the stand-in it replaces fails.
  const siblings = mkdtempSync(path.join(os.tmpdir(), "pi-siblings-"));
  mkdirSync(path.join(siblings, "SWOT-challenger", "data", "exports"), { recursive: true });
  const theirs = structuredClone(byId("s3").files.d2.en);
  theirs.disclaimer = "AI-generated analysis for discussion. Figures are estimates.";
  writeFileSync(path.join(siblings, "SWOT-challenger", "data", "exports", "swot-challenger-auental-energie-2026-12-01-en.json"), JSON.stringify(theirs));
  const withExport = contextFor(ROOT, { siblingsDir: siblings });
  const s3 = byId("s3");
  const got = checkScenario(s3, { ...withExport, pdf: withExport.pdf(s3) });
  r.check(got.some((p) => p.kind === "stand-in" && /published its own export/.test(p.message)), "planted: the SWOT Challenger's own export for Auental Energie beside the repository fails S3's stand-in");
  const s1 = byId("s1");
  r.check(checkScenario(s1, { ...withExport, pdf: withExport.pdf(s1) }).length === 0, "and leaves S1, a company it has no export for, passing");
});

if (want("pdf")) run("S3 PDF", "S3 PDF OK", (r) => {
  const sc = byId("s3");
  const html = readFileSync(path.join(ROOT, "tools", "s3-annual-report.html"), "utf8");
  for (const l of ["en", "de"]) {
    const block = html.split(`<div data-lang="${l}">`)[1]?.split(/<div data-lang="|<\/body>/)[0] || "";
    const sections = (block.match(/<section>/g) || []).length;
    const doc = sc.documents.find((d) => d.kind === "pdf");
    const buf = readFileSync(path.join(ROOT, doc.href[l]));
    const pages = pdfPages(buf);
    r.check(sections === 5 && pages.length === 5 && doc.pages[l] === 5, `${l}: five sections in the HTML source, five pages in the PDF and in the scenario (${sections}, ${pages.length}, ${doc.pages[l]})`);
    r.check(buf.length === doc.bytes[l], `${l}: the PDF is the size the scenario freezes (${buf.length} bytes)`);
    pages.forEach((p, i) => r.check(new RegExp(`(Page|Seite)${i + 1}$`).test(squash(p.text)) && /(Fictionalcompany|FiktivesUnternehmen)/.test(squash(p.text)), `${l}: page ${i + 1} carries its number and the fictional-company label`));
    const reader = sc.answers[l].reader;
    let quotes = 0;
    for (const issue of reader.issues) for (const s of issue.sources) {
      const n = Number(s.where.match(/(\d+)/)[1]);
      r.check(squash(pages[n - 1].text).includes(squash(s.quote)), `${l}: "${s.quote.slice(0, 48)}…" is on ${s.where}`);
      quotes += 1;
    }
    r.check(quotes >= 5, `${l}: the Reader cites the PDF ${quotes} times`);
  }
  const moved = planted("s3", (sc) => { sc.answers.en.reader.issues[0].sources[0].where = "page 2"; });
  r.check(checkScenario(moved, ctx(moved)).some((p) => p.kind === "pdf"), "planted: a quote cited on the wrong page fails");
  const resized = planted("s3", (sc) => { sc.documents[0].bytes.de += 1; });
  r.check(checkScenario(resized, ctx(resized)).some((p) => p.kind === "pdf"), "planted: a PDF of another size than the scenario freezes fails");
});

console.log(`\n${tokens.join("\n")}`);
process.exit(failed ? 1 : 0);
