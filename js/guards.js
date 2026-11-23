// Checks a schema can't express (brief §6.7, PLAN.md §8.2 and §8.3), run on every agent's answer after the
// schema validator. Three kinds of finding:
//   refusals  the answer goes back once with them listed; if the repair fails too, the run stops there;
//   audit     prose that fails the fact audit (js/facts.js): it goes back with its tokens, and a text
//             refused twice shows with an "Unchecked" tag instead of stopping the run;
//   notes     reported, never sent back: the writing rules a model sometimes slips on (a dash, a stock
//             word) and the spread rule, until Victor's live runs show how often they happen.
// 0.1.0 holds the Ideator's checks, which the probe uses; the Reader's and the Brief writer's follow in 0.3.0.

import { CRITERIA } from "./engine.js";
import { LIMITS } from "./config.js";
import { auditText, normalise } from "./facts.js";
import { STOCK_WORDS } from "./prompts.js";

const words = (s) => normalise(s).split(" ").filter(Boolean).length;
const filled = (s) => typeof s === "string" && normalise(s) !== "";
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STOCK = new RegExp(`(?<![\\p{L}])(${STOCK_WORDS.map((w) => esc(w).replace(/'/g, "['’]")).join("|")})(?![\\p{L}])`, "iu");
// Vici's rule: no em dash as punctuation; an en dash counts when it stands between spaces, not in a
// range such as "Europe–Asia".
const DASH = /\S\s*—\s*\S|\S\s+–\s+\S/u;

/** Every prose field of an idea the model wrote, with its path, for the fact audit and the writing notes. */
export function ideaTexts(idea, n) {
  const at = (p) => `idea ${n} ${p}`;
  const out = [
    [at("name"), idea.name], [at("what_it_does"), idea.what_it_does], [at("audience"), idea.audience], [at("why"), idea.why]
  ];
  (idea.room || []).forEach((s, i) => out.push([at(`room ${i + 1}`), s]));
  for (const k of ["spot", "check", "calculate", "propose", "prepare", "decision"]) out.push([at(`how.${k}`), idea.how?.[k]]);
  (idea.key_figures || []).forEach((f, i) => { out.push([at(`key figure ${i + 1} name`), f.name], [at(`key figure ${i + 1} demo`), f.demo]); });
  (idea.data || []).forEach((s, i) => out.push([at(`data ${i + 1}`), s]));
  (idea.risks || []).forEach((s, i) => out.push([at(`risk ${i + 1}`), s]));
  for (const c of CRITERIA) out.push([at(`rating ${c} reason`), idea.ratings?.[c]?.reason]);
  return out.filter(([, text]) => typeof text === "string");
}

/**
 * The Ideator's answer, checked. answer: { ideas } as the schema returns it; count: the number asked for;
 * issues: the session's issues (only kept ones may be named); facts: the keys the Ideator could cite;
 * evidence: { titles, quotes, texts, urls } for the fact audit. Returns { refusals, audit, notes, ok }.
 */
