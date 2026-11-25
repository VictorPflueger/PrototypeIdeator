// Checks the three scenarios (brief §7, AC-06) with js/scenario_check.js: schemas, ids, both languages
// and their placeholders, the fact audit, the frozen reference figures, DATA_SOURCES.md, key-shaped
// strings, thinking blocks, the stand-ins, the S3 PDFs and another path than the recorded one. Prints each
// problem and SCENARIOS OK when there is none.
//
// The challengers' own exports are looked for beside this repository (SIBLINGS_DIR, else the parent
// folder): any strategy-challenge/1 file under a challenger's data/ or exports/ for a scenario company
// fails the stand-in it replaces.
//
// Usage: node tools/check-scenarios.mjs [--print-reference]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { scenarios } = await import(path.join(ROOT, "js", "scenarios.js"));
const { checkScenario, parseDataSources, LANGS } = await import(path.join(ROOT, "js", "scenario_check.js"));
const { recordedRun, referenceOf } = await import(path.join(ROOT, "js", "simulation.js"));
const { pdfPages } = await import(path.join(ROOT, "tests", "lib", "pdf-text.mjs"));

/** The context the checks need from the file system. */
export function contextFor(root = ROOT, { siblingsDir = process.env.SIBLINGS_DIR || path.dirname(root) } = {}) {
  const dataSources = parseDataSources(readFileSync(path.join(root, "DATA_SOURCES.md"), "utf8"));
  const pdfCache = new Map();
  const pdf = (sc) => (docId, lang) => {
    const d = sc.documents.find((x) => x.id === docId);
    const href = d?.href?.[lang];
    if (!href) return null;
    const file = path.join(root, href);
    if (!existsSync(file)) return null;
    if (!pdfCache.has(file)) {
      const buf = readFileSync(file);
      pdfCache.set(file, { bytes: buf.length, pages: pdfPages(buf) });
    }
    return pdfCache.get(file);
  };
  return { dataSources, pdf, exports: findExports(siblingsDir) };
}

/** The challengers' own handoff files beside the repository: [{ tool, company, path }]. */
export function findExports(dir) {
  const out = [];
  const repos = ["BMC-challenger", "SWOT-challenger", "PESTEL-challenger"];
  const walk = (folder, depth) => {
    if (depth > 4 || !existsSync(folder)) return;
    for (const name of readdirSync(folder)) {
      if (name.startsWith(".") || name === "node_modules") continue;
      const p = path.join(folder, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p, depth + 1);
      else if (name.endsWith(".json") && st.size < 2_000_000) {
        try {
          const j = JSON.parse(readFileSync(p, "utf8"));
          if (j?.schema === "strategy-challenge/1" && j.tool?.id && j.company?.name) out.push({ tool: j.tool.id, company: j.company.name, path: p });
        } catch { /* not JSON: not an export */ }
      }
    }
  };
  for (const repo of repos) for (const sub of ["data", "exports"]) walk(path.join(dir, repo, sub), 0);
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const all = scenarios();
  if (process.argv.includes("--print-reference")) {
    for (const sc of all) {
      const ref = referenceOf(recordedRun(sc, "en"));
      ref.cost_cents = Object.fromEntries(LANGS.map((l) => [l, referenceOf(recordedRun(sc, l)).cost_cents]));
      console.log(`${sc.id}: ${JSON.stringify(ref)}`);
    }
    process.exit(0);
  }
  const base = contextFor();
  let problems = 0;
  for (const sc of all) {
    const found = checkScenario(sc, { ...base, pdf: base.pdf(sc) });
    console.log(`${sc.id} ${sc.company.name}: ${found.length ? `${found.length} problem${found.length === 1 ? "" : "s"}` : "passes"} (${sc.documents.length} documents, ${sc.answers.en.ideas.ideas.length} ideas, ${sc.answers.en.brief ? "a build brief, " : ""}both languages, recorded path and one other)`);
    for (const p of found) console.log(`  [${p.kind}] ${p.where}: ${p.message}`);
    problems += found.length;
  }
  if (base.exports.length) console.log(`Challenger exports found beside the repository: ${base.exports.map((e) => path.relative(path.dirname(ROOT), e.path)).join(", ")}`);
  if (problems) {
    console.log(`\n${problems} problem${problems === 1 ? "" : "s"}.`);
    process.exit(1);
  }
  console.log("\nSCENARIOS OK");
}
