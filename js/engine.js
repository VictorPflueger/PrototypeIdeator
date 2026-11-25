// The engine computes every figure the page and the report show; the agents only rate and describe
// (brief §6.4, PLAN.md §9). It is pure: no DOM, no clock, no randomness, so the browser and the tests
// run the same module. Weights are whole percentages, so scores compare exactly by cross-multiplying and
// a tie is a real tie, not a rounding accident. Golden cases PI1 to PI3 (tests/fixtures/) hold it to the
// brief's numbers; tests/engine.mjs checks them in both languages.

import { MODELS, FX_USD_EUR, IDEA_RUN } from "./config.js";
import { fmtEurCompact } from "./format.js";

/** The seven criteria, in the order of the brief's table (section 6.4). */
export const CRITERIA = Object.freeze(["value", "evidence", "buildable", "agentic", "relevance", "demo", "risk"]);

/** The default weights in percent: Victor's reference weights (D12). */
export const DEFAULT_WEIGHTS = Object.freeze({ value: 20, evidence: 10, buildable: 20, agentic: 15, relevance: 15, demo: 15, risk: 5 });

/** Who wins a tie on the score: business value, relevance, buildable, agentic fit, demo impact, evidence, low risk. */
export const TIE_ORDER = Object.freeze(["value", "relevance", "buildable", "agentic", "demo", "evidence", "risk"]);

/** The weight sliders: 0 to 40 % in steps of 5. */
export const WEIGHT_RULE = Object.freeze({ min: 0, max: 40, step: 5 });

/** Problems with a set of weights; an empty list means the engine may use it. All at zero is refused. */
export function weightProblems(weights) {
  if (!weights || typeof weights !== "object") return ["weights missing"];
  const out = [];
  for (const c of CRITERIA) {
    const v = weights[c];
    if (!Number.isInteger(v)) out.push(`${c}: not a whole number`);
    else if (v < WEIGHT_RULE.min || v > WEIGHT_RULE.max) out.push(`${c}: outside ${WEIGHT_RULE.min} to ${WEIGHT_RULE.max}`);
    else if (v % WEIGHT_RULE.step) out.push(`${c}: not on a step of ${WEIGHT_RULE.step}`);
  }
  for (const k of Object.keys(weights)) if (!CRITERIA.includes(k)) out.push(`${k}: not a criterion`);
  if (CRITERIA.every((c) => weights[c] === 0)) out.push("all weights at zero");
  return out;
}

const total = (weights) => CRITERIA.reduce((s, c) => s + (Number(weights[c]) || 0), 0);

/** Each weight's share of the total, for sliders that don't add up to 100 %; null when all are zero. */
export function normaliseWeights(weights) {
  const sum = total(weights);
  if (!sum) return null;
  return Object.fromEntries(CRITERIA.map((c) => [c, (Number(weights[c]) || 0) / sum]));
}

/** Every criterion weighted the same, for the stability check. */
export function equalWeights() {
  return Object.fromEntries(CRITERIA.map((c) => [c, 1]));
}

/** A rating as a number, whether the idea holds plain numbers or { score, reason } objects. */
export function ratingOf(idea, criterion) {
  const r = idea?.ratings?.[criterion];
  return Number(r !== null && typeof r === "object" ? r.score : r);
}

/** The weighted score as an exact fraction: the sum of rating × weight over the sum of the weights. */
export function scoreOf(ratings, weights) {
  let num = 0;
  let den = 0;
  const idea = { ratings };
  for (const c of CRITERIA) {
    const w = Number(weights[c]) || 0;
    num += ratingOf(idea, c) * w;
    den += w;
  }
  return { num, den };
}

/** The fraction as a number (shown to two decimals by format.js); null without weights. */
export function scoreValue(score) {
  return score && score.den ? score.num / score.den : null;
}

/** The criterion that first tells two ideas apart in the tie order, or "name" when none does. */
export function tieBreaker(a, b, tieOrder = TIE_ORDER) {
  for (const c of tieOrder) if (ratingOf(a, c) !== ratingOf(b, c)) return c;
  return "name";
}

function comparator(weights, { tieOrder = TIE_ORDER, lang = "en" } = {}) {
  const collator = new Intl.Collator(lang === "de" ? "de-DE" : "en-GB");
  return (a, b) => {
    const sa = scoreOf(a.ratings, weights);
    const sb = scoreOf(b.ratings, weights);
    const d = sb.num * sa.den - sa.num * sb.den; // above zero: b scores higher
    if (d) return d;
    for (const c of tieOrder) {
      const e = ratingOf(b, c) - ratingOf(a, c);
      if (e) return e;
    }
    return collator.compare(String(a.name ?? ""), String(b.name ?? "")) || String(a.id).localeCompare(String(b.id));
  };
}

/**
 * The ideas ranked by score, then by the tie order, then by name as the run's language sorts it.
 * Returns new objects: { id, name, score: { num, den }, value, rank }.
 */
