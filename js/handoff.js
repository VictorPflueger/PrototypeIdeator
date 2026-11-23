// A challenger's handoff file (strategy-challenge/1, brief §4.3) becomes issues without a model call
// (brief §6.2): each keeps its title, description, areas, KPIs, euro range and expected euros, evidence and
// its chosen response. The file is checked against schemas/strategy-challenge-1.json first, the same
// schema in all four tools, and refused with its problems when it breaks it. Several files must be about
// one company; issues from more than one challenger ask for the Reader's short merge proposal on the
// titles, which is the only request reading handoff files can lead to.

import { validate, describeErrors } from "./schema.js";
import SCHEMA from "../schemas/strategy-challenge-1.js";

export const HANDOFF_SCHEMA = "strategy-challenge/1";

/** True for a parsed JSON file that says it is a handoff file of this version. */
export function isHandoff(json) {
  return !!json && typeof json === "object" && !Array.isArray(json) && json.schema === HANDOFF_SCHEMA;
}

/** The file against the shared schema: { valid, errors }. */
export function validateHandoff(json) {
  return validate(json, SCHEMA, SCHEMA.$defs);
}

/** What the schema can't say: unique issue ids, and every response names an issue of the file. */
function referenceProblems(json) {
  const out = [];
  const ids = json.issues.map((i) => i.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) out.push(`issue ids appear twice: ${[...new Set(dupes)].join(", ")}`);
  for (const r of json.responses) if (!ids.includes(r.issue)) out.push(`response ${r.id} names issue ${r.issue}, which the file doesn't have`);
  return out;
}

/**
 * One handoff file as issues. Returns { ok, problems, reason, tool, company, issues } where reason is
 * "not-handoff", "version" or "invalid" when ok is false. `file` is the file's name, kept as the source.
 */
export function readHandoff(json, { file = null } = {}) {
  const fail = (reason, problems) => ({ ok: false, reason, problems, tool: null, company: null, issues: [] });
  if (!json || typeof json !== "object" || typeof json.schema !== "string" || !json.schema.startsWith("strategy-challenge/")) {
    return fail("not-handoff", ['not a handoff file: it has no "schema": "strategy-challenge/1"']);
  }
  if (json.schema !== HANDOFF_SCHEMA) return fail("version", [`the file is ${json.schema}; this version reads ${HANDOFF_SCHEMA}`]);
  const v = validateHandoff(json);
  if (!v.valid) return fail("invalid", describeErrors(v.errors).split("\n"));
  const refs = referenceProblems(json);
  if (refs.length) return fail("invalid", refs);

  const type = json.framework.type;
  const tool = { id: json.tool.id, name: json.tool.name, version: json.tool.version, url: json.tool.url, type };
  const labels = new Map(json.framework.areas.map((a) => [a.id, a.label]));
  const issues = json.issues.map((i) => {
    const chosen = json.responses.find((r) => r.issue === i.id && r.chosen) || null;
    return {
      id: `${type}-${i.id}`,
      title: i.title,
      description: i.description,
      type: i.type,
      area: i.areas.map((a) => labels.get(a) || a).join(", "),
      areas: [...i.areas],
      kpis: i.kpis.map((k) => ({ id: k.id, name: k.name, unit: k.unit, today: null, direction: k.direction, change_low: k.change_low, change_high: k.change_high, basis: k.basis })),
      money_as_stated: null,
      eur_year_low: i.eur_year_low,
      eur_year_high: i.eur_year_high,
      eur_year_expected: i.eur_year_expected,
      eur_basis: i.eur_basis,
      estimate: false,
      impact: i.impact,
      likelihood: i.likelihood,
      band: i.band,
      horizon: i.horizon,
      evidence: i.evidence.map((e) => ({ url: e.url, title: e.title, read_on: e.read_on })),
      confidence: i.confidence,
      response: chosen ? { id: chosen.id, title: chosen.title, kind: chosen.kind, chosen: true, first_step: chosen.first_step, owner: chosen.owner, effort: chosen.effort, time_to_impact: chosen.time_to_impact } : null,
      quotes: [],
      source: { kind: "handoff", file, issue: i.id, tool },
      status: "kept",
      merged_into: null,
      park_reason: null
    };
  });
  return { ok: true, reason: null, problems: [], tool, company: { ...json.company }, issues, language: json.language, mode: json.mode, created: json.created };
}

const sameCompany = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Several handoff files read together: [{ json, file }]. Refused when one is refused, when they are about
 * different companies, or when two come from the same challenger. needsMergeProposal is true when the
 * issues come from more than one challenger.
 */
export function readHandoffs(entries) {
  const read = entries.map((e) => ({ file: e.file, r: readHandoff(e.json, { file: e.file }) }));
  const problems = read.filter((x) => !x.r.ok).flatMap((x) => x.r.problems.map((p) => `${x.file}: ${p}`));
  if (problems.length) return { ok: false, problems, company: null, tools: [], issues: [], needsMergeProposal: false };
  const company = read[0]?.r.company || null;
  const other = read.find((x) => !sameCompany(x.r.company.name, company.name));
  if (other) return { ok: false, problems: [`${other.file} is about ${other.r.company.name}, the other files about ${company.name}`], company: null, tools: [], issues: [], needsMergeProposal: false };
  const types = read.map((x) => x.r.tool.type);
  const twice = types.find((t, i) => types.indexOf(t) !== i);
  if (twice) return { ok: false, problems: [`two reports from the same challenger (${read.find((x) => x.r.tool.type === twice).r.tool.name}); keep one`], company: null, tools: [], issues: [], needsMergeProposal: false };
  return {
    ok: true,
    problems: [],
    company,
    tools: read.map((x) => x.r.tool),
    issues: read.flatMap((x) => x.r.issues),
    needsMergeProposal: new Set(types).size > 1
  };
}
