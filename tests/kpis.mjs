// The shared sector KPI library (data/kpis.js, brief §4.1): thirteen sectors, `general` among them with
// ten KPIs and every other with 8 to 12; each KPI with an id <sector>.<name> unique in the library, a
// name, a unit and a one-line definition in English and German, and the direction that is better;
// definitions without figures, since the library holds no benchmark values; and the KPI the brief's
// example handoff file names. Prints KPIS OK.
// Usage: node tests/kpis.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const L = await import(path.join(ROOT, "data", "kpis.js"));
const r = createReport("kpis");

const text = (o) => o && typeof o.en === "string" && o.en.trim() && typeof o.de === "string" && o.de.trim();

/** Problems with one sector, as a list; the same rules for the library and the planted controls. */
function sectorProblems(s) {
  const out = [];
  if (!/^[a-z]+(?:_[a-z]+)*$/.test(s.id)) out.push(`${s.id}: id is not lower case with underscores`);
  if (!text(s.name)) out.push(`${s.id}: name missing in a language`);
  const n = s.kpis.length;
  if (s.id === "general" ? n !== 10 : n < 8 || n > 12) out.push(`${s.id}: ${n} KPIs`);
  for (const k of s.kpis) {
    if (!new RegExp(`^${s.id}\\.[a-z0-9]+(?:_[a-z0-9]+)*$`).test(k.id)) out.push(`${k.id}: id is not ${s.id}.<name>`);
    if (!["higher", "lower"].includes(k.better)) out.push(`${k.id}: better is ${k.better}`);
    for (const f of ["name", "unit", "definition"]) if (!text(k[f])) out.push(`${k.id}: ${f} missing in a language`);
    for (const lang of ["en", "de"]) {
      const d = k.definition?.[lang] || "";
      if (!/[.]$/.test(d)) out.push(`${k.id}: the ${lang} definition is not a sentence`);
      if (/\d/.test(d)) out.push(`${k.id}: the ${lang} definition holds a figure`);
    }
  }
  return out;
}

// ---- the rules can fail ----------------------------------------------------------------------------------
{
  const good = L.SECTORS.find((s) => s.id === "insurance");
  const bad = { ...good, kpis: [...good.kpis, { ...good.kpis[0], id: "retail_consumer.combined_ratio" }] };
  r.control(sectorProblems(bad).some((p) => /is not insurance/.test(p)), "a KPI filed under the wrong sector's id is caught");
  const figure = { ...good, kpis: good.kpis.map((k, i) => (i ? k : { ...k, definition: { en: "Usually 95 to 105 % in Europe.", de: k.definition.de } })) };
  r.control(sectorProblems(figure).some((p) => /holds a figure/.test(p)), "a benchmark value in a definition is caught");
}

// ---- the library ------------------------------------------------------------------------------------------
r.check(L.SECTORS.length === 13, `13 sectors (${L.SECTORS.length})`);
r.check(["general", "transport_logistics", "industrial_manufacturing", "energy_utilities"].every((id) => L.SECTOR_IDS.includes(id)), "general and the three scenario sectors are there");
r.check(L.SECTOR_IDS.length === new Set(L.SECTOR_IDS).size, "sector ids are unique");
for (const s of L.SECTORS) {
  const p = sectorProblems(s);
  r.check(!p.length, `${s.id}: ${s.kpis.length} KPIs, each with id, name, unit, definition and direction${p.length ? `: ${p.join("; ")}` : ""}`);
}
const ids = L.SECTORS.flatMap((s) => s.kpis.map((k) => k.id));
r.check(ids.length === new Set(ids).size, `${ids.length} KPI ids, each once in the library`);
const ex = L.kpiById("transport_logistics.cost_per_teu");
r.check(ex && ex.name.en === "Cost per container moved" && ex.unit.en === "EUR per TEU" && ex.better === "lower", "the example handoff file's KPI is there: Cost per container moved, EUR per TEU");
r.check(L.kpiById("transport_logistics.nothing") === null && L.sectorById("nowhere") === null && L.sectorById("general").kpis.length === 10, "unknown ids give null; a sector's KPIs come by its id");
r.check(Object.isFrozen(L.SECTORS) && L.SECTORS.every((s) => Object.isFrozen(s) && Object.isFrozen(s.kpis) && s.kpis.every((k) => Object.isFrozen(k))), "the library can't be changed at run time");

r.finish("KPIS OK");
