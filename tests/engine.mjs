// The engine against the brief's golden cases (AC-16): PI1's scores, ranking and tie-break, PI2's nine
// rankings with their counts and sentence, PI3's live-run estimates to the cent, all in English and in
// German. The fixtures in tests/fixtures/ hold the brief's numbers; this suite recomputes them through
// js/engine.js and js/format.js and counts PI2's firsts and top-three places itself from the brief's
// rankings, so no supplied number is its own proof. Then the engine's other rules: weights, ties on the
// name, edge rules, At stake a year with merged issues (D15), Issues covered and the fact values.
// Prints ENGINE OK.
// Usage: node tests/engine.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = (f) => JSON.parse(readFileSync(path.join(ROOT, "tests", "fixtures", f), "utf8"));
const E = await import(path.join(ROOT, "js", "engine.js"));
const F = await import(path.join(ROOT, "js", "format.js"));
const { t } = await import(path.join(ROOT, "js", "i18n", "index.js"));
const r = createReport("engine");

const PI1 = fixture("pi1-scores.json");
const PI2 = fixture("pi2-stability.json");
const PI3 = fixture("pi3-estimates.json");
const ideas = PI1.ideas;
const nameOf = (id) => ideas.find((i) => i.id === id)?.name ?? id;

// ---- the checks can fail ------------------------------------------------------------------------------
{
  const swapped = E.rankIdeas(ideas, PI1.weights, { tieOrder: ["agentic", ...PI1.tie_order.filter((c) => c !== "agentic")] }).map((x) => x.id);
  r.control(swapped.indexOf("D") < swapped.indexOf("C"), "with agentic fit first in the tie order, D ranks before C, so PI1's order rests on the tie order");
  const changed = ideas.map((i) => (i.id === "E" ? { ...i, ratings: { ...i.ratings, value: 5, demo: 5 } } : i));
  r.control(!same(E.rankIdeas(changed, PI1.weights).map((x) => x.id), PI1.ranking), "a changed rating changes the ranking, so the comparison with PI1 can fail");
  r.control(F.fmtScore(4.3, "en") !== "4.3" && F.fmtEur(0.300384, "de") !== "0,30 €", "two decimals and the no-break space before the euro sign are part of what is compared");
}

// ---- PI1 ----------------------------------------------------------------------------------------------
r.check(same(E.CRITERIA, PI1.criteria), `the engine's seven criteria in the brief's order (${E.CRITERIA.join(", ")})`);
r.check(same(E.DEFAULT_WEIGHTS, PI1.weights), "the default weights are the brief's: 20, 10, 20, 15, 15, 15 and 5 %");
r.check(same(E.TIE_ORDER, PI1.tie_order), "ties go to business value, relevance, buildable, agentic fit, demo impact, evidence and low risk");
for (const lang of ["en", "de"]) {
  const shown = Object.fromEntries(ideas.map((i) => [i.id, F.fmtScore(E.scoreValue(E.scoreOf(i.ratings, PI1.weights)), lang)]));
  r.check(same(shown, PI1.scores[lang]), `PI1 scores in ${lang === "en" ? "English" : "German"}: ${Object.values(shown).join(", ")}`);
}
const ranked = E.rankIdeas(ideas, PI1.weights);
r.check(same(ranked.map((x) => x.id), PI1.ranking), `PI1 ranking ${ranked.map((x) => x.id).join(", ")}`);
r.check(same(ranked.map((x) => x.rank), [1, 2, 3, 4, 5]), "ranks run 1 to 5 without a shared place");
{
  const [c, d] = ["C", "D"].map((id) => ideas.find((i) => i.id === id));
  const sc = E.scoreOf(c.ratings, PI1.weights), sd = E.scoreOf(d.ratings, PI1.weights);
  r.check(sc.num * sd.den === sd.num * sc.den && F.fmtScore(E.scoreValue(sc), "en") === PI1.ties[0].score, "C and D tie exactly on 4.30 (compared by cross-multiplying, not as decimals)");
  r.check(E.tieBreaker(c, d) === "value" && ranked.findIndex((x) => x.id === "C") < ranked.findIndex((x) => x.id === "D"), "the tie goes to business value: C before D");
}

