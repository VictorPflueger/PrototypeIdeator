// Reading a challenger's handoff file without a request (golden case PI4, AC-18's Node part): the brief's
// example of section 4.3 validates against schemas/strategy-challenge-1.json and becomes one issue with
// its title, tool, KPI, euro range, expected euros and chosen response, and the company as fictional,
// while fetch is never called. Files that are not handoff files, or break the schema, are refused with
// a reason. Prints HANDOFF OK.
// Usage: node tests/handoff.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = (f) => JSON.parse(readFileSync(path.join(ROOT, "tests", "fixtures", f), "utf8"));
const r = createReport("handoff");

// Any request during this suite is a failure: count them.
let requests = 0;
globalThis.fetch = async () => { requests += 1; throw new Error("no request may be sent while reading a handoff file"); };

const H = await import(path.join(ROOT, "js", "handoff.js"));
const F = await import(path.join(ROOT, "js", "format.js"));
const PI4 = fixture("pi4-handoff.json");
const example = fixture(PI4.input);
const want = PI4.expected;

// ---- the checks can fail ------------------------------------------------------------------------------
{
  const broken = structuredClone(example);
  broken.issues[0].eur_year_expected = "2.8 million";
  r.control(!H.readHandoff(broken).ok, "a figure written as text breaks the schema and the file is refused");
  const noSchema = structuredClone(example);
  delete noSchema.schema;
  r.control(!H.isHandoff(noSchema) && !H.readHandoff(noSchema).ok, "a JSON file without \"schema\": \"strategy-challenge/1\" is not a handoff file");
  const other = structuredClone(example);
  other.schema = "strategy-challenge/2";
  r.control(!H.readHandoff(other).ok, "a newer shape (strategy-challenge/2) is refused, not guessed at");
}

// ---- PI4 ----------------------------------------------------------------------------------------------
const got = H.readHandoff(example, { file: "tidewell-bmc.json" });
r.check(got.ok, `the example file validates and reads${got.ok ? "" : `: ${got.problems.join("; ")}`}`);
r.check(requests === want.requests, `no request was sent (${requests})`);
r.check(same({ name: got.company?.name, sector: got.company?.sector, fictional: got.company?.fictional }, want.company), `the company: ${got.company?.name}, ${got.company?.sector}, fictional ${got.company?.fictional}`);
r.check(got.issues?.length === want.issues.length, `one issue (${got.issues?.length})`);
const issue = got.issues?.[0] || {};
const w = want.issues[0];
r.check(issue.title === w.title, `its title: "${issue.title}"`);
r.check(issue.source?.tool?.id === w.tool.id && issue.source?.tool?.name === w.tool.name, `from the ${issue.source?.tool?.name}`);
r.check(same(issue.kpis?.map((k) => ({ name: k.name, id: k.id, unit: k.unit })), w.kpis), `with the KPI ${issue.kpis?.map((k) => `"${k.name}" (${k.unit})`).join(", ")}`);
r.check(issue.eur_year_low === w.eur_year_low && issue.eur_year_high === w.eur_year_high && issue.eur_year_expected === w.eur_year_expected, "the euro range and the expected euros as numbers, as the file gives them");
r.check(issue.response?.title === w.response.title && issue.response?.chosen === w.response.chosen, `the chosen response: "${issue.response?.title}"`);
for (const lang of ["en", "de"]) {
  const range = F.perYear(F.fmtEurRange(issue.eur_year_low, issue.eur_year_high, lang), lang);
  const expected = F.fmtEurCompact(issue.eur_year_expected, lang);
  r.check(range === w.shown[lang].range && expected === w.shown[lang].expected, `shown in ${lang === "en" ? "English" : "German"}: ${JSON.stringify(range)}, ${JSON.stringify(expected)} expected`);
}
r.check(issue.status === "kept" && issue.merged_into === null, "a handoff issue starts kept, merged into nothing");
r.check(/^bmc-/.test(issue.id) && issue.source?.file === "tidewell-bmc.json" && issue.source?.issue === "I1", `its id says which challenger it came from (${issue.id}), and its source names the file and the issue`);
r.check(issue.evidence?.length === 1 && issue.evidence[0].read_on === "2026-11-23", "its evidence keeps the date it was read");
r.check(!JSON.stringify(got).includes("The rendered management summary"), "the challenger's summary text is not carried into the issues");

// ---- several files, one company ----------------------------------------------------------------------
{
  const swot = structuredClone(example);
  swot.tool = { id: "swot-challenger", name: "SWOT Challenger", version: "1.0.0", url: "https://victorpflueger.github.io/SWOT-challenger/" };
  swot.framework = { type: "swot", areas: [{ id: "threats", label: "Threats", items: [{ id: "threats-1", text: "Allowance prices rise", source: "user" }] }] };
  swot.issues[0].areas = ["threats"];
  swot.issues[0].items = ["threats-1"];
  swot.responses[0].changes = [{ action: "rate", item: "threats-1", from: 4, to: 3 }];
  swot.figures.score = { name: "efe", scale: "1-4", before: 2.4, after: 2.9 };
  const both = H.readHandoffs([{ json: example, file: "a.json" }, { json: swot, file: "b.json" }]);
  r.check(both.ok && both.issues.length === 2 && new Set(both.issues.map((i) => i.id)).size === 2, `two challengers' files give two issues with distinct ids (${both.issues?.map((i) => i.id).join(", ")})`);
  r.check(both.company?.name === "Tidewell Lines" && both.tools?.length === 2, "one company, two tools");
  r.check(both.needsMergeProposal === true, "issues from more than one challenger ask for the Reader's short merge proposal");
  const one = H.readHandoffs([{ json: example, file: "a.json" }]);
  r.check(one.needsMergeProposal === false, "issues from one challenger need no merge proposal");
  const twoCompanies = structuredClone(swot);
  twoCompanies.company.name = "Arvento Drives";
  r.check(!H.readHandoffs([{ json: example, file: "a.json" }, { json: twoCompanies, file: "b.json" }]).ok, "files about two different companies are refused together");
}

r.check(requests === 0, "and after every case, still no request");
r.finish("HANDOFF OK");
