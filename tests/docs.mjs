// The documents are complete and agree with the code:
//   - README.md, DESIGN.md, DEMO_SCRIPT.md, DEMO_SCRIPT.de.md, TECH_NOTES.md, REVIEW.md, DATA_SOURCES.md,
//     tests/README.md and vici/README.md exist with their sections,
//     and README.md and TECH_NOTES.md name the version js/config.js does;
//   - every repository path a document names in backticks or as a relative link exists (PLAN.md is the
//     approved plan and names files of later versions, so it is left out of this check);
//   - TECH_NOTES.md holds the probe's console line exactly as js/probe.js exports it, and the price table
//     equals the prices in js/config.js;
//   - REVIEW.md names every file whose header says it was adapted from, or taken from, another tool;
//   - both demo scripts follow the guide's talk track step for step, with its times, its words and its
//     figures, and show the engine's figures for Tidewell Lines;
//   - the build brief is not in the repository.
// Each rule first fails on a planted control. Prints DOCS OK.
// Usage: node tests/docs.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "./lib/harness.mjs";
import { createReport } from "./lib/report.mjs";

const r = createReport("docs");
const { APP, MODELS } = await import(pathToFileURL(path.join(APP_ROOT, "js/config.js")).href);
const { SNIPPET } = await import(pathToFileURL(path.join(APP_ROOT, "js/probe.js")).href);
const read = (f) => fs.readFileSync(path.join(APP_ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(APP_ROOT, f));

const DOCS = {
  "README.md": { sections: ["Status", "What is real and what is simulated", "The Ideator probe", "The set of four", "How it is built", "Tests", "How to present", "History", "Author"], version: `Version ${APP.version}` },
  "DESIGN.md": { sections: ["1. Who looks at it, and where", "2. The frame", "3. The steps", "4. Colour", "5. Two languages", "6. The shape of the report"] },
  "DEMO_SCRIPT.md": { sections: ["Before you start", "The five minutes", "If something goes wrong", "Questions that will come", "After the demo"] },
  "DEMO_SCRIPT.de.md": { sections: ["Vor dem Start", "Die fünf Minuten", "Wenn etwas schiefgeht", "Fragen, die kommen werden", "Nach der Vorführung"] },
  "TECH_NOTES.md": { sections: ["1. Models and prices", "2. The API from the browser", "3. The policy and what the browser keeps", "4. The engine", "5. Contracts and output schemas", "6. Shared parts and the sibling tools", "7. The fact audit", "8. The prompts and the Ideator probe", "9. Decisions and deviations", "10. Tests"], version: `Version ${APP.version}` },
  "REVIEW.md": { sections: ["Part 1. Files taken from other tools", "Shared with the sibling tools", "Live client, key and session", "Page, languages and settings", "Tests and tools", "Not taken", "Part 2. Independent review", "Part 3. Steve Jobs review and partner review"] },
  "tests/README.md": { sections: ["What runs", "Setup for the browser suites", "The private term list", "The golden cases"] },
  "vici/README.md": { sections: [] },
  "DATA_SOURCES.md": { sections: ["1. S1 Tidewell Lines", "2. S2 Arvento Drives", "3. S3 Auental Energie", "4. What is not used"], version: `Version ${APP.version}` }
};
const headings = (text) => [...text.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim());

// ---- the checks can fail --------------------------------------------------------------------------------------
r.control(!headings("# T\n\n## Status\n").includes("History"), "a missing section is caught");
r.control(namedPaths("See `js/nope.js` and [x](docs/nope.md).").every((p) => !exists(p)), "a path that doesn't exist is caught");

// ---- sections and version -------------------------------------------------------------------------------------
for (const [f, rule] of Object.entries(DOCS)) {
  if (!exists(f)) { r.check(false, `${f} exists`); continue; }
  const text = read(f);
  const missing = rule.sections.filter((s) => !headings(text).includes(s));
  r.check(!missing.length, `${f} has its sections${missing.length ? `; missing: ${missing.join(", ")}` : ` (${rule.sections.length})`}`);
  if (rule.version) r.check(text.includes(rule.version), `${f} names ${rule.version}, as js/config.js does`);
}

// ---- every path a document names exists -----------------------------------------------------------------------
function namedPaths(text) {
  const out = new Set();
  const plain = text.replace(/```[\s\S]*?```/g, "");
  for (const m of plain.matchAll(/`([^`\s]+)`/g)) {
    const p = m[1].replace(/[),.;:]+$/, "");
    if (/^(?:js|css|data|schemas|tests|tools|vici|\.github)\/[\w./*-]+$|^(?:index\.html|favicon\.svg|README\.md|TECH_NOTES\.md|REVIEW\.md|PLAN\.md|\.nojekyll)$/.test(p) && !p.includes("*")) out.add(p);
  }
  for (const m of plain.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) out.add(m[1].split("#")[0]);
  return [...out];
}
for (const f of Object.keys(DOCS)) {
  if (!exists(f)) continue;
  const base = path.dirname(f);
  const missing = namedPaths(read(f)).filter((p) => !exists(p) && !exists(path.join(base, p)));
  r.check(!missing.length, `every path ${f} names exists${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
}

// ---- TECH_NOTES agrees with the code ----------------------------------------------------------------------------
const notes = exists("TECH_NOTES.md") ? read("TECH_NOTES.md") : "";
r.check(notes.includes("```js\n" + SNIPPET + "\n```"), "TECH_NOTES.md holds the probe's console line exactly as js/probe.js exports it");
const usd = (v) => (Number.isInteger(v) ? `$${v}` : `$${v.toFixed(Math.max(2, (String(v).split(".")[1] || "").length))}`);
for (const m of MODELS) {
  const row = notes.split("\n").find((l) => l.startsWith(`| ${m.label} | \`${m.id}\` |`)) || "";
  const cells = row.split("|").map((c) => c.trim()).filter(Boolean).slice(2);
  const want = [m.price.input, m.price.output, m.price.cacheWrite, m.price.cacheRead].map(usd);
  r.check(cells.length === 4 && cells.every((c, i) => c === want[i]), `TECH_NOTES.md prices ${m.label} as js/config.js does (${want.join(", ")})${cells.join(", ") === want.join(", ") ? "" : `; the table says ${cells.join(", ") || "nothing"}`}`);
}

// ---- REVIEW names every adapted or taken file -------------------------------------------------------------------
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: APP_ROOT, encoding: "utf8" }).split("\n").filter((f) => /\.(m?js|css|html)$/.test(f) && !f.startsWith("vici/"));
const adapted = tracked.filter((f) => exists(f) && /\b(Adapted from|Taken from|taken from the)\b/.test(read(f).split("\n").slice(0, 30).join("\n")));
const review = exists("REVIEW.md") ? read("REVIEW.md") : "";
const unnamed = adapted.filter((f) => !review.includes(`\`${f}\``) && !review.includes(`\`${path.basename(f)}\``));
r.check(adapted.length >= 10 && !unnamed.length, `REVIEW.md names every file whose header says it was adapted or taken from another tool (${adapted.length})${unnamed.length ? `; not named: ${unnamed.join(", ")}` : ""}`);

