// The data contracts and the agents' output schemas (brief §10, PLAN.md §8.3): every contract the brief
// names exists; each output schema stays inside what structured outputs accept, with no optional
// parameter, at most 16 union types (four, all in the Reader's) and no unsupported keyword such as
// maxItems; the cap on ideas stands in the Ideator's description; both JSON schema files equal their
// module twins; the brief's example handoff file, the handoff reader's issues and a sample ideas file
// validate, and planted defects don't. Prints SCHEMAS OK.
// Usage: node tests/schemas.mjs
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = await import(path.join(ROOT, "js", "schemas.js"));
const { validate, describeErrors } = await import(path.join(ROOT, "js", "schema.js"));
const E = await import(path.join(ROOT, "js", "engine.js"));
const H = await import(path.join(ROOT, "js", "handoff.js"));
const { t } = await import(path.join(ROOT, "js", "i18n", "index.js"));
const r = createReport("schemas");
const json = (f) => JSON.parse(readFileSync(path.join(ROOT, f), "utf8"));
const ok = (value, schema, registry = S.REGISTRY) => validate(value, schema, registry);

// ---- what structured outputs accept -----------------------------------------------------------------------
const ALLOWED = new Set(["type", "properties", "required", "additionalProperties", "items", "enum", "const", "description", "anyOf", "minItems"]);
/** Problems with an output schema, plus its counts of optional and union-typed parameters. */
function wireProblems(schema) {
  const problems = [];
  let optional = 0;
  let unions = 0;
  const walk = (s, where) => {
    if (!s || typeof s !== "object") return;
    for (const k of Object.keys(s)) if (!ALLOWED.has(k)) problems.push(`${where}: keyword ${k} is not accepted`);
    if (s.minItems !== undefined && s.minItems !== 0 && s.minItems !== 1) problems.push(`${where}: minItems ${s.minItems}`);
    if (Array.isArray(s.type) || s.anyOf) unions += 1;
    if (s.type === "object" || s.properties) {
      if (s.additionalProperties !== false) problems.push(`${where}: object not closed`);
      const props = Object.keys(s.properties || {});
      const req = new Set(s.required || []);
      for (const p of props) if (!req.has(p)) optional += 1;
      for (const p of props) walk(s.properties[p], `${where}.${p}`);
    }
    if (s.items) walk(s.items, `${where}[]`);
    for (const alt of s.anyOf || []) walk(alt, `${where}|`);
  };
  walk(schema, "(root)");
  if (schema.type !== "object") problems.push("(root): not an object");
  return { problems, optional, unions };
}

// ---- the checks can fail ----------------------------------------------------------------------------------
{
  const planted = S.ideasSchema(5);
  planted.properties.ideas.maxItems = 5;
  r.control(wireProblems(planted).problems.some((p) => /maxItems/.test(p)), "a maxItems in an output schema is caught");
  const open = S.recommendationSchema();
  open.required = ["headline"];
  r.control(wireProblems(open).optional === 3, "a property left out of required counts as optional");
  r.control(!ok({ schema: "prototype-ideas/1" }, S.IDEAS_FILE, S.IDEAS_FILE.$defs).valid, "an empty ideas file fails its schema");
}

// ---- contracts --------------------------------------------------------------------------------------------
const NAMES = ["Document", "IssueMap", "Issue", "Idea", "KeyFigure", "Rating", "Weights", "Score", "Stability", "Shortlist", "Recommendation", "BuildBrief", "Scenario", "RunEvent", "AuditEvent"];
r.check(same(Object.keys(S.CONTRACTS), NAMES), `every contract of the brief's section 10 exists (${Object.keys(S.CONTRACTS).length})`);

// ---- output schemas ---------------------------------------------------------------------------------------
for (const [agent, make] of Object.entries(S.OUTPUT_SCHEMAS)) {
  const w = wireProblems(make());
  const unionsWanted = agent === "reader" ? 4 : 0;
  r.check(!w.problems.length && w.optional === 0 && w.unions === unionsWanted && w.unions <= 16, `${agent}: inside structured outputs' limits, ${w.optional} optional and ${w.unions} union-typed parameters${w.problems.length ? `: ${w.problems.join("; ")}` : ""}`);
}
const all = Object.values(S.OUTPUT_SCHEMAS).map((m) => wireProblems(m()));
r.check(all.reduce((a, w) => a + w.unions, 0) <= 16 && all.reduce((a, w) => a + w.optional, 0) <= 24, "even all five schemas together stay under 24 optional and 16 union-typed parameters");
for (const n of [1, 5, 10]) r.check(S.ideasSchema(n).properties.ideas.description === `At most ${n} ideas ({maxItems: ${n}})`, `the Ideator's schema for ${n} carries the cap in its description, as the SDK writes it`);
r.check(S.ideasSchema(15).properties.ideas.description.includes("At most 10") && S.ideasSchema(0).properties.ideas.description.includes("At most 1 "), "a cap above ten is held at ten, below one at one");
{
  const reader = S.readerSchema().properties.company.properties.sector.enum;
  r.check(reader.includes("transport_logistics") && reader.at(-1) === "other" && reader.length === 14, "the Reader's sector is one of the library's thirteen, or other");
  const ideaWire = Object.keys(S.ideasSchema(5).properties.ideas.items.properties);
  const ideaContract = Object.keys(S.CONTRACTS.Idea.properties);
  r.check(same([...ideaWire, "id"].sort(), [...ideaContract].sort()), "an idea from the Ideator becomes a contract idea by adding its id, nothing else");
  r.check(same(Object.keys(S.ideasSchema(5).properties.ideas.items.properties.ratings.properties), [...E.CRITERIA]), "the Ideator rates exactly the engine's seven criteria");
}

