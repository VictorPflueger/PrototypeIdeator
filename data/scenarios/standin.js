// Helpers for writing a scenario (brief §7): texts in both languages side by side, and stand-in handoff
// files built the way a challenger exports them (brief §4.3), with the bands and expected euros of the
// shared js/risk.js, so a stand-in carries the same figures the challenger's own export will. A stand-in
// is replaced by the challenger's export once that ships; tools/check-scenarios.mjs fails a stand-in whose
// challenger has published its own scenario file beside this repository.

import { expected, band, atStake, left, upside, money } from "../../js/risk.js";
import { kpiById } from "../kpis.js";

/** A text in both languages. */
export const L = (en, de) => ({ en, de });

const isPair = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 2 && "en" in v && "de" in v;

/** A value with every L() pair resolved to one language. */
export function inLang(value, lang) {
  if (isPair(value)) return value[lang];
  if (Array.isArray(value)) return value.map((v) => inLang(v, lang));
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inLang(v, lang)]));
  return value;
}

/** The labels the challengers give their areas, in both languages. */
export const AREAS = {
  bmc: {
    partners: L("Key partners", "Schlüsselpartner"), activities: L("Key activities", "Schlüsselaktivitäten"), resources: L("Key resources", "Schlüsselressourcen"),
    value: L("Value propositions", "Wertangebote"), relationships: L("Customer relationships", "Kundenbeziehungen"), channels: L("Channels", "Kanäle"),
    segments: L("Customer segments", "Kundensegmente"), costs: L("Cost structure", "Kostenstruktur"), revenue: L("Revenue streams", "Einnahmequellen")
  },
  swot: { strengths: L("Strengths", "Stärken"), weaknesses: L("Weaknesses", "Schwächen"), opportunities: L("Opportunities", "Chancen"), threats: L("Threats", "Risiken") },
  pestel: {
    political: L("Political", "Politisch"), economic: L("Economic", "Ökonomisch"), social: L("Social", "Gesellschaftlich"),
    technological: L("Technological", "Technologisch"), environmental: L("Environmental", "Ökologisch"), legal: L("Legal", "Rechtlich")
  }
};

/** The three challengers as their files name them. */
export const TOOLS = {
  bmc: { id: "bmc-challenger", name: "Business Model Canvas Challenger", version: "0.2.0", url: "https://victorpflueger.github.io/BMC-challenger/" },
  swot: { id: "swot-challenger", name: "SWOT Challenger", version: "0.2.0", url: "https://victorpflueger.github.io/SWOT-challenger/" },
  pestel: { id: "pestel-challenger", name: "PESTEL Challenger", version: "0.2.0", url: "https://victorpflueger.github.io/PESTEL-challenger/" }
};

/** An effect on a KPI of the shared library, named as the library names it. */
export function kpi(id, direction, low, high, basis) {
  const k = kpiById(id);
  if (!k) throw new Error(`no KPI ${id} in data/kpis.js`);
  return { id, name: L(k.name.en, k.name.de), unit: k.unit, direction, change_low: low, change_high: high, basis };
}

/** A source of a fact, from the scenario's fact list (DATA_SOURCES.md). */
export function source(fact) {
  return { url: fact.url, title: fact.title, read_on: fact.read_on };
}

const DISCLAIMER = L(
  "AI-generated analysis for discussion. Figures are estimates. Built from information the user confirmed to be public. Stand-in written for the Prototype Ideator's scenario until the challenger's own export ships.",
  "KI-erstellte Analyse zur Diskussion. Zahlen sind Schätzungen. Erstellt aus Informationen, die der Nutzer als öffentlich bestätigt hat. Platzhalter für das Szenario des Prototype Ideator, bis der Challenger seinen eigenen Export liefert."
);

/**
 * A stand-in handoff file in one language. spec: tool (key of TOOLS), created, company, framework items by
 * area, issues (impact, likelihood, eur: [low, high] or null) and responses (residual and upside as
 * [low, high, likelihood] or null), the score and pressure, and summary(figures, lang).
 */
export function standin(spec, lang) {
  const type = spec.tool;
  const issues = spec.issues.map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    description: i.description,
    areas: i.areas,
    items: i.items,
    impact: i.impact,
    likelihood: i.likelihood,
    band: band(i.impact, i.likelihood),
    horizon: i.horizon,
    kpis: i.kpis,
    eur_year_low: i.eur ? i.eur[0] : null,
    eur_year_high: i.eur ? i.eur[1] : null,
    eur_year_expected: i.eur ? expected(i.eur[0], i.eur[1], i.likelihood) : null,
    eur_basis: i.basis,
    evidence: i.evidence || [],
    confidence: i.confidence
  }));
  const range = (r, impact) => (r ? { impact, likelihood: r[2], band: band(impact, r[2]), eur_year_low: r[0], eur_year_high: r[1], eur_year_expected: expected(r[0], r[1], r[2]) } : null);
  const responses = spec.responses.map((r) => {
    const issue = spec.issues.find((i) => i.id === r.issue);
    const residual = range(r.residual, issue.impact);
    const up = r.upside ? { eur_year_low: r.upside[0], eur_year_high: r.upside[1], likelihood: r.upside[2], eur_year_expected: expected(r.upside[0], r.upside[1], r.upside[2]) } : null;
    return { id: r.id, issue: r.issue, kind: r.kind, chosen: r.chosen, title: r.title, first_step: r.first_step, owner: r.owner, changes: r.changes || [], residual, upside: up, effort: r.effort, time_to_impact: r.time_to_impact };
  });
  const figures = {
    at_stake_eur_year: atStake(issues).value,
    left_eur_year: left(issues, responses),
    upside_eur_year: upside(responses),
    score: spec.score,
    pressure: spec.pressure
  };
  const areas = Object.entries(spec.items).map(([id, items]) => ({ id, label: AREAS[type][id], items }));
  const sources = [];
  for (const i of issues) for (const e of i.evidence) if (!sources.some((s) => s.url === e.url)) sources.push(e);
  const file = {
    schema: "strategy-challenge/1",
    tool: TOOLS[type],
    created: spec.created,
    language: lang,
    mode: "simulation",
    model: null,
    company: spec.company,
    framework: { type, areas },
    issues,
    responses,
    figures,
    summary: spec.summary(figures, lang, (v) => money(v, lang)),
    sources,
    disclaimer: DISCLAIMER
  };
  return inLang(file, lang);
}

/** A framework item. */
export const item = (id, text, extra = {}) => ({ id, text, source: "user", ...extra });
/** A framework item the challenger's AI suggested. */
export const aiItem = (id, text, basis, confidence = "medium") => ({ id, text, source: "ai", confidence, basis });
