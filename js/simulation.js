// The simulation's run model (brief §7, PLAN.md §6.1): a recorded scenario played through the same code
// a live run uses. The handoff files go through js/handoff.js and the Reader's answer through
// js/issues.js; the person's decisions are applied to the issues; the engine scores, ranks and checks the
// stability of the recorded ideas with the weights in use; the Writer's texts are filled from the engine's
// fact values; the session cost is estimated from the real prompts. Pure: the page and the tests build
// the same run from the same choices, so any choice gives figures, results and texts that agree.

import { readHandoffs } from "./handoff.js";
import { issuesFromReader, mergeProposals, acceptProposals, applyDecisions } from "./issues.js";
import { DEFAULT_WEIGHTS, rankIdeas, stability, stabilitySentence, factValues, atStake, issuesCovered, shortlistShare, weightProblems } from "./engine.js";
import { renderFacts } from "./facts.js";
import { ideatorInput, readerInput, mergesInput, writerInput } from "./prompts.js";
import { estimateRun } from "./estimate.js";
import { DEFAULT_MODEL, LIMITS } from "./config.js";
import { t } from "./i18n/index.js";
import { kpisFor, SECTORS } from "../data/kpis.js";

/** The scenario's documents as the session holds them (the Document contract), in one language. */
export function documentsOf(sc, lang) {
  return sc.documents.map((d) => ({
    id: d.id,
    name: d.name[lang],
    kind: d.kind,
    bytes: d.bytes[lang],
    pages: d.pages ? d.pages[lang] : null,
    stand_in: d.stand_in,
    fictional: d.fictional,
    from: "scenario"
  }));
}

/**
 * The Read step before the person decides: the issues of the handoff files (no request) and of the
 * Reader's answer, the company, and the merges the Reader proposed, with the session's ids.
 */
export function readScenario(sc, lang) {
  const answers = sc.answers[lang];
  const handoffs = sc.documents.filter((d) => d.kind === "handoff").map((d) => ({ json: sc.files[d.id][lang], file: d.name[lang] }));
  let issues = [];
  let company = { name: sc.company.name, sector: sc.company.sector, country: sc.company.country, description: sc.pitch[lang], fictional: true };
  let tools = [];
  if (handoffs.length) {
    const r = readHandoffs(handoffs);
    if (!r.ok) throw new Error(`scenario ${sc.id}: ${r.problems.join("; ")}`);
    issues = r.issues;
    tools = r.tools;
    company = { ...company, ...r.company };
  }
  let readerIds = new Set();
  if (answers.reader) {
    const kind = (name) => sc.documents.find((d) => d.name[lang] === name)?.kind || "text";
    readerIds = new Set(answers.reader.issues.map((i) => i.id));
    issues = [...issuesFromReader(answers.reader, { kind, content: () => null }), ...issues];
  }
  const merges = answers.reader ? answers.reader.merges : answers.merges ? answers.merges.merges : [];
  return { issues, company, tools, proposals: mergeProposals(merges, issues, readerIds) };
}

/** The recorded ideas with their ids, P1 to Pn in the order the Ideator gave them. */
export function ideasOf(sc, lang) {
  const list = sc.answers[lang].ideas?.ideas || [];
  return list.slice(0, LIMITS.ideasMax).map((idea, k) => ({ id: `P${k + 1}`, ...idea }));
}

/** The weights to use: the person's, else the recording's, else the defaults; refused ones fall back. */
export function weightsOf(sc, weights) {
  for (const w of [weights, sc.choices.weights]) if (w && !weightProblems(w).length) return { ...w };
  return { ...DEFAULT_WEIGHTS };
}

/** Everything the evidence of a run lets the fact audit pass: titles, descriptions, KPI names, quotes, sources. */
export function evidenceOf(issues) {
  const titles = [];
  const texts = [];
  const quotes = [];
  const urls = [];
  for (const i of issues) {
    titles.push(i.title);
    texts.push(i.description || "", i.area || "", i.money_as_stated || "", i.eur_basis || "");
    for (const k of i.kpis || []) texts.push(k.name || "", k.today || "");
    for (const q of i.quotes || []) quotes.push(q.text);
    for (const e of i.evidence || []) { urls.push(e.url); titles.push(e.title); }
    if (i.response) texts.push(i.response.title || "");
  }
  return { titles, texts: texts.filter(Boolean), quotes, urls };
}

/**
 * A whole run in one language. state: { decisions (null: accept the Reader's merges), weights,
 * picks (the shortlist in its order, null: the engine's top three), decided (the person pressed Write the
 * report) }. Every step's content is in the result; the presenter shows as much as the run has reached.
 */
