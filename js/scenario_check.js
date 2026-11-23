// The scenario checks (brief §7, PLAN.md §5.3): what tools/check-scenarios.mjs runs on every scenario, and
// what tests/scenarios.mjs plants defects against. Pure: the caller hands in what needs the file system
// (DATA_SOURCES.md parsed, each PDF's page texts and size, the challengers' exports found beside the
// repository). Each problem has a kind, so a planted defect can be shown to fail for its own reason:
//   schema        the scenario, an answer or a handoff file breaks its schema
//   id            an answer or a choice names an issue or an idea that doesn't exist
//   language      a text is missing in a language, or stands untranslated in both
//   placeholders  a text's {{fact:…}} placeholders differ between the languages
//   audit         prose the fact audit or the Ideator's guards refuse, or a writing rule it breaks
//   reference     a figure no longer matches the frozen reference
//   fact          a fact or an address missing from DATA_SOURCES.md, or read on another date
//   key           anything shaped like an API key
//   thinking      a thinking block
//   stand-in      a stand-in not marked as one, or one whose challenger has published its own export
//   pdf           a PDF whose size or page count moved, or a quote not on the page it names
//   choice        another path than the recorded one gives figures or texts that disagree

import { validate, describeErrors } from "./schema.js";
import { CONTRACTS, REGISTRY, readerSchema, mergesSchema, ideasSchema, recommendationSchema, HANDOFF_FILE } from "./schemas.js";
import { FACT_RE, auditText, normalise } from "./facts.js";
import { ideaProblems } from "./guards.js";
import { buildRun, recordedRun, referenceOf, readScenario, ideasOf, evidenceOf } from "./simulation.js";
import { CRITERIA } from "./engine.js";
import { DOC_PREFIX } from "./issues.js";

export const LANGS = ["en", "de"];
const KEY_SHAPED = /sk-ant-[A-Za-z0-9_-]{6,}|\bsk-[A-Za-z0-9]{24,}/;
const placeholders = (s) => [...String(s).matchAll(FACT_RE)].map((m) => m[1]).sort();
const words = (s) => normalise(s).split(" ").filter(Boolean).length;
const squash = (s) => String(s ?? "").replace(/\s+/gu, "");

/** DATA_SOURCES.md's tables as a map: fact id → { urls, read_on }. */
export function parseDataSources(markdown) {
  const out = new Map();
  for (const line of String(markdown).split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6 || !/^S[1-3]-[A-Z]+$/.test(cells[1])) continue;
    out.set(cells[1], { urls: cells[3].split(";").map((u) => u.trim()).filter(Boolean), read_on: cells[4] });
  }
  return out;
}

/** Every string leaf of a value with its path. */
function leaves(value, path = "", out = []) {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}