// ---- the JSON files and their module twins ---------------------------------------------------------------
r.check(same(S.HANDOFF_FILE, json("schemas/strategy-challenge-1.json")) && same(S.IDEAS_FILE, json("schemas/prototype-ideas-1.json")), "both module twins equal their JSON files");
{
  const sync = spawnSync(process.execPath, [path.join(ROOT, "tools", "sync-schemas.mjs"), "--check"], { encoding: "utf8" });
  r.check(sync.status === 0 && /SCHEMA TWINS OK/.test(sync.stdout), "tools/sync-schemas.mjs --check finds the twins as it would write them");
}

// ---- examples validate, defects don't ---------------------------------------------------------------------
const example = json("tests/fixtures/strategy-challenge-example.json");
{
  const v = ok(example, S.HANDOFF_FILE, S.HANDOFF_FILE.$defs);
  r.check(v.valid, `the brief's example handoff file validates against strategy-challenge-1.json${v.valid ? "" : `: ${describeErrors(v.errors)}`}`);
  const read = H.readHandoff(example, { file: "example.json" });
  const issueCheck = ok(read.issues[0], S.CONTRACTS.Issue);
  r.check(issueCheck.valid, `the handoff reader's issue is a contract Issue${issueCheck.valid ? "" : `: ${describeErrors(issueCheck.errors)}`}`);
}
const PI1 = json("tests/fixtures/pi1-scores.json");
const rating = (n) => ({ score: n, reason: "Planted reason." });
const sampleIdea = (i, n) => ({
  id: `P${n}`, name: `Idea ${i.id}`, what_it_does: "Checks a thing and proposes what to do.", issues: ["bmc-I1"], audience: "Pricing",
  room: ["A signal arrives.", "The agent checks it.", "A person decides."],
  how: { spot: "Watches prices.", check: "Reads the rule.", calculate: "Prices the options.", propose: "Three options.", prepare: "Drafts a notice.", decision: "The pricing lead decides." },
  key_figures: [{ name: "Cost per container moved", today: "", source: "", public: false, demo: "Cost per option" }, { name: "Detection to decision", today: "Days", source: "Annual report, p. 4", public: true, demo: "Under an hour" }],
  data: ["Public allowance prices"], risks: ["Legal reading needs a person."], effort_days: { low: 6, high: 8 }, live_inputs: { model_calls: 20, web_searches: 0 },
  ratings: Object.fromEntries(E.CRITERIA.map((c) => [c, rating(i.ratings[c])])), why: "It goes after the largest cost."
});
const ideas = PI1.ideas.map((i, n) => sampleIdea(i, n + 1));
{
  const ranked = E.rankIdeas(ideas, E.DEFAULT_WEIGHTS);
  const st = E.stability(ideas, E.DEFAULT_WEIGHTS);
  const file = {
    schema: "prototype-ideas/1", tool: { id: "prototype-ideator", name: "Prototype Ideator", version: "0.1.0", url: "https://victorpflueger.github.io/PrototypeIdeator/" },
    created: "2026-11-23T10:00:00Z", language: "en", mode: "simulation", model: null, setting: null,
    company: { name: "Tidewell Lines", sector: "transport_logistics", fictional: true }, stopped: null,
    issues: [{ id: "bmc-I1", title: "Emission allowances raise the cost of every European call", area: "Costs", description: "Planted.", money_as_stated: null, eur_year_low: 2000000, eur_year_high: 6000000, eur_year_expected: 2800000, eur_basis: "Planted.", estimate: false, kpis: [{ id: "transport_logistics.cost_per_teu", name: "Cost per container moved", unit: "EUR per TEU", today: null }], sources: [{ file: "tidewell-bmc.json", where: "issue I1" }], confidence: "medium", status: "kept", merged_into: null, park_reason: null, from: { kind: "handoff", tool: "Business Model Canvas Challenger" } }],
    ideas,
    weights: { ...E.DEFAULT_WEIGHTS },
    scores: ranked.map((x) => ({ idea: x.id, value: x.value, rank: x.rank })),
    stability: { of: st.of, rankings: st.rankings, counts: st.counts, sentence: E.stabilitySentence(st, (id) => id, (k, v) => t(k, v, "en")) },
    shortlist: { decided: true, picks: [{ idea: "P1", place: 1, points: 3 }, { idea: "P2", place: 2, points: 2 }, { idea: "P3", place: 3, points: 1 }] },
    disclaimer: "AI-generated analysis for discussion."
  };
  const v = ok(file, S.IDEAS_FILE, S.IDEAS_FILE.$defs);
  r.check(v.valid, `a sample ideas file with the engine's scores and stability validates against prototype-ideas-1.json${v.valid ? "" : `: ${describeErrors(v.errors)}`}`);
  const eleven = { ...file, ideas: [...ideas, ...ideas.slice(0, 5), { ...ideas[0], id: "P11" }] };
  r.check(!ok(eleven, S.IDEAS_FILE, S.IDEAS_FILE.$defs).valid, "an ideas file with eleven ideas fails");
  const six = structuredClone(file);
  six.ideas[0].ratings.value.score = 6;
  r.check(!ok(six, S.IDEAS_FILE, S.IDEAS_FILE.$defs).valid, "a rating of 6 fails");
  const one = structuredClone(file);
  one.ideas[0].key_figures = one.ideas[0].key_figures.slice(0, 1);
  r.check(!ok(one, S.IDEAS_FILE, S.IDEAS_FILE.$defs).valid, "an idea with one key figure fails");
  const text = structuredClone(file);
  text.issues[0].quotes = [{ file: "x", where: "p. 1", text: "document text", checked: "not-checked" }];
  r.check(!ok(text, S.IDEAS_FILE, S.IDEAS_FILE.$defs).valid, "an issue carrying a quotation of a document fails: the ideas file holds no document text");
}

