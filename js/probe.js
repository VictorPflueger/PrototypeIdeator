// The Ideator probe (PLAN.md §2, fix 1): before the screens of 0.2.0 are built on top of it, the riskiest
// moment is tried first. It sends the Ideator's real request (js/prompts.js, the output schema of
// js/schemas.js and the presets of js/config.js) with the stand-in issues of Tidewell Lines, the fictional
// carrier of scenario S1, then checks the answer as a live run will: the schema validator, the guards of
// brief §6.7 and the fact audit, and ranks the ideas with the engine.
//
// Victor runs it from the browser console of the live site (TECH_NOTES.md, "The Ideator probe"); the page
// never imports it. The key comes in as an argument and goes only to api.anthropic.com, through the
// shared client; it is in no result, row or log. What the model wrote stays in this tab's memory, in
// globalThis.piProbe, until the tab closes, so that Victor can copy it with copy(piProbe).
//
// Tidewell Lines and its figures are fictional and illustrative. What the issues say about the world (the
// emissions trading system, FuelEU Maritime, the sea routes, the freight index, the counting method for
// transport emissions) was checked at source on 23 November 2026 (PLAN.md §5.2). English only: a German
// run gets the same English issues and shows whether the Ideator still writes in German.

import { PRESETS, AGENT_TOKENS, MODELS, FX_USD_EUR } from "./config.js";
import { ideasSchema } from "./schemas.js";
import { ideatorPrompt, ideatorInput } from "./prompts.js";
import { ideaProblems } from "./guards.js";
import { validate, describeErrors } from "./schema.js";
import { factValues, rankIdeas, stability, DEFAULT_WEIGHTS } from "./engine.js";
import { renderFacts } from "./facts.js";
import { fmtScore } from "./format.js";
import { streamMessage, withRetry } from "./anthropic.js";
import { usageCostUsd } from "./cost.js";
import { kpisFor, kpiById } from "../data/kpis.js";

/** A KPI of the shared library by its id, as a challenger's file names it; or one the library lacks. */
const lib = (id) => { const k = kpiById(id); return { id: k.id, name: k.name.en, unit: k.unit }; };
const kpi = (id, name, unit) => ({ id, name, unit });
const issue = (id, title, area, description, eur, basis, kpis, response, extra = {}) => ({
  id, title, area, description,
  money_as_stated: null,
  eur_year_low: eur ? eur[0] : null, eur_year_high: eur ? eur[1] : null, eur_year_expected: eur ? eur[2] : null,
  eur_basis: eur ? basis : null, estimate: false, kpis, sources: [], confidence: "medium",
  status: "kept", merged_into: null, park_reason: null,
  response: response ? { title: response } : null,
  from: { kind: "handoff", tool: { bmc: "Business Model Canvas Challenger", swot: "SWOT Challenger", pestel: "PESTEL Challenger" }[id.split("-")[0]] },
  ...extra
});

