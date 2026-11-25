// The fact audit and the placeholders (brief §5.10): prose carries figures only as {{fact:key}}, filled
// by code from the engine's values in the run's language; the audit refuses any other number, while
// years, dates, counts in words up to twelve and names with digits as the documents write them pass.
// Refused text goes back once with its tokens; after two refusals it shows with an "Unchecked" tag.
// Every audit case below is a planted fixture with its expected tokens, so each rule can fail.
// Prints FACTS OK.
// Usage: node tests/facts.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const X = await import(path.join(ROOT, "js", "facts.js"));
const E = await import(path.join(ROOT, "js", "engine.js"));
const F = await import(path.join(ROOT, "js", "format.js"));
const r = createReport("facts");

const evidence = { texts: ["The plant follows Industry 4.0 and reports to ISO 14083.", "Wir messen nach ISO 14083."], titles: ["Annual report 2025"], quotes: [], urls: ["https://example.org/report"] };
const facts = ["at_stake", "top.score", "idea.A.cost", "issues.kept"];
const audit = (text) => X.auditText(text, { facts, evidence });

// [text, expected blocked tokens, what]
const CASES = [
  ["The pilot starts in 2027 and the rule took effect on 12 March 2026.", [], "a year and a written date pass"],
  ["Since 2026-01-01 the rule applies to every call.", [], "an ISO date passes"],
  ["It takes three people and five minutes to show.", [], "counts in words up to twelve pass"],
  ["It saves {{fact:at_stake}} a year at a score of {{fact:top.score}}.", [], "known placeholders pass"],
  ["The line follows Industry 4.0 and measures to ISO 14083.", [], "names with digits pass when the documents write them so"],
  ["See https://example.org/report for the method.", [], "a source's address passes"],
  ["Der Pilot startet am 12. März 2026 mit zwölf Fragen.", [], "a German date and zwölf pass"],
  ["It saves 14 % of fuel.", ["14", "%"], "a percentage is refused"],
  ["It saves about €2.8m a year.", ["2.8m"], "an amount the engine didn't write is refused"],
  ["It saves thirteen hours a week.", ["thirteen"], "a count in words above twelve is refused"],
  ["Half of the boxes miss their shuttle.", ["Half"], "a fraction in words is refused"],
  ["The line follows Industry 5.0.", ["5.0"], "a name with digits the documents don't write is refused"],
  ["Das spart dreißig Stunden und die Hälfte der Wege.", ["dreißig", "Hälfte"], "German: dreißig and Hälfte are refused"],
  ["In Q3 the rates fell by 28 per cent.", ["Q3", "28", "per cent"], "a quarter's short form, a number and per cent are refused"]
];
r.control(same(audit("It ships 14 boxes.").tokens, ["14"]), "a bare number is caught, so the audit can refuse");
r.control(same(audit("It starts on 12 Marchy 2026.").tokens, ["12"]) && audit("It starts on 12 March 2026.").pass, "only a real month makes a day number part of a date");
r.control(same(X.auditText("The line follows Industry 4.0.", { facts, evidence: {} }).tokens, ["4.0"]), "a name with digits passes only on the documents' word: without them it is refused");
for (const [text, tokens, what] of CASES) {
  const got = audit(text);
  r.check(same(got.tokens, tokens) && got.pass === !tokens.length, `${what}: ${JSON.stringify(text)} gives ${JSON.stringify(got.tokens)}`);
}
{
  const got = audit("The cost is {{fact:nope}} a year.");
  r.check(!got.pass && same(got.unknownFacts, ["nope"]), "a placeholder the engine didn't return is refused");
  const quoted = X.auditText('The report says "Industry 4.0 makes the plant ready".', { facts, evidence: { texts: ["Industry 4.0 makes the plant ready"] } });
  r.check(quoted.pass, "a quotation the documents contain word for word passes");
}