// ---- PI2 ----------------------------------------------------------------------------------------------
const st = E.stability(ideas, PI1.weights);
const label = (l) => (l === "default" ? "current" : l);
r.check(st.of === 9 && st.rankings.length === 9, `nine rankings (${st.rankings.length})`);
for (const row of PI2.rankings) {
  const got = st.rankings.find((x) => x.label === label(row.weights));
  r.check(got && same(got.order, row.ranking), `PI2 ${row.weights}: ${got ? got.order.join(", ") : "missing"} (brief: ${row.ranking.join(", ")})`);
}
r.check(same(st.rankings.map((x) => x.label), PI2.rankings.map((x) => label(x.weights))), "the rankings come in the brief's order: current, equal, then one criterion left out each");
// Counted here, from the brief's own nine rankings.
const firsts = {}, tops = {}, seconds = {};
for (const row of PI2.rankings) {
  firsts[row.ranking[0]] = (firsts[row.ranking[0]] || 0) + 1;
  seconds[row.ranking[1]] = (seconds[row.ranking[1]] || 0) + 1;
  for (const id of row.ranking.slice(0, 3)) tops[id] = (tops[id] || 0) + 1;
}
r.check(firsts[PI2.stated.first.idea] === PI2.stated.first.count && seconds[PI2.stated.second.idea] === PI2.stated.second.count, "the brief's rankings give A first 9 times and B second 6 times, as it states");
for (const i of ideas) {
  const c = st.counts[i.id];
  r.check(c && c.firsts === (firsts[i.id] || 0) && c.top3 === (tops[i.id] || 0), `idea ${i.id}: first ${c?.firsts} times, in the top three ${c?.top3} times (counted from the brief: ${firsts[i.id] || 0} and ${tops[i.id] || 0})`);
}
{
  const eq = E.equalWeights();
  const tie = PI2.equal_weights_tie;
  const fr = tie.ideas.map((id) => E.scoreOf(ideas.find((i) => i.id === id).ratings, eq));
  r.check(fr.every((s) => s.num * tie.score.denominator === tie.score.numerator * s.den), `with equal weights B, C and D score exactly ${tie.score.numerator}/${tie.score.denominator}`);
  const order = st.rankings.find((x) => x.label === "equal").order.filter((id) => tie.ideas.includes(id));
  r.check(same(order, tie.order), `and rank ${order.join(", ")}: C on business value, B before D on demo impact`);
  const [b, d] = ["B", "D"].map((id) => ideas.find((i) => i.id === id));
  r.check(E.tieBreaker(b, d) === "demo", "B and D are first told apart by demo impact, after four equal criteria");
}
for (const lang of ["en", "de"]) {
  const s = E.stabilitySentence(st, nameOf, (k, v) => t(k, v, lang));
  r.check(s === PI2.sentence[lang], `PI2 sentence in ${lang === "en" ? "English" : "German"}: "${s}"`);
}

// ---- PI3 ----------------------------------------------------------------------------------------------
for (const row of PI3.rows) {
  const est = E.liveRunEstimate({ model: row.model, calls: row.calls, searches: row.searches });
  r.check(Math.abs(est.usd - row.usd) < 1e-9, `PI3 ${row.model}, ${row.calls} calls, ${row.searches} searches: $${est.usd.toFixed(6)} (brief: $${row.usd})`);
  for (const lang of ["en", "de"]) {
    const shown = F.fmtEur(est.eur, lang);
    r.check(shown === row.shown[lang], `PI3 ${row.model} ${row.calls}/${row.searches} shown in ${lang === "en" ? "English" : "German"}: ${JSON.stringify(shown)}`);
  }
}
r.check(Math.abs(E.liveRunEstimate({ model: "claude-haiku-5-5", calls: 1, searches: 0 }).usd - (2000 * 0.1 + 15000 * 0.01 + 600 * 0.5) / 1e6) < 1e-15, "one Haiku call costs 2,000 × $0.10 + 15,000 × $0.01 + 600 × $0.50 per million tokens");

