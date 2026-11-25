// Both languages (AC-03, its static part): js/i18n/en.js and de.js have the same keys, no empty value and
// the same placeholders in each value; every key the page or the code asks for exists in both; every key
// is used somewhere; and the presenter types no sentence of its own, so every word it shows switches with
// the language. Prints I18N OK.
// Usage: node tests/i18n.mjs
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(path.join(ROOT, f), "utf8");
const EN = (await import(path.join(ROOT, "js", "i18n", "en.js"))).default;
const DE = (await import(path.join(ROOT, "js", "i18n", "de.js"))).default;
const r = createReport("i18n");

const placeholders = (v) => [...String(v).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort();
/** Problems between two dictionaries: keys missing on either side, empty values, differing placeholders. */
function pairProblems(a, b) {
  const out = [];
  for (const k of Object.keys(a)) if (!Object.hasOwn(b, k)) out.push(`${k} only in the first`);
  for (const k of Object.keys(b)) if (!Object.hasOwn(a, k)) out.push(`${k} only in the second`);
  for (const [name, d] of [["first", a], ["second", b]]) for (const [k, v] of Object.entries(d)) if (typeof v !== "string" || (!v.trim() && v !== " and " && v !== " und ")) out.push(`${k} is empty in the ${name}`);
  for (const k of Object.keys(a)) if (Object.hasOwn(b, k) && !same(placeholders(a[k]), placeholders(b[k]))) out.push(`${k}: placeholders ${placeholders(a[k])} against ${placeholders(b[k])}`);
  return out;
}

// ---- the checks can fail -------------------------------------------------------------------------------
r.control(pairProblems({ a: "x", b: "{n} items" }, { a: "x", c: "y" }).length === 2, "a key missing on each side is caught");
r.control(pairProblems({ a: "{n} of {total}" }, { a: "{n} von {gesamt}" }).length === 1 && pairProblems({ a: "x" }, { a: " " }).length === 1, "differing placeholders and an empty value are caught");

// ---- the two dictionaries ----------------------------------------------------------------------------------
const p = pairProblems(EN, DE);
r.check(!p.length, `en.js and de.js: ${Object.keys(EN).length} keys each, none empty, the same placeholders${p.length ? `: ${p.join("; ")}` : ""}`);
const plurals = Object.keys(EN).filter((k) => /\.(one|other)$/.test(k));
r.check(plurals.every((k) => Object.hasOwn(EN, k.replace(/\.(one|other)$/, ".one")) && Object.hasOwn(EN, k.replace(/\.(one|other)$/, ".other"))), "every plural has its one and its other form");

// ---- every key asked for exists, every key is used ---------------------------------------------------------
const html = read("index.html");
const jsFiles = readdirSync(path.join(ROOT, "js"), { recursive: true }).filter((f) => f.endsWith(".js") && !/^i18n[\\/](en|de)\.js$/.test(f));
const code = jsFiles.map((f) => read(path.join("js", f))).join("\n");
const asked = new Set([
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) => m[1].split(";").map((x) => x.split(":")[1]?.trim()).filter(Boolean)),
  ...[...code.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]),
  ...[...code.matchAll(/\btn\(\s*"([a-zA-Z0-9_.]+)"/g)].flatMap((m) => [`${m[1]}.one`, `${m[1]}.other`])
]);
const missing = [...asked].filter((k) => !Object.hasOwn(EN, k) || !Object.hasOwn(DE, k));
r.check(asked.size > 40 && !missing.length, `the ${asked.size} keys the page and the code ask for exist in both languages${missing.length ? `: ${missing.join(", ")} missing` : ""}`);
// Keys the code builds from a prefix and a value, such as t(`crit.${c}`) or, in the report, which is in the
// run's language, tr(`crit.${c}`): every key of that shape counts as used.
const dynamic = [...code.matchAll(/\b(?:tn?|tr)\(\s*`([a-zA-Z0-9_.]*)\$\{[^}]+\}([a-zA-Z0-9_.]*)`/g)]
  .filter((m) => m[1].length > 2)
  .map((m) => new RegExp(`^${m[1].replace(/\./g, "\\.")}[a-zA-Z0-9_]+${m[2].replace(/\./g, "\\.")}(\\.(one|other))?$`));
const used = (k) => asked.has(k) || code.includes(`"${k}"`) || html.includes(`"${k}"`) || dynamic.some((re) => re.test(k));
const unused = Object.keys(EN).filter((k) => !used(k));
r.check(!unused.length, `every key is used${unused.length ? `: ${unused.join(", ")} unused` : ""}`);

// ---- no sentence typed into the presenter -------------------------------------------------------------------
const SENTENCE = /(["'`])([A-Z][a-z]+(?: [\p{L}'’,]+){2,}[.!?]?)\1/u;
for (const f of ["js/presenter.js", "js/main.js"]) {
  const lines = read(f).split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/console\.(error|warn|log)/.test(l));
  const hit = lines.find((l) => SENTENCE.test(l));
  r.check(!hit, `${f} types no sentence of its own${hit ? `: ${hit.trim().slice(0, 100)}` : ""}`);
}
r.control(SENTENCE.test('const x = "Run it live now";'), "the sentence scan finds a typed sentence");

// ---- the German page says it in German ----------------------------------------------------------------------
const differ = ["p.strip", "start.turn", "read.action", "p.ai", "p.live", "kpi.atStake.label", "p.public"].filter((k) => EN[k] === DE[k]);
r.check(!differ.length, `the page's main words differ between the languages${differ.length ? `: ${differ.join(", ")} are the same` : ""}`);
r.check(DE["p.ai"] === "Sie interagieren mit einem KI-System" && EN["p.ai"] === "You are interacting with an AI system", "the AI notice in Vici's fixed words, in both languages");
r.check(EN["p.public"] === "Public information only: never enter confidential, personal or otherwise protected data.", "the public-information notice in the brief's exact words");

r.finish("I18N OK");