// ---- every contract takes a sample of its own ------------------------------------------------------------
const SAMPLES = {
  Document: { id: "d1", name: "tidewell-bmc.json", kind: "handoff", bytes: 4096, pages: null, stand_in: true, fictional: true, from: "scenario" },
  Weights: { ...E.DEFAULT_WEIGHTS },
  Score: { idea: "P1", value: 4.75, rank: 1 },
  Shortlist: { decided: false, picks: [{ idea: "P1", place: 1, points: 3 }] },
  Recommendation: { headline: "Build {{fact:top.name}} first", looked_at: "Three reports.", found: "Nine issues.", needed: "Your vote." },
  BuildBrief: { idea: "P1", builds: "A browser prototype.", steps: ["Spot", "Check", "Decide"], key_figures: [{ name: "Cost", measures: "Money saved" }, { name: "Time", measures: "Detection to decision" }], data: ["Synthetic bookings"], tools: [{ name: "price_options", does: "Prices each option" }], guardrails: ["A person decides."], golden_cases: [{ name: "G1", given: "A closure", expect: "Three options" }, { name: "G2", given: "No closure", expect: "No alert" }] },
  RunEvent: { type: "decision", step: "read", at: 1200, detail: { issue: "bmc-I1", action: "keep" } },
  AuditEvent: { at: 1200, who: "person", action: "kept issue", detail: { issue: "bmc-I1" } },
  KeyFigure: ideas[0].key_figures[0],
  Rating: rating(4),
  Idea: ideas[0],
  Issue: H.readHandoff(example, { file: "a.json" }).issues[0],
  Stability: (() => { const st = E.stability(ideas, E.DEFAULT_WEIGHTS); return { of: st.of, rankings: st.rankings, counts: st.counts, sentence: "x" }; })(),
  IssueMap: { company: { name: "Tidewell Lines", sector: "transport_logistics", goals: [], targets: [], fictional: true }, issues: H.readHandoff(example, { file: "a.json" }).issues, merges: [] },
  Scenario: {
    schema: "pi-scenario/1", id: "s1", source: "authored", as_of: "2026-11-23",
    company: { name: "Tidewell Lines", sector: "transport_logistics", country: "DE", fictional: true },
    documents: [{ id: "d1", name: "tidewell-bmc.json", kind: "handoff", bytes: 4096, pages: null, stand_in: true, fictional: true, from: "scenario" }],
    answers: {
      en: { reader: null, merges: { merges: [] }, ideas: { ideas: [] }, recommendation: { headline: "h", looked_at: "l", found: "f", needed: "n" }, brief: null },
      de: { reader: null, merges: { merges: [] }, ideas: { ideas: [] }, recommendation: { headline: "h", looked_at: "l", found: "f", needed: "n" }, brief: null }
    },
    choices: { issues: [{ id: "bmc-I1", action: "keep", into: null, reason: null }], weights: null, shortlist: ["P1", "P2", "P3"], brief_idea: null }
  }
};
for (const name of NAMES) {
  const v = ok(SAMPLES[name], S.CONTRACTS[name]);
  r.check(v.valid, `${name}: a sample validates${v.valid ? "" : `: ${describeErrors(v.errors)}`}`);
}
r.check(!ok({ ...SAMPLES.Weights, value: 45 }, S.CONTRACTS.Weights).valid && !ok({ ...SAMPLES.Document, kind: "docx" }, S.CONTRACTS.Document).valid && !ok({ ...SAMPLES.RunEvent, step: "elsewhere" }, S.CONTRACTS.RunEvent).valid, "and planted defects fail: a weight of 45, a Word file, an unknown step");

r.finish("SCHEMAS OK");