// ---- weights ------------------------------------------------------------------------------------------
r.check(!E.weightProblems(E.DEFAULT_WEIGHTS).length, "the default weights pass the weight rules");
r.check(E.weightProblems({ ...E.DEFAULT_WEIGHTS, value: 45 }).length > 0 && E.weightProblems({ ...E.DEFAULT_WEIGHTS, value: 12 }).length > 0 && E.weightProblems({ ...E.DEFAULT_WEIGHTS, value: -5 }).length > 0, "a weight above 40, off the steps of 5 or below 0 is refused");
r.check(E.weightProblems(Object.fromEntries(E.CRITERIA.map((c) => [c, 0]))).some((p) => /zero/.test(p)), "all weights at zero are refused");
r.check(E.weightProblems({ value: 20 }).length > 0 && E.weightProblems({ ...E.DEFAULT_WEIGHTS, speed: 10 }).length > 0, "a missing or an unknown criterion is refused");
{
  const odd = { value: 40, evidence: 40, buildable: 40, agentic: 0, relevance: 0, demo: 0, risk: 0 };
  const shares = E.normaliseWeights(odd);
  r.check(Math.abs(Object.values(shares).reduce((a, b) => a + b, 0) - 1) < 1e-12 && Math.abs(shares.value - 1 / 3) < 1e-12, "weights that don't add up to 100 % are rescaled: three at 40 % become a third each");
  r.check(same(E.rankIdeas(ideas, odd).map((x) => x.id), E.rankIdeas(ideas, { value: 5, evidence: 5, buildable: 5, agentic: 0, relevance: 0, demo: 0, risk: 0 }).map((x) => x.id)), "rescaling doesn't change a ranking");
}

// ---- ties on the name, in the run's language ---------------------------------------------------------
{
  const twins = [
    { id: "x", name: "Zollblick", ratings: { ...ideas[0].ratings } },
    { id: "y", name: "Ärgerfrei", ratings: { ...ideas[0].ratings } }
  ];
  r.check(same(E.rankIdeas(twins, PI1.weights, { lang: "de" }).map((x) => x.name), ["Ärgerfrei", "Zollblick"]), "equal on every criterion, ideas go by name as German sorts it: Ärgerfrei before Zollblick");
}

// ---- stability edge rules ----------------------------------------------------------------------------
{
  const one = E.stability([ideas[0]], PI1.weights);
  r.check(E.stabilitySentence(one, nameOf, (k, v) => t(k, v, "en")) === "A is first in 9 of 9 rankings; the order holds in every ranking.", "one idea: first in 9 of 9, and the order holds");
  const only = { value: 0, evidence: 0, buildable: 0, agentic: 0, relevance: 0, demo: 0, risk: 40 };
  const lone = E.stability(ideas, only);
  r.check(lone.of === 8 && !lone.rankings.some((x) => x.label === "without:risk"), "with one weight above zero, leaving it out leaves no weights: that ranking is skipped and the count says 8");
  // Only buildable counts: E leads on it, and A only with equal weights; leaving buildable out is skipped.
  const swapped = E.stability([ideas[0], ideas[1], ideas[4]], { value: 0, evidence: 0, buildable: 5, agentic: 0, relevance: 0, demo: 0, risk: 0 });
  const s = E.stabilitySentence(swapped, nameOf, (k, v) => t(k, v, "en"));
  r.check(s === "E is first in 7 of 8 rankings, A in 1; places 1 to 3 change with the weights.", `when the first place changes, the sentence names each leader: "${s}"`);
  const de = E.stabilitySentence(swapped, nameOf, (k, v) => t(k, v, "de"));
  r.check(de === "E liegt in 7 von 8 Rangfolgen vorn, A in 1; die Plätze 1 bis 3 wechseln mit den Gewichten.", `and in German: "${de}"`);
  const gap = E.stabilitySentence({ of: 9, rankings: [{ order: ["A", "B", "C"] }, { order: ["C", "B", "A"] }], counts: { A: { firsts: 5 }, B: { firsts: 0 }, C: { firsts: 4 } }, order: ["A", "B", "C"] }, nameOf, (k, v) => t(k, v, "en"));
  r.check(gap === "A is first in 5 of 9 rankings, C in 4; places 1 and 3 change with the weights.", `places that change apart are listed one by one: "${gap}"`);
}