export function rankIdeas(ideas, weights, options = {}) {
  const cmp = comparator(weights, options);
  return [...ideas].sort(cmp).map((idea, i) => {
    const score = scoreOf(idea.ratings, weights);
    return { id: idea.id, name: idea.name, score, value: scoreValue(score), rank: i + 1 };
  });
}

/** The weights the stability check ranks with: those in use, equal weights, and each criterion left out. */
export function stabilityWeights(weights) {
  const sets = [
    { label: "current", weights: { ...weights } },
    { label: "equal", weights: equalWeights() },
    ...CRITERIA.map((c) => ({ label: `without:${c}`, weights: { ...weights, [c]: 0 } }))
  ];
  // Leaving out the only weight above zero leaves nothing to rank by: that ranking is skipped.
  return sets.filter((s) => total(s.weights) > 0);
}

/**
 * The stability (sensitivity) check: up to nine rankings, and per idea how often it comes first and how
 * often it lands in the top three. `order` is the ranking with the weights in use.
 */
export function stability(ideas, weights, options = {}) {
  const rankings = stabilityWeights(weights).map((s) => ({ label: s.label, order: rankIdeas(ideas, s.weights, options).map((x) => x.id) }));
  const counts = Object.fromEntries(ideas.map((i) => [i.id, { firsts: 0, top3: 0 }]));
  for (const r of rankings) {
    if (r.order.length) counts[r.order[0]].firsts += 1;
    for (const id of r.order.slice(0, 3)) counts[id].top3 += 1;
  }
  return { rankings, counts, of: rankings.length, order: rankings[0]?.order || [] };
}

/** The places whose idea differs between the rankings, 1-based, grouped into runs. */
function changingRuns(rankings) {
  const n = rankings[0]?.order.length || 0;
  const changing = [];
  for (let p = 0; p < n; p++) if (new Set(rankings.map((r) => r.order[p])).size > 1) changing.push(p + 1);
  const runs = [];
  for (const p of changing) {
    const last = runs.at(-1);
    if (last && last.to === p - 1) last.to = p;
    else runs.push({ from: p, to: p });
  }
  return runs;
}

/**
 * The stability check in one sentence, from templates in the string files: "A is first in 9 of 9
 * rankings; places 2 to 4 change with the weights." nameOf(id) gives an idea's name; t(key, vars) the
 * text in the run's language.
 */
export function stabilitySentence(st, nameOf, t) {
  const pos = (id) => st.order.indexOf(id);
  const leaders = Object.entries(st.counts)
    .filter(([, c]) => c.firsts > 0)
    .sort((a, b) => b[1].firsts - a[1].firsts || pos(a[0]) - pos(b[0]));
  if (!leaders.length) return "";
  const first = [
    t("stability.first", { name: nameOf(leaders[0][0]), count: leaders[0][1].firsts, of: st.of }),
    ...leaders.slice(1).map(([id, c]) => t("stability.firstAlso", { name: nameOf(id), count: c.firsts }))
  ].join(", ");
  const runs = changingRuns(st.rankings);
  let second;
  if (!runs.length) second = t("stability.holds");
  else if (runs.length === 1 && runs[0].from < runs[0].to) second = t("stability.places", runs[0]);
  else {
    const parts = runs.map((r) => (r.from === r.to ? t("stability.runOne", { at: r.from }) : t("stability.run", r)));
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")}${t("stability.and")}${parts.at(-1)}` : parts[0];
    second = t("stability.placesMany", { runs: list });
  }
  return t("stability.sentence", { first, second });
}

/**
 * What one live run of a proposed prototype would cost (Victor's rule, brief §6.4): model calls ×
 * (2,000 new input + 15,000 cache-read input + 600 output tokens) at the model's prices, plus $0.01 a
 * web search, at the fixed rate. Returns { usd, eur } at full precision.
 */
export function liveRunEstimate({ model, calls, searches = 0 }) {
  const m = MODELS.find((x) => x.id === model) || MODELS.find((x) => x.id === "claude-sonnet-5-5");
  const p = m.price;
  const perCall = IDEA_RUN.inputTokens * p.input + IDEA_RUN.cacheReadTokens * p.cacheRead + IDEA_RUN.outputTokens * p.output;
  const usd = (Number(calls) || 0) * perCall / 1e6 + (Number(searches) || 0) * IDEA_RUN.usdPerSearch;
  return { usd, eur: usd * FX_USD_EUR };
}

// ---- the issues and the key figures --------------------------------------------------------------------

const kept = (issues) => issues.filter((i) => i.status === "kept");

/** A kept issue's expected euros a year: the largest of its own and those of the issues merged into it (D15). */
function groupValue(issue, issues) {
  const members = [issue, ...issues.filter((x) => x.status === "merged" && x.merged_into === issue.id)];
  const values = members.map((m) => m.eur_year_expected).filter((v) => typeof v === "number" && Number.isFinite(v));
  return values.length ? Math.max(...values) : null;
}

/** The kept issue an issue id counts for: itself, the issue it merged into, or none if parked. */
function keptIdOf(id, issues) {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  if (issue.status === "kept") return issue.id;
  if (issue.status === "merged") return issues.find((i) => i.id === issue.merged_into && i.status === "kept")?.id || null;
  return null;
}