export function buildRun(sc, lang, state = {}) {
  const read = readScenario(sc, lang);
  const decisions = state.decisions || sc.choices.issues || acceptProposals(read.proposals);
  const issues = applyDecisions(read.issues, decisions);
  const ideas = ideasOf(sc, lang);
  const weights = weightsOf(sc, state.weights);
  const ranked = rankIdeas(ideas, weights, { lang });
  const st = stability(ideas, weights, { lang });
  const nameOf = (id) => ideas.find((i) => i.id === id)?.name || id;
  const sentence = stabilitySentence(st, nameOf, (key, vars) => t(key, vars, lang));
  const ids = new Set(ideas.map((i) => i.id));
  const picked = (state.picks || []).filter((id, k, a) => ids.has(id) && a.indexOf(id) === k).slice(0, 3);
  const picks = picked.length ? picked : ranked.slice(0, 3).map((r) => r.id);
  const decided = !!state.decided && picks.length > 0;
  const shortlist = { decided, picks: picks.map((id, k) => ({ idea: id, place: k + 1, points: 3 - k })) };
  const facts = factValues({ issues, ideas, weights, model: DEFAULT_MODEL, shortlist: decided ? picks : null, lang });
  const answers = sc.answers[lang];
  const rec = answers.recommendation;
  const recommendation = rec ? Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, renderFacts(v, facts, lang)])) : null;
  const scoreOf = (id) => ranked.find((r) => r.id === id);
  const recommended = picks.map((id, k) => {
    const idea = ideas.find((i) => i.id === id);
    const r = scoreOf(id);
    return { id, place: k + 1, points: 3 - k, name: idea.name, why: idea.why, value: r.value, rank: r.rank, issues: idea.issues, cost: facts[`idea.${id}.cost`]?.value ?? null };
  });
  const stake = atStake(issues);
  const covered = issuesCovered(issues, ideas);
  const top = ranked[0] ? { id: ranked[0].id, name: ranked[0].name, value: ranked[0].value } : null;
  const first = recommended[0] ? { id: recommended[0].id, name: recommended[0].name, value: recommended[0].value } : null;
  const share = shortlistShare(issues, ideas, picks);
  const documents = documentsOf(sc, lang);
  const kept = issues.filter((i) => i.status === "kept");
  const kpis = kpisFor(read.company.sector);
  const estimateInput = {
    lang,
    count: sc.count,
    documents,
    answers,
    readerInputText: answers.reader ? readerInput({ company: read.company, sectors: SECTORS, kpis, handoffIssues: read.issues.filter((i) => i.source.kind === "handoff"), files: documents }) : "",
    mergesInputText: answers.merges ? mergesInput({ issues: read.issues }) : "",
    ideatorInputText: ideatorInput({ company: read.company, issues, focus: sc.focus[lang], count: sc.count, kpis, facts, lang }),
    writerInputText: writerInput({ company: read.company, documents, issues: kept, ranked, facts })
  };
  return {
    scenario: sc.id,
    lang,
    company: read.company,
    tools: read.tools,
    documents,
    proposals: read.proposals,
    decisions,
    issues,
    ideas,
    weights,
    ranked,
    stability: st,
    sentence,
    shortlist,
    facts,
    recommendation,
    recommended,
    evidence: evidenceOf(issues),
    figures: { atStake: stake, covered, top, first, share: share.share, shareEur: share.eur },
    estimate: {
      fast: estimateRun(estimateInput, "fast"),
      balanced: estimateRun(estimateInput, "balanced"),
      thorough: estimateRun(estimateInput, "thorough")
    }
  };
}

/** The run along the recorded choices: what the scenario shows before anything runs (answer first). */
export function recordedRun(sc, lang) {
  return buildRun(sc, lang, { decisions: sc.choices.issues, weights: sc.choices.weights, picks: sc.choices.shortlist, decided: true });
}

/**
 * The figures a scenario's reference freezes, from a run: tools/check-scenarios.mjs compares them with
 * the frozen ones, so a change that moves a figure fails until the scenario is checked again.
 */
export function referenceOf(run) {
  const firsts = Object.fromEntries(Object.entries(run.stability.counts).map(([id, c]) => [id, c.firsts]));
  const cents = (x) => Math.round(x * 100);
  return {
    at_stake: { eur: run.figures.atStake.eur, stated: run.figures.atStake.stated, of: run.figures.atStake.of },
    kept: run.issues.filter((i) => i.status === "kept").length,
    covered: { covered: run.figures.covered.covered, of: run.figures.covered.of },
    ideas: run.ideas.length,
    order: run.ranked.map((r) => r.id),
    top: { id: run.figures.top.id, score: Math.round(run.figures.top.value * 100) / 100 },
    firsts,
    shortlist_share: run.figures.share === null ? null : Math.round(run.figures.share * 1000) / 1000,
    cost_cents: { fast: run.estimate.fast.eur.map(cents), balanced: run.estimate.balanced.eur.map(cents), thorough: run.estimate.thorough.eur.map(cents) }
  };
}