// ---- At stake a year, Issues covered, Top score, fact values -----------------------------------------
{
  const issues = [
    { id: "I1", status: "kept", eur_year_expected: 2800000 },
    { id: "I2", status: "merged", merged_into: "I1", eur_year_expected: 3500000 },
    { id: "I3", status: "merged", merged_into: "I1", eur_year_expected: 900000 },
    { id: "I4", status: "kept", eur_year_expected: null },
    { id: "I5", status: "kept", eur_year_expected: 1200000 },
    { id: "I6", status: "parked", eur_year_expected: 9000000 }
  ];
  const s = E.atStake(issues);
  r.check(s.eur === 4700000 && s.stated === 2 && s.of === 3, `At stake: a merged issue counts once at its largest member's value (D15), a parked issue not at all: €${s.eur} on ${s.stated} of ${s.of}`);
  for (const lang of ["en", "de"]) {
    const v = E.atStakeText(s, (k, x) => t(k, x, lang), lang);
    r.check(v === (lang === "en" ? "€4.7m on 2 of 3 issues" : "4,7 Mio. € bei 2 von 3 Themen"), `its value says it rests on part of the issues, in ${lang === "en" ? "English" : "German"}: ${JSON.stringify(v)}`);
  }
  const all = E.atStake([{ id: "I1", status: "kept", eur_year_expected: 1000000 }]);
  r.check(E.atStakeText(all, (k, x) => t(k, x, "en"), "en") === "€1m", "on every issue it is just the amount");
  const none = E.atStake([{ id: "I1", status: "kept", eur_year_expected: null }]);
  r.check(none.eur === null && none.stated === 0 && E.atStakeText(none, (k, x) => t(k, x, "en"), "en") === t("kpi.atStake.none", null, "en"), "no issue states an amount: no figure, never €0");
  const ideaList = [{ id: "X1", issues: ["I1"] }, { id: "X2", issues: ["I3"] }, { id: "X3", issues: ["I6"] }];
  const cov = E.issuesCovered(issues, ideaList);
  r.check(cov.covered === 1 && cov.of === 3, `Issues covered: an idea on a merged issue counts for the issue it merged into; one on a parked issue for none (${cov.covered} of ${cov.of})`);
  const top = E.topScore(E.rankIdeas(ideas, PI1.weights));
  r.check(top.id === "A" && F.fmtScore(top.value, "en") === "4.75", "Top score: A with 4.75");
  const share = E.shortlistShare(issues, ideaList, ["X1"]);
  r.check(Math.abs(share.share - 3500000 / 4700000) < 1e-12, "the shortlist's share of At stake counts the issues its ideas answer");
}
{
  const facts = E.factValues({
    issues: [{ id: "I1", status: "kept", eur_year_expected: 2800000 }, { id: "I2", status: "kept", eur_year_expected: null }],
    ideas: ideas.map((i) => ({ ...i, issues: ["I1"], live_inputs: { model_calls: 20, web_searches: 0 } })),
    weights: PI1.weights,
    model: "claude-haiku-5-5"
  });
  const keys = ["at_stake", "issues.kept", "issues.covered", "ideas.count", "top.score", "top.name", "idea.A.score", "idea.A.rank", "idea.A.firsts", "idea.A.cost", "issue.I1.eur"];
  r.check(keys.every((k) => Object.hasOwn(facts, k)), `the fact values carry every key of PLAN.md §9.1 (${keys.filter((k) => !Object.hasOwn(facts, k)).join(", ") || "all there"})`);
  r.check(facts["top.name"].value === "A" && facts["idea.A.rank"].value === 1 && facts["idea.A.firsts"].value === 9 && facts["issues.kept"].value === 2, "and their values come from the engine: A first, ranked 1, first in 9 rankings, 2 issues kept");
  r.check(facts["at_stake"].type === "eur" && facts["top.score"].type === "score" && facts["idea.A.cost"].type === "eur_cents", "each fact says how it is written: euros, a score or euros with cents");
}

r.finish("ENGINE OK");