/** Scenario S1's stand-in issues, as the three challengers' files give them after the emissions merge. */
export const S1 = Object.freeze({
  company: { name: "Tidewell Lines", sector: "transport_logistics", country: "DE", description: "Container carrier based in Bremen, with about 40 ships on Europe–Asia, transatlantic and feeder services", fictional: true },
  issues: [
    issue("bmc-I1", "Emission allowances raise the cost of every European call", "Cost structure, Revenue streams",
      "Since 2024, voyages to and from EU ports need emission allowances: for all emissions between EU ports and half of those on voyages into or out of the EU. Carriers surrendered allowances for 40 % of 2024's emissions and 70 % of 2025's, and must surrender them for all emissions from 2026 on, methane and nitrous oxide included. Tidewell's emissions surcharge covers only part of the cost.",
      [2000000, 6000000, 2800000], "Containers on Europe services times the uncovered allowance cost per container",
      [lib("transport_logistics.ets_cost_per_teu"), lib("transport_logistics.cost_per_teu")],
      "Charge the full allowance cost through a published surcharge"),
    issue("swot-I1", "Emissions trading costs press on margins", "Threats",
      "The EU emissions trading system covers shipping, and the share of emissions carriers pay for rises every year until 2026.",
      [1500000, 4000000, 2400000], "Allowance price times the fleet's emissions on EU voyages", [lib("transport_logistics.cost_per_teu")], null,
      { status: "merged", merged_into: "bmc-I1" }),
    issue("pestel-I1", "Emissions trading for shipping reaches full coverage", "Legal, Environmental",
      "From the emissions of 2026 on, carriers surrender allowances for all of them, methane and nitrous oxide included.",
      [2000000, 5000000, 3100000], "Allowance price times the fleet's emissions on EU voyages, at full coverage", [lib("transport_logistics.ets_cost_per_teu")], null,
      { status: "merged", merged_into: "bmc-I1" }),
    issue("pestel-I2", "FuelEU Maritime fines loom for the older ships", "Legal, Environmental",
      "Since January 2025, FuelEU Maritime caps the greenhouse-gas intensity of the energy used on board: 2 % below 91.16 g CO2e per MJ from 2025, 6 % below from 2030 and 14.5 % below from 2035. A ship above the limit pays a penalty unless it pools with cleaner ships. A third of Tidewell's fleet burns heavy fuel oil.",
      [400000, 1800000, 900000], "Penalty for the energy above the limit, for the ships above it",
      [lib("transport_logistics.co2_per_teu_km"), lib("transport_logistics.fuel_cost_per_teu")],
      "Pool the older ships with the dual-fuel newbuilds"),
    issue("swot-I2", "Closed sea routes stretch the Asia loops", "Threats",
      "The war with Iran from late February 2026 shut or limited the Strait of Hormuz and cut Tidewell's Gulf calls; war-risk cover was withdrawn or repriced, and attacks on ships are still reported in November 2026. Carriers have been returning to the Red Sea since September 2026, and a full return through Suez is expected by the first quarter of 2027. Until then, Tidewell's Asia loops sail round the Cape of Good Hope, with more fuel and more ships per weekly service.",
      [3000000, 9000000, 4500000], "Extra fuel and charter cost per rerouted loop, times loops a year",
      [lib("transport_logistics.schedule_reliability"), lib("transport_logistics.fuel_cost_per_teu")],
      "Plan each loop's route every week from the security picture"),
    issue("bmc-I2", "Freight rates swing faster than contracts reprice", "Revenue streams",
      "Drewry's World Container Index stood at $1,859 per 40 ft container on 13 November 2025, $2,557 on 8 January 2026 and $4,176 on 19 November 2026, its fourth weekly fall. Most of Tidewell's contract rates reprice once a quarter, so its margins swing with the spot market.",
      [2500000, 8000000, 3800000], "Contract volume times the gap between spot and contract rates over a quarter",
      [lib("transport_logistics.average_freight_rate"), lib("transport_logistics.vessel_utilisation")],
      "Link part of the contract rates to a published index"),
    issue("swot-I3", "Digital forwarders win small shippers' bookings", "Threats, Channels",
      "Digital forwarders give small and mid-sized shippers instant online quotes and bookings. Tidewell answers spot booking requests by e-mail, within a working day on average.",
      [800000, 2500000, 1200000], "Small shippers' volume lost a year, times the margin per container",
      [lib("transport_logistics.online_booking_share"), kpi(null, "Booking response time", "h")],
      "Quote spot bookings online within minutes"),
    issue("bmc-I3", "Shippers ask for emissions per container", "Value propositions, Customer relationships",
      "CountEmissionsEU sets one method for counting transport emissions, based on EN ISO 14083: the Council agreed its position on 26 February 2026 and Parliament adopted it in April 2026. Shippers who report their transport emissions now ask carriers for figures per shipment. Tidewell sends yearly fleet averages.",
      [500000, 3000000, 1500000], "Tender volume at risk, times the margin per container",
      [lib("transport_logistics.co2_per_teu_km")],
      "Send an emissions statement with every bill of lading"),
    issue("swot-I4", "Empty containers pile up after the rate peak", "Weaknesses",
      "As volumes fell after the summer peak, empty containers piled up in North European depots while Asian ports ran short. Tidewell's planners reposition empties week by week, by judgement.",
      [1000000, 3500000, 1800000], "Empty moves a year, times the cost per move",
      [lib("transport_logistics.empty_repositioning_cost")],
      "Reposition empties from a daily forecast"),
    issue("pestel-I3", "Customers dispute the new surcharge invoices", "Customer relationships",
      "Since the emissions surcharge started, customers dispute more invoices, and each dispute holds up payment until someone in finance explains the surcharge line.",
      null, null,
      [kpi(null, "Disputed invoices", "%")],
      "Explain each surcharge line on the invoice")
  ]
});

