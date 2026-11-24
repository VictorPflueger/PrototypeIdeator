// The agents' guards (brief §6.7, PLAN.md §8.2 and §8.3): checks the output schema can't hold. A
// well-formed answer for Tidewell Lines (tests/fixtures/ideator-s1-answer.json, eight ideas) passes with
// nothing found; then each rule is broken on a copy of it and must be caught in the right kind: a
// refusal (sent back once, then the run stops), the fact audit (sent back once, then "Unchecked") or a
// note (reported only). The cap on ideas holds at ten even when more are asked for (AC-17). Since 0.3.0
// the Reader's, the merges request's and the Writer's guards too, on S3's and S1's recorded answers: a
// text file's quote word for word, a PDF's not checked, sources that name a file of the run, euros with
// their basis and in order; merges of issues that exist, each in one group; four texts with figures only
// as placeholders.
// Prints GUARDS OK.
// Usage: node tests/guards.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const G = await import(path.join(ROOT, "js", "guards.js"));
const P = await import(path.join(ROOT, "js", "probe.js"));
const r = createReport("guards");

const good = JSON.parse(readFileSync(path.join(ROOT, "tests", "fixtures", "ideator-s1-answer.json"), "utf8"));
const state = P.probeState({ count: 8 });
const opts = { count: 8, issues: P.S1.issues, facts: state.citable, evidence: state.evidence };
const copy = () => structuredClone(good);
const check = (answer, o = {}) => G.ideaProblems(answer, { ...opts, ...o });
const has = (list, re) => list.some((x) => re.test(typeof x === "string" ? x : x.where));

const base = check(good);
r.check(base.ok && !base.refusals.length && !base.audit.length && !base.notes.length, `the eight-idea answer for Tidewell Lines passes with nothing found${base.ok ? "" : `: ${JSON.stringify(base)}`}`);

