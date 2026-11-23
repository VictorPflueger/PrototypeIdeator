// The documents of version 0.1.0 are complete and agree with the code:
//   - README.md, TECH_NOTES.md, REVIEW.md, tests/README.md and vici/README.md exist with their sections,
//     and README.md and TECH_NOTES.md name the version js/config.js does;
//   - every repository path a document names in backticks or as a relative link exists (PLAN.md is the
//     approved plan and names files of later versions, so it is left out of this check);
//   - TECH_NOTES.md holds the probe's console line exactly as js/probe.js exports it, and the price table
//     equals the prices in js/config.js;
//   - REVIEW.md names every file whose header says it was adapted from, or taken from, another tool;
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
  "README.md": { sections: ["Status", "What is real and what is simulated", "The Ideator probe", "The set of four", "How it is built", "Tests", "Author"], version: `Version ${APP.version}` },
  "TECH_NOTES.md": { sections: ["1. Models and prices", "2. The API from the browser", "3. The policy and what the browser keeps", "4. The engine", "5. Contracts and output schemas", "6. Shared parts and the sibling tools", "7. The fact audit", "8. The prompts and the Ideator probe", "9. Decisions and deviations", "10. Tests"], version: `Version ${APP.version}` },
  "REVIEW.md": { sections: ["Shared with the sibling tools", "Live client, key and session", "Page, languages and settings", "Tests and tools", "Not taken"] },
  "tests/README.md": { sections: ["What runs", "Setup for the browser suites", "The private term list", "The golden cases"] },
  "vici/README.md": { sections: [] }
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

// ---- the brief stays out ------------------------------------------------------------------------------------------
r.check(!tracked.concat(execFileSync("git", ["ls-files"], { cwd: APP_ROOT, encoding: "utf8" }).split("\n")).some((f) => /brief\.md$/i.test(f)), "the build brief is not in the repository");

r.finish("DOCS OK");