/**
 * The line Victor pastes into the browser console on the live site. It asks for the key in a dialog, so
 * the key is never typed into the console, then runs the three settings (under €0.15 at the verified
 * prices) and prints two tables. tests/page.mjs runs this exact line against a stand-in.
 */
export const SNIPPET = '(async()=>{const m=await import(new URL("js/probe.js",document.baseURI));const r=await m.run(prompt("Claude API key, kept in this tab only"),["fast","balanced","thorough"]);console.table(r.runs);console.table(r.ideas)})()';

/** The preset of js/config.js with this id. */
export function presetById(id) {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`No preset "${id}". Use ${PRESETS.map((x) => `"${x.id}"`).join(", ")}.`);
  return p;
}

/** What the probe sends and checks against: S1's facts, the Ideator's input and the evidence for the audit. */
export function probeState({ lang = "en", count = 8 } = {}) {
  const kpis = kpisFor(S1.company.sector);
  const facts = factValues({ issues: S1.issues, lang });
  const input = ideatorInput({ company: S1.company, issues: S1.issues, count, kpis, facts, lang });
  const citable = JSON.parse(input).facts;
  const evidence = {
    titles: S1.issues.map((i) => i.title),
    texts: [S1.company.description, ...S1.issues.flatMap((i) => [i.description, i.eur_basis || "", i.response?.title || "", ...i.kpis.flatMap((k) => [k.name, k.unit])]), ...kpis.flatMap((k) => [k.name[lang] || k.name.en, k.unit])],
    urls: []
  };
  return { facts, citable, input, evidence };
}

/** The Ideator's request as a live run sends it, without the key (that goes in a header). */
export function ideatorRequest({ preset = "balanced", lang = "en", count = 8, maxTokens = null } = {}) {
  const p = presetById(preset);
  return {
    model: p.model,
    max_tokens: maxTokens || AGENT_TOKENS.ideator.max,
    ...(p.thinking ? { thinking: p.thinking } : {}),
    output_config: { effort: p.effort, format: { type: "json_schema", schema: ideasSchema(count) } },
    system: ideatorPrompt({ lang, count }),
    messages: [{ role: "user", content: [{ type: "text", text: probeState({ lang, count }).input }] }]
  };
}