// ---- the demo scripts follow the guide's talk track -------------------------------------------------------------
// Each script's five minutes have the guide's steps in order: the same time for each and the same words to say,
// with the figures the guide fills in from Tidewell Lines' recorded run; and what the presenter shows names the
// engine's figures: the four tiles, the order after a weight is raised and the shortlist's share.
{
  const { tileModel, costText } = await import(pathToFileURL(path.join(APP_ROOT, "js/kpis.js")).href);
  const { recordedRun, buildRun } = await import(pathToFileURL(path.join(APP_ROOT, "js/simulation.js")).href);
  const { scenarioById } = await import(pathToFileURL(path.join(APP_ROOT, "js/scenarios.js")).href);
  const { t } = await import(pathToFileURL(path.join(APP_ROOT, "js/i18n/index.js")).href);
  const { fmtScore, fmtShare } = await import(pathToFileURL(path.join(APP_ROOT, "js/format.js")).href);
  const { DEFAULT_WEIGHTS } = await import(pathToFileURL(path.join(APP_ROOT, "js/engine.js")).href);
  const flat = (x) => String(x).replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
  const bare = (x) => flat(x).replace(/^[„“”"«»]+|[„“”"«»]+$/g, "").replace(/[„“”"]/g, "\"");
  const html = read("index.html");
  const sc = scenarioById("s1");
  for (const [lang, file] of [["en", "DEMO_SCRIPT.md"], ["de", "DEMO_SCRIPT.de.md"]]) {
    if (!exists(file)) continue;
    const run = recordedRun(sc, lang);
    const m = tileModel({ mode: "simulation", run, preview: run, reached: 0, lang });
    const top = run.figures.top;
    const figs = {
      "talk.atStake": m.stake.value, "talk.top": top.name, "talk.score": fmtScore(top.value, lang),
      "talk.firsts": t("score.st.of", { n: run.stability.counts[top.id].firsts, of: run.stability.of }, lang),
      "talk.ideas": String(run.ideas.length), "talk.issues": String(run.issues.length), "talk.kept": String(run.figures.covered.of),
      "talk.thorough": costText(run.estimate.thorough.eur, lang)
    };
    // The guide's talk track in this language, its figures filled in.
    const guide = html.slice(html.indexOf(`id="guide-${lang}"`));
    const path = guide.slice(guide.indexOf('class="vc-guide__path"'), guide.indexOf("</ol>"));
    const steps = [...path.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => {
      const fill = (x) => flat(x.replace(/<span data-fig="([^"]+)">…<\/span>/g, (_, k) => figs[k] ?? `{${k}}`).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " "));
      return { say: bare(fill((li[1].match(/<span class="vc-guide__say">([\s\S]*?)<\/span>\s*<span class="vc-guide__time">/) || [])[1] || "")), time: fill((li[1].match(/<span class="vc-guide__time">([^<]*)<\/span>/) || [])[1] || "") };
    });
    const text = read(file);
    const rows = text.slice(text.indexOf(lang === "en" ? "## The five minutes" : "## Die fünf Minuten")).split("\n").filter((l) => /^\| \d/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => flat(c)));
    const off = steps.map((st, k) => {
      const row = rows[k];
      if (!row) return `step ${k + 1} is missing`;
      if (row[0] !== st.time) return `step ${k + 1} takes ${row[0]}, the guide ${st.time}`;
      if (bare(row[2]) !== st.say) return `step ${k + 1} says "${bare(row[2]).slice(0, 60)}…", the guide "${st.say.slice(0, 60)}…"`;
      return null;
    }).filter(Boolean);
    if (rows.length !== steps.length) off.push(`${rows.length} rows for the guide's ${steps.length} steps`);
    r.check(steps.length >= 3 && steps.length <= 7 && !off.length, `${file} follows the guide's talk track in ${lang}: ${steps.length} steps, each with the guide's time and words${off.length ? `; ${off.join("; ")}` : ""}`);
    // What the presenter shows: the engine's figures.
    const raised = buildRun(sc, lang, { weights: { ...DEFAULT_WEIGHTS, value: 30 } });
    const rankOf = (r0, id) => r0.ranked.find((x) => x.id === id).rank;
    const moved = run.ranked.filter((x) => rankOf(raised, x.id) - x.rank >= 2).map((x) => run.ideas.find((i) => i.id === x.id).name);
    const decided = buildRun(sc, lang, { decided: true });
    const want = [m.stake.value, t("score.st.of", { n: run.figures.atStake.stated, of: run.figures.atStake.of }, lang), m.covered.value, m.top.value, m.cost.value, fmtScore(raised.figures.top.value, lang), fmtShare(decided.figures.share, lang), ...moved].map(flat);
    const shown = flat(rows.map((row) => row[3]).join(" "));
    const missing = want.filter((x) => !shown.includes(x));
    r.check(moved.length >= 1 && !missing.length, `${file} shows the engine's figures: ${want.join(", ")}${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
  }
  r.control(bare("„Quote“") === bare("\"Quote\"") && flat("63\u00a0%") === "63 %", "quotes and spaces compare alike in both languages");
}

// ---- the brief stays out ------------------------------------------------------------------------------------------
r.check(!tracked.concat(execFileSync("git", ["ls-files"], { cwd: APP_ROOT, encoding: "utf8" }).split("\n")).some((f) => /brief\.md$/i.test(f)), "the build brief is not in the repository");

r.finish("DOCS OK");