export function ideaProblems(answer, { count = LIMITS.ideasDefault, issues = [], facts = [], evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const ideas = Array.isArray(answer?.ideas) ? answer.ideas : [];
  const cap = Math.min(count, LIMITS.ideasMax);
  const keptIds = new Set(issues.filter((i) => i.status === "kept").map((i) => i.id));
  const allIds = new Set(issues.map((i) => i.id));

  if (!ideas.length) refusals.push("no ideas");
  if (ideas.length > cap) refusals.push(`${ideas.length} ideas, but at most ${cap} were asked for`);
  else if (ideas.length < cap) notes.push(`${ideas.length} ideas, ${cap} were asked for`);

  const names = new Map();
  ideas.forEach((idea, k) => {
    const n = k + 1;
    const label = `idea ${n} (${filled(idea.name) ? normalise(idea.name) : "no name"})`;
    if (!filled(idea.name)) refusals.push(`idea ${n} has no name`);
    else {
      if (words(idea.name) > 3) refusals.push(`${label}: the name has more than three words`);
      const key = normalise(idea.name).toLowerCase();
      if (names.has(key)) refusals.push(`${label}: the same name as idea ${names.get(key)}`);
      else names.set(key, n);
    }
    if (!filled(idea.what_it_does)) refusals.push(`${label}: what it does is empty`);
    else if (words(idea.what_it_does) > LIMITS.whatItDoesMaxWords) refusals.push(`${label}: what it does has ${words(idea.what_it_does)} words, at most ${LIMITS.whatItDoesMaxWords}`);

    const named = Array.isArray(idea.issues) ? idea.issues : [];
    if (!named.length) refusals.push(`${label}: names no issue`);
    for (const id of named) {
      if (!allIds.has(id)) refusals.push(`${label}: issue "${id}" does not exist`);
      else if (!keptIds.has(id)) refusals.push(`${label}: issue "${id}" is not kept`);
    }

    const room = Array.isArray(idea.room) ? idea.room.filter(filled) : [];
    if (room.length < LIMITS.roomStepsMin || room.length > LIMITS.roomStepsMax) refusals.push(`${label}: ${room.length} steps the room sees, ${LIMITS.roomStepsMin} to ${LIMITS.roomStepsMax} wanted`);
    for (const k of ["spot", "check", "calculate", "propose", "prepare", "decision"]) if (!filled(idea.how?.[k])) refusals.push(`${label}: how it works has no ${k}`);

    const figures = Array.isArray(idea.key_figures) ? idea.key_figures : [];
    if (figures.length < LIMITS.keyFiguresMin || figures.length > LIMITS.keyFiguresMax) refusals.push(`${label}: ${figures.length} key figures, ${LIMITS.keyFiguresMin} or ${LIMITS.keyFiguresMax} wanted`);
    figures.forEach((f, i) => {
      const fl = `${label}, key figure ${i + 1}`;
      if (!filled(f.name)) refusals.push(`${fl}: no name`);
      if (!filled(f.demo)) refusals.push(`${fl}: no demo`);
      if (f.public === true && !(filled(f.today) && filled(f.source))) refusals.push(`${fl}: marked public, but today's value or its source is missing`);
      if (f.public === false && (filled(f.today) || filled(f.source))) refusals.push(`${fl}: marked not public, but it has a value or a source`);
    });

    const risks = Array.isArray(idea.risks) ? idea.risks : [];
    if (risks.length > LIMITS.risksMax) refusals.push(`${label}: ${risks.length} risks, at most ${LIMITS.risksMax}`);
    const e = idea.effort_days || {};
    if (!(Number.isInteger(e.low) && Number.isInteger(e.high) && e.low >= 1 && e.low <= e.high)) refusals.push(`${label}: build effort must be whole person-days, low at least one and not above high`);
    const li = idea.live_inputs || {};
    if (!(Number.isInteger(li.model_calls) && li.model_calls >= 1 && Number.isInteger(li.web_searches) && li.web_searches >= 0)) refusals.push(`${label}: live-run inputs must be at least one model call and no negative number of searches`);

    for (const c of CRITERIA) {
      const r = idea.ratings?.[c];
      if (!r || !Number.isInteger(r.score) || r.score < LIMITS.ratingMin || r.score > LIMITS.ratingMax) refusals.push(`${label}: the ${c} rating must be a whole number from ${LIMITS.ratingMin} to ${LIMITS.ratingMax}`);
      if (!filled(r?.reason)) refusals.push(`${label}: the ${c} rating has no reason`);
    }
    if (!filled(idea.why)) refusals.push(`${label}: why build it is empty`);

    for (const [where, text] of ideaTexts(idea, n)) {
      const a = auditText(text, { facts, evidence });
      if (!a.pass) audit.push({ where, tokens: a.tokens, unknownFacts: a.unknownFacts });
      const dash = text.match(DASH);
      if (dash) notes.push(`${where}: a dash as punctuation ("${dash[0]}")`);
      const stock = text.match(STOCK);
      if (stock) notes.push(`${where}: the stock word "${stock[1]}"`);
    }
  });

  // The spread rule (brief §6.3): every kept issue gets an idea before any gets a second.
  const first = ideas.map((i) => (Array.isArray(i.issues) ? i.issues[0] : null)).filter((id) => keptIds.has(id));
  const twice = [...new Set(first.filter((id, i) => first.indexOf(id) !== i))];
  const without = [...keptIds].filter((id) => !first.includes(id));
  if (twice.length && without.length) notes.push(`spread: ${twice.join(", ")} lead${twice.length === 1 ? "s" : ""} two ideas while ${without.join(", ")} lead${without.length === 1 ? "s" : ""} none`);

  return { refusals, audit, notes, ok: refusals.length === 0 && audit.length === 0 };
}

/** What a repair turn says: the problems found, for the model to fix in one answer. */
export function repairMessage({ refusals = [], audit = [] }) {
  const lines = [...refusals];
  for (const a of audit) {
    if (a.tokens.length) lines.push(`${a.where}: write these without numbers, or cite them as a placeholder from "facts": ${a.tokens.join(", ")}`);
    if (a.unknownFacts.length) lines.push(`${a.where}: these placeholders are not in "facts": ${a.unknownFacts.join(", ")}`);
  }
  return `Your answer broke these rules. Send the whole answer again with them fixed and nothing else changed.\n- ${lines.join("\n- ")}`;
}