/** The answer's JSON from the assistant message's text blocks, or the reason it can't be read. */
export function answerOf(message) {
  const text = (message?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  if (!text.trim()) return { answer: null, error: "no text in the answer" };
  try { return { answer: JSON.parse(text), error: null }; } catch (e) { return { answer: null, error: `not JSON (${e.message})` }; }
}

/**
 * Checks one answer as a live run will and ranks its ideas with the engine. Returns the summary row, the
 * idea rows and the full record kept in memory.
 */
export function checkAnswer({ preset, message, ms = null, lang = "en", count = 8, body }) {
  const p = presetById(preset);
  const { facts, citable, evidence } = probeState({ lang, count });
  const usage = message?.usage || {};
  const usd = usageCostUsd(p.model, usage);
  const { answer, error } = answerOf(message);
  const schemaErrors = answer ? validate(answer, ideasSchema(count)).errors : [];
  const found = answer && !schemaErrors.length ? ideaProblems(answer, { count, issues: S1.issues, facts: citable, evidence }) : { refusals: [], audit: [], notes: [] };
  const ideas = answer && !schemaErrors.length ? answer.ideas.map((x, i) => ({ id: `P${i + 1}`, ...x })) : [];
  const ranked = ideas.length ? rankIdeas(ideas, DEFAULT_WEIGHTS, { lang }) : [];
  const st = ideas.length ? stability(ideas, DEFAULT_WEIGHTS, { lang }) : null;
  const shown = (s) => renderFacts(s, facts, lang);
  const model = MODELS.find((m) => m.id === p.model);
  const row = {
    setting: p.id,
    model: model ? model.label : p.model,
    effort: p.effort,
    thinking: p.thinking ? p.thinking.type : "adaptive",
    seconds: ms === null ? null : Math.round(ms / 100) / 10,
    stop: message?.stop_reason || null,
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    cost_eur: Math.round(usd * FX_USD_EUR * 10000) / 10000,
    ideas: ideas.length,
    asked: count,
    readable: error ? `no: ${error}` : schemaErrors.length ? `no: ${schemaErrors.length} schema errors` : "yes",
    refusals: found.refusals.length,
    audit: found.audit.length,
    notes: found.notes.length,
    issues_covered: ideas.length ? `${new Set(ideas.flatMap((i) => i.issues)).size} of ${S1.issues.filter((i) => i.status === "kept").length}` : null,
    top: ranked[0] ? `${ranked[0].name} ${fmtScore(ranked[0].value, "en")}` : null
  };
  const ideaRows = ranked.map((r) => {
    const idea = ideas.find((i) => i.id === r.id);
    return {
      setting: p.id,
      rank: r.rank,
      score: fmtScore(r.value, "en"),
      firsts: st ? `${st.counts[r.id].firsts} of ${st.of}` : null,
      name: idea.name,
      issues: idea.issues.join(" "),
      what_it_does: shown(idea.what_it_does),
      key_figures: idea.key_figures.map((f) => `${f.name}: ${f.public ? `${f.today} (${f.source})` : "not public"}`).join("; "),
      effort_days: `${idea.effort_days.low} to ${idea.effort_days.high}`,
      live_calls: idea.live_inputs.model_calls,
      ratings: Object.values(idea.ratings).map((x) => x.score).join(" ")
    };
  });
  const record = {
    setting: p.id, request: body || null, stop_reason: message?.stop_reason || null, usage, cost_usd: usd, ms,
    answer, read_error: error, schema_errors: schemaErrors.length ? describeErrors(schemaErrors).split("\n") : [],
    refusals: found.refusals, audit: found.audit, notes: found.notes,
    ranking: ranked.map((r) => ({ id: r.id, name: r.name, score: r.value, rank: r.rank })),
    stability: st ? { of: st.of, counts: st.counts } : null
  };
  return { row, ideaRows, record };
}

/**
 * Runs the probe: presets is one preset id or a list ("fast", "balanced", "thorough"); count the number of
 * ideas asked for (S1 asks for eight); maxTokens is high on purpose, so the probe measures what the
 * Ideator needs instead of cutting it off. Returns { runs, ideas } for console.table and keeps the full
 * record in globalThis.piProbe. The key is in neither.
 */
export async function run(key, presets = "balanced", { count = 8, lang = "en", maxTokens = 16000, signal, now = () => performance.now() } = {}) {
  if (typeof key !== "string" || !key.trim()) throw new Error("No key given: the probe needs a Claude API key.");
  const ids = Array.isArray(presets) ? presets : [presets];
  const runs = [];
  const ideas = [];
  const records = [];
  for (const preset of ids) {
    const body = ideatorRequest({ preset, lang, count, maxTokens });
    const started = now();
    try {
      const { message } = await withRetry(() => streamMessage({ key: key.trim(), body, signal }), { signal });
      const r = checkAnswer({ preset, message, ms: now() - started, lang, count, body });
      runs.push(r.row);
      ideas.push(...r.ideaRows);
      records.push(r.record);
    } catch (e) {
      const status = e && typeof e.status === "number" ? e.status : null;
      runs.push({ setting: preset, readable: `no: ${status ? `HTTP ${status} ` : ""}${e && e.type ? `${e.type}: ` : ""}${String((e && e.message) || e).slice(0, 160)}` });
      records.push({ setting: preset, request: body, error: { status, type: (e && e.type) || null, message: String((e && e.message) || e) } });
    }
  }
  const result = { runs, ideas };
  globalThis.piProbe = { probe: "prototype-ideator ideator probe", lang, count, runs: records };
  return result;
}
