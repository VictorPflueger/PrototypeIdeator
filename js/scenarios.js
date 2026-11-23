// The three scenarios as the page and the checker read them (brief §7, the Scenario contract of
// js/schemas.js). Each is authored once in data/scenarios/, with its texts in both languages side by side;
// resolving it gives one recorded run per language, and builds each stand-in handoff file in both
// languages exactly as a challenger exports it, so the Read step reads it through js/handoff.js like any
// file a person drops in. Nothing here changes during a session.

import { standin, inLang } from "../data/scenarios/standin.js";
import s1 from "../data/scenarios/s1.js";
import s2 from "../data/scenarios/s2.js";
import s3 from "../data/scenarios/s3.js";

export const LANGS = Object.freeze(["en", "de"]);

/** A file's size in bytes as a challenger writes it: JSON with two spaces of indent, in UTF-8. */
export const bytesOfJson = (obj) => new TextEncoder().encode(JSON.stringify(obj, null, 2)).length;

const both = (fn) => Object.fromEntries(LANGS.map((l) => [l, fn(l)]));

/** An authored scenario as the Scenario contract: documents with their files, answers per language. */
export function resolveScenario(a) {
  const files = {};
  const documents = a.documents.map((d) => {
    if (d.kind === "handoff") {
      files[d.id] = both((l) => standin(d.spec, l));
      return { id: d.id, kind: d.kind, tool: d.tool, name: both((l) => inLang(d.name, l)), href: null, stand_in: d.stand_in, fictional: d.fictional, bytes: both((l) => bytesOfJson(files[d.id][l])), pages: null };
    }
    return { id: d.id, kind: d.kind, tool: null, name: both((l) => inLang(d.name, l)), href: both((l) => inLang(d.href, l)), stand_in: d.stand_in, fictional: d.fictional, bytes: both((l) => inLang(d.bytes, l)), pages: both((l) => inLang(d.pages, l)) };
  });
  return {
    schema: a.schema,
    id: a.id,
    source: a.source,
    as_of: a.as_of,
    company: { ...a.company },
    pitch: both((l) => inLang(a.pitch, l)),
    count: a.count,
    focus: both((l) => inLang(a.focus, l)),
    documents,
    files,
    facts: a.facts.map((f) => ({ id: f.id, url: f.url, title: both((l) => inLang(f.title, l)), read_on: f.read_on })),
    answers: both((l) => inLang(a.answers, l)),
    choices: JSON.parse(JSON.stringify(a.choices)),
    reference: a.reference ? JSON.parse(JSON.stringify(a.reference)) : null
  };
}

/** The authored scenarios, in their order on the Start step. */
export const AUTHORED = Object.freeze([s1, s2, s3]);

let resolved = null;
/** The resolved scenarios, built once on first use. */
export function scenarios() {
  if (!resolved) resolved = AUTHORED.map(resolveScenario);
  return resolved;
}

/** A scenario by its id (s1, s2, s3), or null. */
export function scenarioById(id) {
  return scenarios().find((s) => s.id === String(id || "").toLowerCase()) || null;
}

/** Days from the scenario's as-of date to a day (ISO); "Check for updates" shows after 90. */
export function ageInDays(asOf, today) {
  const a = Date.parse(`${asOf}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.floor((b - a) / 86400000) : 0;
}
export const STALE_AFTER_DAYS = 90;