/** The member whose expected euros a kept issue's group counts at: its largest value, or null (D15). */
function groupMember(issue, issues) {
  const members = [issue, ...issues.filter((x) => x.status === "merged" && x.merged_into === issue.id)];
  let best = null;
  for (const m of members) if (typeof m.eur_year_expected === "number" && Number.isFinite(m.eur_year_expected) && (!best || m.eur_year_expected > best.eur_year_expected)) best = m;
  return best;
}

/**
 * At stake a year: the kept issues' expected euros, on the issues that state them. { eur, stated, of,
 * estimated }: estimated counts the amounts that are the Reader's AI estimates, which every figure built on
 * them has to say (review A6).
 */
export function atStake(issues) {
  const members = kept(issues).map((i) => groupMember(i, issues));
  const stated = members.filter(Boolean);
  return { eur: stated.length ? stated.reduce((a, m) => a + m.eur_year_expected, 0) : null, stated: stated.length, of: members.length, estimated: stated.filter((m) => m.estimate).length };
}

/** The tile's value: "€14.2m on 6 of 9 issues", or the amount alone when every issue states one. */
export function atStakeText(s, t, lang) {
  if (s.eur === null) return t("kpi.atStake.none");
  const amount = fmtEurCompact(s.eur, lang);
  return s.stated === s.of ? amount : t("kpi.atStake.part", { amount, stated: s.stated, of: s.of });
}

/** Issues covered: kept issues that at least one idea names, of all kept issues. { covered, of }. */
export function issuesCovered(issues, ideas) {
  const covered = new Set();
  for (const idea of ideas) for (const id of idea.issues || []) {
    const k = keptIdOf(id, issues);
    if (k) covered.add(k);
  }
  return { covered: covered.size, of: kept(issues).length };
}

/** Top score: the first of a ranking. */
export function topScore(ranked) {
  const top = ranked[0];
  return top ? { id: top.id, name: top.name, value: top.value } : null;
}

/** The share of At stake that the shortlisted ideas' issues hold. { eur, share }. */
export function shortlistShare(issues, ideas, shortlist) {
  const answered = new Set();
  for (const idea of ideas.filter((i) => shortlist.includes(i.id))) for (const id of idea.issues || []) {
    const k = keptIdOf(id, issues);
    if (k) answered.add(k);
  }
  const values = [...answered].map((id) => groupValue(issues.find((i) => i.id === id), issues)).filter((v) => v !== null);
  const eur = values.length ? values.reduce((a, b) => a + b, 0) : null;
  const all = atStake(issues).eur;
  return { eur, share: eur !== null && all ? eur / all : null };
}

/**
 * The fact values for {{fact:key}} placeholders (brief §5.10, PLAN.md §9.1): each { type, value }, typed
 * so that js/facts.js writes it in the run's language. type is eur, eur_run (one live run's cost, written as
 * the tables write it), score, count, share or text.
 */
export function factValues({ issues = [], ideas = [], weights = DEFAULT_WEIGHTS, model = "claude-haiku-5-5", shortlist = null, lang = "en" }) {
  const facts = {};
  const s = atStake(issues);
  facts.at_stake = { type: "eur", value: s.eur, stated: s.stated, of: s.of, estimated: s.estimated || 0 };
  facts["issues.kept"] = { type: "count", value: s.of };
  const cov = issuesCovered(issues, ideas);
  facts["issues.covered"] = { type: "count", value: cov.covered, of: cov.of };
  facts["ideas.count"] = { type: "count", value: ideas.length };
  if (ideas.length) {
    const ranked = rankIdeas(ideas, weights, { lang });
    const st = stability(ideas, weights, { lang });
    const top = topScore(ranked);
    facts["top.score"] = { type: "score", value: top.value };
    facts["top.name"] = { type: "text", value: top.name };
    for (const r of ranked) {
      const idea = ideas.find((i) => i.id === r.id);
      facts[`idea.${r.id}.score`] = { type: "score", value: r.value };
      facts[`idea.${r.id}.rank`] = { type: "count", value: r.rank };
      facts[`idea.${r.id}.firsts`] = { type: "count", value: st.counts[r.id].firsts, of: st.of };
      const inputs = idea.live_inputs || {};
      facts[`idea.${r.id}.cost`] = { type: "eur_run", value: liveRunEstimate({ model, calls: inputs.model_calls, searches: inputs.web_searches }).eur };
    }
  }
  // Every issue with an amount: a kept one at its group's value (D15), a merged or parked one at its own,
  // so an idea's text that cites an issue still reads right whatever the person decided.
  for (const i of issues) {
    const own = typeof i.eur_year_expected === "number" && Number.isFinite(i.eur_year_expected) ? i.eur_year_expected : null;
    const v = i.status === "kept" ? groupValue(i, issues) : own;
    if (v !== null) facts[`issue.${i.id}.eur`] = { type: "eur", value: v };
  }
  if (Array.isArray(shortlist)) facts["shortlist.share"] = { type: "share", value: shortlistShare(issues, ideas, shortlist).share };
  return facts;
}