/** The two languages' answers side by side: a missing text, an untranslated one, placeholders that differ. */
function compareLanguages(en, de, where, add) {
  const walk = (a, b, path) => {
    if (typeof a === "string" || typeof b === "string") {
      if (typeof a !== "string" || typeof b !== "string" || (normalise(a) === "") !== (normalise(b) === "")) {
        add("language", `${where}.${path}`, `missing in ${typeof a !== "string" || normalise(a) === "" ? "English" : "German"}`);
        return;
      }
      if (a === b && words(a) > 3 && /\p{L}/u.test(a)) add("language", `${where}.${path}`, `the same text in both languages: "${a.slice(0, 60)}"`);
      const pa = placeholders(a).join(",");
      const pb = placeholders(b).join(",");
      if (pa !== pb) add("placeholders", `${where}.${path}`, `English has {${pa}}, German {${pb}}`);
      return;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) { add("language", `${where}.${path}`, "the languages have different lists"); return; }
      a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`));
      return;
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(k in a) || !(k in b)) add("language", `${where}.${path}.${k}`, `missing in ${k in a ? "German" : "English"}`);
        else walk(a[k], b[k], path ? `${path}.${k}` : k);
      }
    }
  };
  walk(en, de, "");
}

/** Objects that look like a thinking block, anywhere in a value. */
function thinkingBlocks(value, path = "", out = []) {
  if (Array.isArray(value)) value.forEach((v, i) => thinkingBlocks(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    if (value.type === "thinking" || value.type === "redacted_thinking") out.push(path || "(top)");
    for (const [k, v] of Object.entries(value)) {
      if (k === "thinking" || k === "redacted_thinking") out.push(path ? `${path}.${k}` : k);
      thinkingBlocks(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

/** At stake and coverage worked out again, without the engine: the check on the engine's figures. */
function independentFigures(issues, ideas) {
  const kept = issues.filter((i) => i.status === "kept");
  let eur = 0;
  let stated = 0;
  for (const k of kept) {
    const values = [k, ...issues.filter((x) => x.status === "merged" && x.merged_into === k.id)].map((x) => x.eur_year_expected).filter((v) => typeof v === "number");
    if (values.length) { eur += Math.max(...values); stated += 1; }
  }
  const keptOf = (id) => {
    const i = issues.find((x) => x.id === id);
    if (!i) return null;
    if (i.status === "kept") return i.id;
    if (i.status === "merged") return i.merged_into;
    return null;
  };
  const covered = new Set(ideas.flatMap((d) => d.issues.map(keptOf)).filter(Boolean));
  return { eur: stated ? eur : null, stated, of: kept.length, covered: covered.size };
}

/** The weighted scores worked out again, without the engine, for the top idea. */
function independentTop(ideas, weights) {
  const total = CRITERIA.reduce((s, c) => s + weights[c], 0);
  const scored = ideas.map((d) => ({ id: d.id, v: CRITERIA.reduce((s, c) => s + d.ratings[c].score * weights[c], 0) / total }));
  const best = Math.max(...scored.map((x) => x.v));
  return { value: best, ids: scored.filter((x) => Math.abs(x.v - best) < 1e-9).map((x) => x.id) };
}

/** Another path through the scenario than the recorded one: a parked issue, a merge undone, new weights, another shortlist. */
export function otherChoices(sc, lang = "en") {
  const read = readScenario(sc, lang);
  const ideas = ideasOf(sc, lang);
  const recorded = sc.choices.issues || [];
  const merged = recorded.find((d) => d.action === "merge");
  const named = new Set(ideas.flatMap((i) => i.issues));
  const keptIds = read.issues.map((i) => i.id).filter((id) => !recorded.some((d) => d.id === id) && !recorded.some((d) => d.into === id));
  const park = keptIds.find((id) => named.has(id)) || keptIds[0];
  const decisions = [
    ...recorded.filter((d) => d !== merged),
    ...(park ? [{ id: park, action: "park", into: null, reason: "Covered by another programme" }] : [])
  ];
  const weights = { value: 40, evidence: 5, buildable: 10, agentic: 10, relevance: 10, demo: 20, risk: 5 };
  const ranked = buildRun(sc, lang, { decisions, weights }).ranked;
  const picks = ranked.slice(1, 4).map((r) => r.id).reverse();
  return { decisions, weights, picks, decided: true };
}

/**
 * Every check on one resolved scenario. ctx: { dataSources (parseDataSources), pdf(docId, lang) →
 * { bytes, pages: [{ text }] } or null, exports: [{ tool, company, path }] found beside the repository }.
 * Returns the problems, each { kind, where, message }; none means the scenario passes.
 */
export function checkScenario(sc, ctx = {}) {
  const problems = [];
  const add = (kind, where, message) => problems.push({ kind, where: `${sc.id}: ${where}`, message });

  // key and thinking, anywhere in the scenario, before anything else
  for (const [path, s] of leaves(sc)) if (KEY_SHAPED.test(s)) add("key", path, "something shaped like an API key");
  for (const path of thinkingBlocks(sc)) add("thinking", path, "a thinking block");

  // schema: the scenario, the handoff files, every answer
  const v = validate(sc, CONTRACTS.Scenario, REGISTRY);
  if (!v.valid) add("schema", "scenario", describeErrors(v.errors).split("\n").slice(0, 5).join("; "));
  for (const d of sc.documents) {
    if (d.kind !== "handoff") continue;
    for (const lang of LANGS) {
      const file = sc.files?.[d.id]?.[lang];
      const hv = file ? validate(file, HANDOFF_FILE, HANDOFF_FILE.$defs) : { valid: false, errors: [{ path: "", message: "no file" }] };
      if (!hv.valid) add("schema", `${d.id} (${lang})`, describeErrors(hv.errors).split("\n").slice(0, 3).join("; "));
    }
  }
  for (const lang of LANGS) {
    const a = sc.answers?.[lang];
    if (!a) { add("language", `answers.${lang}`, "missing"); continue; }
    const check = (name, value, schema) => {
      if (value === null || value === undefined) return;
      const r = validate(value, schema);
      if (!r.valid) add("schema", `answers.${lang}.${name}`, describeErrors(r.errors).split("\n").slice(0, 3).join("; "));
    };
    check("reader", a.reader, readerSchema());
    check("merges", a.merges, mergesSchema());
    check("ideas", a.ideas, ideasSchema(sc.count));
    check("recommendation", a.recommendation, recommendationSchema());
  }
  if (sc.answers?.en && sc.answers?.de) compareLanguages(sc.answers.en, sc.answers.de, "answers", add);
  for (const k of ["pitch", "focus"]) if (sc[k]) compareLanguages(sc[k].en, sc[k].de, k, add);
  if (problems.some((p) => p.kind === "schema" || p.kind === "language")) return problems;

  // ids: merges, ideas and choices name what exists
  const read = readScenario(sc, "en");
  const issueIds = new Set(read.issues.map((i) => i.id));
  const readerIds = new Set((sc.answers.en.reader?.issues || []).map((i) => i.id));
  const known = (id) => issueIds.has(id) || (readerIds.has(id) && issueIds.has(`${DOC_PREFIX}${id}`));
  const merges = sc.answers.en.reader ? sc.answers.en.reader.merges : sc.answers.en.merges?.merges || [];
  for (const m of merges) for (const id of [m.keep, ...m.merged]) if (!known(id)) add("id", "merges", `"${id}" is not an issue of the run`);
  const ideas = ideasOf(sc, "en");
  const ideaIds = new Set(ideas.map((i) => i.id));
  ideas.forEach((idea, k) => { for (const id of idea.issues) if (!issueIds.has(id)) add("id", `ideas[${k}]`, `issue "${id}" does not exist`); });
  for (const d of sc.choices.issues || []) {
    if (!issueIds.has(d.id)) add("id", "choices.issues", `"${d.id}" is not an issue of the run`);
    if (d.action === "merge" && !issueIds.has(d.into)) add("id", "choices.issues", `"${d.into}" is not an issue of the run`);
  }
  for (const id of sc.choices.shortlist || []) if (!ideaIds.has(id)) add("id", "choices.shortlist", `"${id}" is not an idea`);
  if (problems.some((p) => p.kind === "id")) return problems;

  // audit: every prose field in both languages, with the run's facts and evidence
  for (const lang of LANGS) {
    const run = recordedRun(sc, lang);
    const facts = Object.keys(run.facts);
    const a = sc.answers[lang];
    const evidence = evidenceOf(run.issues);
    const g = ideaProblems(a.ideas, { count: sc.count, issues: run.issues, facts, evidence });
    for (const x of g.refusals) add("audit", `answers.${lang}.ideas`, x);
    for (const x of g.audit) add("audit", `answers.${lang}.${x.where}`, `refused: ${[...x.tokens, ...x.unknownFacts].join(", ")}`);
    for (const x of g.notes) if (/dash|stock word/.test(x)) add("audit", `answers.${lang}.ideas`, x);
    const prose = [];
    for (const [k, s] of Object.entries(a.recommendation)) prose.push([`recommendation.${k}`, s]);
    for (const [i, m] of merges.entries()) prose.push([`merges[${i}].why`, (a.reader ? a.reader.merges : a.merges.merges)[i]?.why]);
    if (a.reader) a.reader.issues.forEach((x, i) => { prose.push([`reader.issues[${i}].title`, x.title], [`reader.issues[${i}].description`, x.description], [`reader.issues[${i}].area`, x.area]); });
    for (const [where, s] of prose) {
      const r = auditText(s, { facts, evidence });
      if (!r.pass) add("audit", `answers.${lang}.${where}`, `refused: ${[...r.tokens, ...r.unknownFacts].join(", ")}`);
      if (/\S\s*—\s*\S|\S\s+–\s+\S/u.test(s)) add("audit", `answers.${lang}.${where}`, "a dash as punctuation");
    }
    if (a.reader) a.reader.issues.forEach((x, i) => x.sources.forEach((s, j) => { if (s.quote.length > 150) add("audit", `answers.${lang}.reader.issues[${i}].sources[${j}]`, "a quote longer than 150 characters"); }));
  }

  // fact: every fact and every address the scenario cites is in DATA_SOURCES.md, read on the same day
  const ds = ctx.dataSources || new Map();
  const listed = new Set();
  for (const f of sc.facts) {
    const row = ds.get(f.id);
    if (!row) { add("fact", `facts.${f.id}`, "not in DATA_SOURCES.md"); continue; }
    if (!row.urls.includes(f.url)) add("fact", `facts.${f.id}`, `${f.url} is not its address in DATA_SOURCES.md`);
    if (row.read_on !== f.read_on) add("fact", `facts.${f.id}`, `read on ${f.read_on} here, ${row.read_on} in DATA_SOURCES.md`);
    for (const u of row.urls) listed.add(u);
  }
  const cited = new Set();
  for (const d of sc.documents) if (d.kind === "handoff") for (const lang of LANGS) for (const [path, s] of leaves(sc.files[d.id][lang])) if (/(?:evidence|sources)\[\d+\]\.url$/.test(path)) cited.add(s);
  for (const lang of LANGS) for (const [, s] of leaves(sc.answers[lang])) for (const u of s.match(/https?:\/\/[^\s"')]+/g) || []) cited.add(u.replace(/[.,;]$/, ""));
  for (const u of cited) if (!listed.has(u)) add("fact", "sources", `${u} is cited but not listed in DATA_SOURCES.md for ${sc.id}`);

  // stand-in: marked, and not yet replaced by the challenger's own export
  for (const d of sc.documents) {
    if (d.kind !== "handoff") continue;
    if (d.stand_in !== true) add("stand-in", d.id, "a handoff file not exported by its challenger must be marked as a stand-in");
    for (const lang of LANGS) if (!/stand-in|Platzhalter/i.test(sc.files[d.id][lang].disclaimer)) add("stand-in", `${d.id} (${lang})`, "the file's disclaimer doesn't say it is a stand-in");
    const theirs = (ctx.exports || []).find((e) => e.tool === sc.files[d.id].en.tool.id && e.company === sc.company.name);
    if (theirs) add("stand-in", d.id, `the ${sc.files[d.id].en.tool.name} has published its own export (${theirs.path}): replace the stand-in`);
  }

  // pdf: size and pages as frozen, and every quote on the page it names
  for (const d of sc.documents) {
    if (d.kind !== "pdf") continue;
    for (const lang of LANGS) {
      const got = ctx.pdf ? ctx.pdf(d.id, lang) : null;
      if (!got) { add("pdf", `${d.id} (${lang})`, "the PDF could not be read"); continue; }
      if (got.bytes !== d.bytes[lang]) add("pdf", `${d.id} (${lang})`, `${got.bytes} bytes, the scenario says ${d.bytes[lang]}`);
      if (got.pages.length !== d.pages[lang]) add("pdf", `${d.id} (${lang})`, `${got.pages.length} pages, the scenario says ${d.pages[lang]}`);
      const reader = sc.answers[lang].reader;
      for (const [i, x] of (reader?.issues || []).entries()) {
        for (const s of x.sources) {
          if (s.file !== d.name[lang]) { add("pdf", `answers.${lang}.reader.issues[${i}]`, `cites "${s.file}", which is not a document of the run`); continue; }
          const n = Number((s.where.match(/(\d+)/) || [])[1]);
          const text = got.pages[n - 1]?.text;
          if (!text || !squash(text).includes(squash(s.quote))) add("pdf", `answers.${lang}.reader.issues[${i}]`, `"${s.quote.slice(0, 50)}…" is not on ${s.where}`);
        }
      }
    }
  }

  // reference: the engine's figures along the recorded choices, as frozen
  if (!sc.reference) add("reference", "reference", "no frozen reference figures");
  else {
    for (const lang of LANGS) {
      const got = referenceOf(recordedRun(sc, lang));
      const want = sc.reference;
      for (const k of ["at_stake", "kept", "covered", "ideas", "order", "top", "firsts", "shortlist_share"]) {
        if (JSON.stringify(got[k]) !== JSON.stringify(want[k])) add("reference", `reference.${k} (${lang})`, `${JSON.stringify(got[k])}, frozen ${JSON.stringify(want[k])}`);
      }
      if (JSON.stringify(got.cost_cents) !== JSON.stringify(want.cost_cents?.[lang])) add("reference", `reference.cost_cents.${lang}`, `${JSON.stringify(got.cost_cents)}, frozen ${JSON.stringify(want.cost_cents?.[lang])}`);
    }
  }

  // choice: the recorded path and another give figures and texts that agree with an independent count
  for (const lang of LANGS) {
    for (const [label, run] of [["recorded", recordedRun(sc, lang)], ["other", buildRun(sc, lang, otherChoices(sc, lang))]]) {
      const ind = independentFigures(run.issues, run.ideas);
      const f = run.figures;
      if (f.atStake.eur !== ind.eur || f.atStake.stated !== ind.stated || f.atStake.of !== ind.of) add("choice", `${label} path (${lang})`, `at stake ${JSON.stringify(f.atStake)}, counted ${JSON.stringify(ind)}`);
      if (f.covered.covered !== ind.covered || f.covered.of !== ind.of) add("choice", `${label} path (${lang})`, `covered ${f.covered.covered} of ${f.covered.of}, counted ${ind.covered} of ${ind.of}`);
      const top = independentTop(run.ideas, run.weights);
      if (!top.ids.includes(f.top.id) || Math.abs(top.value - f.top.value) > 1e-9) add("choice", `${label} path (${lang})`, `top ${f.top.id} at ${f.top.value}, counted ${top.ids.join("/")} at ${top.value}`);
      for (const [k, s] of Object.entries(run.recommendation || {})) if (/\{\{fact:/.test(s)) add("choice", `${label} path (${lang}) recommendation.${k}`, `a placeholder is left: ${s}`);
      for (const idea of run.ideas) for (const [path, s] of leaves(idea)) {
        for (const key of placeholders(s)) if (!(key in run.facts)) add("choice", `${label} path (${lang}) ${idea.id}.${path}`, `{{fact:${key}}} has no value on this path`);
      }
    }
  }
  return problems;
}