// ---- refused twice: Unchecked, never silent -----------------------------------------------------------
{
  let st = X.auditState();
  st = X.nextAuditState(st, audit("It saves 14 % of fuel."));
  r.check(st.status === "repair" && same(st.tokens, ["14", "%"]), "a first refusal sends the text back with its tokens");
  st = X.nextAuditState(st, audit("It saves 15 % of fuel."));
  r.check(st.status === "unchecked" && st.refusals === 2, "a second refusal shows the text with the Unchecked tag");
  const fine = X.nextAuditState(X.nextAuditState(X.auditState(), audit("It saves 14 % of fuel.")), audit("It saves {{fact:at_stake}} a year."));
  r.check(fine.status === "checked", "a repaired text that passes is checked");
}

// ---- placeholders filled from the engine, in both languages --------------------------------------------
{
  const values = E.factValues({
    issues: [{ id: "I1", status: "kept", eur_year_expected: 2800000 }, { id: "I2", status: "kept", eur_year_expected: 1900000 }, { id: "I3", status: "kept", eur_year_expected: null }],
    ideas: [{ id: "A", name: "Surcharge check", issues: ["I1"], live_inputs: { model_calls: 24, web_searches: 6 }, ratings: { value: 5, evidence: 5, buildable: 4, agentic: 5, relevance: 5, demo: 5, risk: 4 } }],
    model: "claude-sonnet-5-5"
  });
  const text = "{{fact:at_stake}} at stake; {{fact:top.name}} leads with {{fact:top.score}} and costs {{fact:idea.A.cost}} a run.";
  r.check(X.renderFacts(text, values, "en") === "€4.7m on 2 of 3 issues at stake; Surcharge check leads with 4.75 and costs €0.30 a run.", `English: ${X.renderFacts(text, values, "en")}`);
  r.check(X.renderFacts(text, values, "de") === "4,7 Mio. € bei 2 von 3 Themen at stake; Surcharge check leads with 4,75 and costs 0,30 € a run.", `German figures: ${X.renderFacts(text, values, "de")}`);
  r.check(X.renderFacts("Kept: {{fact:issues.kept}}; unknown: {{fact:nope}}", values, "en") === "Kept: 3; unknown: {{fact:nope}}", "a count renders as a number; an unknown key stays as written, so it shows");
  r.check(X.renderFacts("{{fact:at_stake}}", { at_stake: { type: "eur", value: null, stated: 0, of: 2 } }, "en") === "No issue states an amount", "no amount stated renders as words, never as €0");
  // Review C4: an idea's cost a run in prose reads as the tables write it, never €0.00 beside their €0.005.
  const cheap = E.factValues({ issues: [{ id: "I1", status: "kept", eur_year_expected: 1000000 }], ideas: [{ id: "A", name: "A", issues: ["I1"], live_inputs: { model_calls: 6, web_searches: 0 }, ratings: { value: 3, evidence: 3, buildable: 3, agentic: 3, relevance: 3, demo: 3, risk: 3 } }], model: "claude-haiku-5-5" });
  const runCost = cheap["idea.A.cost"].value;
  const prose = { en: X.renderFacts("{{fact:idea.A.cost}}", cheap, "en"), de: X.renderFacts("{{fact:idea.A.cost}}", cheap, "de") };
  r.check(prose.en === F.fmtEurRun(runCost, "en") && prose.de === F.fmtEurRun(runCost, "de") && !/0[.,]00\b/.test(prose.en + prose.de),
    `a cheap idea's cost a run (€${runCost.toFixed(5)}) reads "${prose.en}" and "${prose.de}" in prose, as the tables write it`);
  r.check(X.formatFact({ type: "eur_run", value: 0.00465 }, "en") === "€0.005" && X.formatFact({ type: "eur_run", value: 0.02485 }, "en") === "€0.025", "€0.00465 and €0.02485 read €0.005 and €0.025, the tables' figures");
  r.control(F.fmtEur(0.00465, "en") === "€0.00" && F.fmtEur(0.02485, "en") === "€0.02", "in whole cents they read €0.00 and €0.02, the fault the check above guards against");
}

r.finish("FACTS OK");
