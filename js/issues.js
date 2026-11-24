// The issue map between reading and ideating (brief §6.2): the Reader's answer as issues, its merge
// proposals with the session's ids, and the person's decisions to keep, merge or park. Handoff files
// become issues in js/handoff.js without a request; a document's issues come from the Reader and get the
// prefix "doc-", so they can't clash with a challenger's "bmc-I1". Pure: no DOM, no clock.

import { normalise } from "./facts.js";

/** The prefix of an issue the Reader found in a document. */
export const DOC_PREFIX = "doc-";

/**
 * A quote checked against its file's text: word for word for text files, "not-checked" for a PDF, whose
 * text code doesn't read (D9). content(file) gives a text file's content, or null when there is none.
 */
export function checkQuote(quote, { file, content = () => null, kind = () => "text" } = {}) {
  if (kind(file) === "pdf") return "not-checked";
  const text = content(file);
  if (typeof text !== "string") return "not-checked";
  return normalise(text).includes(normalise(quote)) ? "word-for-word" : "failed";
}

/**
 * The Reader's answer (js/schemas.js readerSchema) as issues. Its own ids I1, I2… become doc-I1, doc-I2…;
 * its euros are an AI estimate with their basis; each source becomes a quote with its check.
 * files: { kind(name), content(name) } of the run's documents.
 */
export function issuesFromReader(answer, files = {}) {
  const list = Array.isArray(answer?.issues) ? answer.issues : [];
  return list.map((i) => {
    const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const expected = num(i.eur_year_expected);
    const sources = Array.isArray(i.sources) ? i.sources : [];
    return {
      id: `${DOC_PREFIX}${i.id}`,
      title: i.title,
      description: i.description || "",
      area: i.area || "",
      type: "document",
      areas: [],
      kpis: (i.kpis || []).map((k) => ({ id: k.library_id || null, name: k.name, unit: k.unit || null, today: k.today || null, direction: null, change_low: null, change_high: null, basis: null })),
      money_as_stated: i.money_as_stated || null,
      eur_year_low: num(i.eur_year_low),
      eur_year_high: num(i.eur_year_high),
      eur_year_expected: expected,
      eur_basis: i.eur_basis || null,
      estimate: expected !== null,
      quotes: sources.map((s) => ({ file: s.file, where: s.where, text: s.quote, checked: checkQuote(s.quote, { file: s.file, ...files }) })),
      evidence: [],
      confidence: i.confidence || "medium",
      response: null,
      source: { kind: "document", file: sources[0]?.file || null, issue: i.id, tool: null },
      status: "kept",
      merged_into: null,
      park_reason: null
    };
  });
}

/** A Reader-local id (I3) as the session's id (doc-I3); a handoff issue's id stays as it is. */
export function sessionId(id, readerIds) {
  return readerIds && readerIds.has(id) ? `${DOC_PREFIX}${id}` : id;
}

/**
 * The merges the Reader proposed, with the session's ids, keeping only those whose issues exist. An
 * issue proposed for two merges stays in the first.
 */
export function mergeProposals(merges, issues, readerIds = new Set()) {
  const ids = new Set(issues.map((i) => i.id));
  const taken = new Set();
  const out = [];
  for (const m of Array.isArray(merges) ? merges : []) {
    const keep = sessionId(m.keep, readerIds);
    if (!ids.has(keep) || taken.has(keep)) continue;
    const merged = (m.merged || []).map((id) => sessionId(id, readerIds)).filter((id) => ids.has(id) && id !== keep && !taken.has(id));
    if (!merged.length) continue;
    taken.add(keep);
    for (const id of merged) taken.add(id);
    out.push({ keep, merged, why: m.why || "" });
  }
  return out;
}

/** The decisions that accept every proposed merge: each merged issue goes into the one kept. */
export function acceptProposals(proposals) {
  return proposals.flatMap((m) => m.merged.map((id) => ({ id, action: "merge", into: m.keep, reason: null })));
}

/**
 * The issues with the person's decisions applied: [{ id, action: keep|merge|park, into, reason }]. An
 * issue no decision names is kept. A merge counts only into an issue that is itself kept, so a chain
 * never forms; a broken one leaves the issue kept.
 */
export function applyDecisions(issues, decisions = []) {
  const byId = new Map((decisions || []).map((d) => [d.id, d]));
  const actionOf = (id) => byId.get(id)?.action || "keep";
  return issues.map((i) => {
    const d = byId.get(i.id);
    const base = { ...i, status: "kept", merged_into: null, park_reason: null };
    if (!d || d.action === "keep") return base;
    if (d.action === "park") return { ...base, status: "parked", park_reason: d.reason || null };
    if (d.action === "merge" && d.into && d.into !== i.id && issues.some((x) => x.id === d.into) && actionOf(d.into) === "keep") {
      return { ...base, status: "merged", merged_into: d.into };
    }
    return base;
  });
}

/** True when an issue shows the action just chosen for it: kept, merged or parked. */
export function choiceTook(issue, action) {
  const want = { keep: "kept", merge: "merged", park: "parked" }[action];
  return !!issue && !!want && issue.status === want;
}

/** The decisions after one change: id's action set, and any issue merged into it freed when it leaves. */
export function decide(decisions, id, action, { into = null, reason = null } = {}) {
  let out = (decisions || []).filter((d) => d.id !== id);
  if (action !== "keep") {
    // An issue that stops being kept takes its merged members with it: they are kept again.
    out = out.filter((d) => !(d.action === "merge" && d.into === id));
    out.push({ id, action, into: action === "merge" ? into : null, reason: action === "park" ? reason : null });
  }
  return out;
}