// ---- refusals: one broken rule each, on a copy of the good answer -------------------------------------------
const REFUSALS = [
  ["nine ideas when eight were asked for", (a) => { a.ideas.push(structuredClone(a.ideas[7])); a.ideas[8].name = "Second Explainer"; }, {}, /9 ideas, but at most 8/],
  ["eleven ideas when twelve were asked for: the cap stays at ten", (a) => { while (a.ideas.length < 11) { const x = structuredClone(a.ideas[a.ideas.length % 8]); x.name = `Extra ${a.ideas.length}`; a.ideas.push(x); } }, { count: 12 }, /11 ideas, but at most 10/],
  ["no ideas at all", (a) => { a.ideas = []; }, {}, /no ideas/],
  ["an issue that doesn't exist", (a) => { a.ideas[0].issues = ["bmc-I9"]; }, {}, /issue "bmc-I9" does not exist/],
  ["an issue merged into another", (a) => { a.ideas[0].issues = ["swot-I1"]; }, {}, /issue "swot-I1" is not kept/],
  ["no issue named", (a) => { a.ideas[1].issues = []; }, {}, /names no issue/],
  ["one key figure", (a) => { a.ideas[2].key_figures = a.ideas[2].key_figures.slice(0, 1); }, {}, /1 key figures, 2 or 3 wanted/],
  ["four key figures", (a) => { const f = a.ideas[2].key_figures; a.ideas[2].key_figures = [...f, ...f]; }, {}, /4 key figures, 2 or 3 wanted/],
  ["a public key figure without its source", (a) => { a.ideas[3].key_figures[0].source = ""; }, {}, /marked public, but today's value or its source is missing/],
  ["a key figure marked not public that has a value", (a) => { a.ideas[4].key_figures[0].today = "a day"; }, {}, /marked not public, but it has a value or a source/],
  ["a rating of six", (a) => { a.ideas[0].ratings.value.score = 6; }, {}, /value rating must be a whole number from 1 to 5/],
  ["a rating of zero", (a) => { a.ideas[0].ratings.risk.score = 0; }, {}, /risk rating must be a whole number from 1 to 5/],
  ["a rating of four and a half", (a) => { a.ideas[0].ratings.demo.score = 4.5; }, {}, /demo rating must be a whole number/],
  ["a rating without its reason", (a) => { a.ideas[5].ratings.agentic.reason = " "; }, {}, /agentic rating has no reason/],
  ["a rating missing", (a) => { delete a.ideas[5].ratings.evidence; }, {}, /evidence rating must be a whole number/],
  ["what it does in 26 words", (a) => { a.ideas[6].what_it_does = Array.from({ length: 26 }, () => "word").join(" "); }, {}, /what it does has 26 words, at most 25/],
  ["a name of four words", (a) => { a.ideas[6].name = "Very Long Idea Name"; }, {}, /the name has more than three words/],
  ["two ideas with the same name", (a) => { a.ideas[7].name = "allowance gap agent"; }, {}, /the same name as idea 1/],
  ["two steps the room sees", (a) => { a.ideas[1].room = a.ideas[1].room.slice(0, 2); }, {}, /2 steps the room sees, 3 to 5 wanted/],
  ["six steps the room sees", (a) => { a.ideas[1].room = [...a.ideas[1].room, "Five", "Six"]; }, {}, /6 steps the room sees, 3 to 5 wanted/],
  ["an agent step left empty", (a) => { a.ideas[2].how.check = ""; }, {}, /how it works has no check/],
  ["the person's decision left empty", (a) => { a.ideas[2].how.decision = ""; }, {}, /how it works has no decision/],
  ["four risks", (a) => { a.ideas[3].risks = ["One risk", "Two risks", "Three risks", "Four risks"]; }, {}, /4 risks, at most 3/],
  ["build effort low above high", (a) => { a.ideas[4].effort_days = { low: 12, high: 8 }; }, {}, /build effort must be whole person-days/],
  ["build effort of zero days", (a) => { a.ideas[4].effort_days = { low: 0, high: 3 }; }, {}, /build effort must be whole person-days/],
  ["a live run of no model calls", (a) => { a.ideas[5].live_inputs.model_calls = 0; }, {}, /live-run inputs must be at least one model call/],
  ["why build it left empty", (a) => { a.ideas[6].why = ""; }, {}, /why build it is empty/]
];
for (const [what, mutate, o, expect] of REFUSALS) {
  const a = copy();
  mutate(a);
  const found = check(a, o);
  r.check(!found.ok && has(found.refusals, expect), `refused: ${what}${has(found.refusals, expect) ? "" : ` (found ${JSON.stringify(found.refusals)})`}`);
}

// ---- the fact audit -----------------------------------------------------------------------------------------
const AUDIT = [
  ["a percentage in what it does", (a) => { a.ideas[0].what_it_does = "Cuts the surcharge gap by 12 % on every loop."; }, /idea 1 what_it_does/, ["12", "%"]],
  ["a sum in a rating's reason", (a) => { a.ideas[2].ratings.value.reason = "Rerouting costs €4.5m a year"; }, /idea 3 rating value reason/, ["4.5m"]],
  ["a fraction in words", (a) => { a.ideas[1].ratings.relevance.reason = "A third of the fleet burns heavy fuel oil"; }, /idea 2 rating relevance reason/, ["A third"]],
  ["a placeholder the facts don't have", (a) => { a.ideas[0].key_figures[1].demo = "The gap, {{fact:issue.bmc-I9.eur}} a year"; }, /idea 1 key figure 2 demo/, []]
];
for (const [what, mutate, where, tokens] of AUDIT) {
  const a = copy();
  mutate(a);
  const found = check(a);
  const hit = found.audit.find((x) => where.test(x.where));
  const ok = hit && JSON.stringify(hit.tokens) === JSON.stringify(tokens) && (tokens.length || hit.unknownFacts.length);
  r.check(!found.ok && !found.refusals.length && ok, `audited: ${what}${ok ? "" : ` (found ${JSON.stringify(found.audit)})`}`);
}
{
  const a = copy();
  a.ideas[3].ratings.evidence.reason = "The index stood at \"$4,176 on 19 November 2026\", the issue says";
  a.ideas[5].what_it_does = "Writes an emissions statement to the EN ISO 14083 method for every container from 2027.";
  const found = check(a);
  r.check(found.ok, `passes the audit: a quotation the issues contain word for word, a name with digits as the issues write it, a date and a year${found.ok ? "" : `: ${JSON.stringify(found.audit)}`}`);
}

// ---- notes: reported, never sent back -----------------------------------------------------------------------
const NOTES = [
  ["an em dash as punctuation", (a) => { a.ideas[0].why = "It closes the gap — and the room sees it."; }, /a dash as punctuation/],
  ["an en dash between spaces", (a) => { a.ideas[0].why = "It closes the gap – and the room sees it."; }, /a dash as punctuation/],
  ["a stock word", (a) => { a.ideas[1].why = "A robust way to avoid the penalty."; }, /the stock word "robust"/],
  ["a stock phrase with a curly apostrophe", (a) => { a.ideas[1].why = "In today’s market it avoids the penalty."; }, /the stock word "In today’s"/],
  ["eight ideas asked, seven given", (a) => { a.ideas.pop(); }, /7 ideas, 8 were asked for/],
  ["two ideas lead one issue while another has none", (a) => { a.ideas[7].issues = ["bmc-I1"]; }, /spread: bmc-I1 leads two ideas while pestel-I3 leads none/]
];
for (const [what, mutate, expect] of NOTES) {
  const a = copy();
  mutate(a);
  const found = check(a);
  r.check(found.ok && has(found.notes, expect), `noted, not refused: ${what}${has(found.notes, expect) ? "" : ` (found ${JSON.stringify(found.notes)})`}`);
}
{
  const a = copy();
  a.ideas[2].what_it_does = "Weighs each Europe–Asia loop's route every week and proposes the route with its cost.";
  const found = check(a);
  r.check(found.ok && !found.notes.length, "a range dash between two words is no dash as punctuation");
}
{
  const a = copy();
  for (const idea of a.ideas) idea.issues = [idea.issues[0], "bmc-I1"];
  const found = check(a, { count: 9 });
  r.check(!has(found.notes, /spread/), "the spread rule looks at the issue each idea answers first, and is quiet when every kept issue leads one");
}

// ---- the repair message -------------------------------------------------------------------------------------
{
  const a = copy();
  a.ideas[0].ratings.value.score = 6;
  a.ideas[0].what_it_does = "Cuts the gap by 12 % on every loop.";
  a.ideas[1].key_figures[1].demo = "The penalty, {{fact:nope}}";
  const msg = G.repairMessage(check(a));
  r.check(/value rating must be a whole number/.test(msg) && /idea 1 what_it_does: write these without numbers, or cite them as a placeholder from "facts": 12, %/.test(msg) && /placeholders are not in "facts": nope/.test(msg) && /Send the whole answer again/.test(msg), "the repair message lists every refusal and every refused token, and asks for the whole answer again");
}

// ---- the Reader, the merges request and the Writer ------------------------------------------------------------
{
  const { scenarioById } = await import(path.join(ROOT, "js", "scenarios.js"));
  const { evidenceOf } = await import(path.join(ROOT, "js", "simulation.js"));
  const s3 = scenarioById("s3");
  const s1 = scenarioById("s1");
  const pdf = s3.documents.find((d) => d.kind === "pdf").name.en;
  const files = [{ name: pdf, kind: "pdf", content: null }, { name: "notes.md", kind: "markdown", content: "# Notes\n\nThe grid waits for heat pumps.\n" }];
  const reader = s3.answers.en.reader;
  const rp = (a) => G.readerProblems(a, { files, evidence: {} });
  r.check(rp(reader).refusals.length === 0, `S3's recorded Reader answer passes the Reader's guards (${reader.issues.length} issues)`);
  const R = [
    ["a source in a file the run doesn't have", (a) => { a.issues[0].sources[0].file = "other.pdf"; }, /"other\.pdf" is not one of the files/],
    ["a quote from a text file that isn't in it", (a) => { a.issues[1].sources = [{ file: "notes.md", where: "section 1", quote: "The grid is ready for heat pumps." }]; }, /does not stand in notes\.md word for word/],
    ["a quote longer than 150 characters", (a) => { a.issues[1].sources[0].quote = "x".repeat(151); }, /151 characters, at most 150/],
    ["euros a year without their basis", (a) => { a.issues[2].eur_year_expected = 100000; a.issues[2].eur_basis = ""; }, /euros a year without their basis/],
    ["euros out of order", (a) => { Object.assign(a.issues[2], { eur_year_low: 300000, eur_year_expected: 200000, eur_year_high: 400000, eur_basis: "x" }); }, /must run low, expected, high/],
    ["a KPI id the library doesn't have", (a) => { a.issues[0].kpis = [{ name: "x", library_id: "energy.nope", today: "", unit: "" }]; }, /has no id "energy\.nope"/],
    ["two issues with one id", (a) => { a.issues[1].id = a.issues[0].id; }, /the same id as issue 1/]
  ];
  for (const [label, plant, re] of R) {
    const a = structuredClone(reader);
    plant(a);
    const found = rp(a);
    r.check(found.refusals.some((x) => re.test(x)), `the Reader: ${label} is refused (${found.refusals.find((x) => re.test(x)) || found.refusals.join("; ") || "nothing found"})`);
  }
  const fromPdf = rp({ ...structuredClone(reader), issues: [{ ...structuredClone(reader.issues[0]), sources: [{ file: pdf, where: "page 3", quote: "Words the PDF may not hold." }] }] });
  r.check(!fromPdf.refusals.some((x) => /word for word/.test(x)), "a quote from a PDF is not checked word for word: code can't read the PDF's text");
  // Merges on S1's three reports.
  const { readHandoffs } = await import(path.join(ROOT, "js", "handoff.js"));
  const issues = readHandoffs(s1.documents.map((d) => ({ json: s1.files[d.id].en, file: d.name.en }))).issues;
  const mp = (a) => G.mergesProblems(a, { issues, evidence: evidenceOf(issues) });
  r.check(mp(s1.answers.en.merges).refusals.length === 0, `S1's recorded merges pass the merges guards (${s1.answers.en.merges.merges.length} groups)`);
  const M = [
    ["an id that wasn't sent", (a) => { a.merges[0].merged = ["bmc-I99"]; }, /"bmc-I99" is not one of the issues sent/],
    ["an issue in two groups", (a) => { a.merges[1].merged = [...a.merges[1].merged, a.merges[0].merged[0]]; }, /is in two groups/],
    ["a group that merges nothing", (a) => { a.merges[0].merged = []; }, /merges nothing/]
  ];
  for (const [label, plant, re] of M) {
    const a = structuredClone(s1.answers.en.merges);
    plant(a);
    const found = mp(a);
    r.check(found.refusals.some((x) => re.test(x)), `the merges: ${label} is refused`);
  }
  // The Writer: four texts, figures only as placeholders.
  const rec = s1.answers.en.recommendation;
  const keys = [...new Set(Object.values(rec).join(" ").match(/\{\{fact:([^}]+)\}\}/g) || [])].map((x) => x.slice(7, -2));
  const wp = (a) => G.writerProblems(a, { facts: keys, evidence: {} });
  r.check(wp(rec).ok, "S1's recorded Writer answer passes the Writer's guards");
  const empty = wp({ ...rec, needed: " " });
  const number = wp({ ...rec, found: "Eight issues put 12.9 million euros a year at stake." });
  const unknown = wp({ ...rec, headline: "{{fact:nope}} leads." });
  r.check(empty.refusals.some((x) => /needed is empty/.test(x)) && number.audit.some((x) => x.where === "found" && x.tokens.includes("12.9")) && unknown.audit.some((x) => x.unknownFacts.includes("nope")), "the Writer: an empty text is refused, a bare figure and an unknown placeholder go to the fact audit");
}

// ---- the planted control: the guards would miss nothing on an answer that breaks everything ------------------
r.control(check({ ideas: [{ name: "", issues: [], room: [], how: {}, key_figures: [], ratings: {} }] }).refusals.length >= 10, "an answer with every field empty draws at least ten refusals");

r.finish("GUARDS OK");
