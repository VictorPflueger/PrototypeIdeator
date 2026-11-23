// The simulation model (G5, AC-05): each scenario plays its frozen figures in both languages, and another
// choice gives tiles, ranking, stability and report text that agree with the engine.
//   frozen     the recorded run of S1, S2 and S3 in English and German against the scenario's frozen
//              reference: at stake (worked out here from the issues, apart from the engine), kept and
//              covered issues, the ranking, the top score, how often each idea comes first, the shortlist's
//              share and the cost of one run on each setting, to the cent;
//   choices    another path through each scenario (js/scenario_check.js otherChoices: one merge undone, one
//              named issue parked, other weights, another shortlist): the tiles say what an independent
//              count says, the ranking and the stability sentence are the engine's own for those weights,
//              and the report's sentences carry the same figures.
// Prints SIMULATION OK.
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";
import { createReport, same } from "./lib/report.mjs";

const imp = (p) => import(path.join(APP_ROOT, p));
const { scenarios } = await imp("js/scenarios.js");
const { recordedRun, buildRun, ideasOf } = await imp("js/simulation.js");
const { otherChoices } = await imp("js/scenario_check.js");
const { tileModel } = await imp("js/kpis.js");
const { rankIdeas, stability, stabilitySentence } = await imp("js/engine.js");
const { fmtEurCompact, fmtScore } = await imp("js/format.js");
const { t } = await imp("js/i18n/index.js");

const r = createReport("simulation");
const LANGS = ["en", "de"];
const cents = (x) => Math.round(x * 100);

/** At stake, worked out here: each kept issue counts once, at the largest value among it and the issues merged into it. */
function stakeOf(issues) {
  let eur = 0;
  let stated = 0;
  const kept = issues.filter((i) => i.status === "kept");
  for (const k of kept) {
    const group = [k, ...issues.filter((i) => i.status === "merged" && i.merged_into === k.id)];
    const values = group.map((i) => i.eur_year_expected).filter((v) => typeof v === "number" && Number.isFinite(v));
    if (values.length) { eur += Math.max(...values); stated += 1; }
  }
  return { eur: stated ? eur : null, stated, of: kept.length };
}

/** Kept issues that an idea answers, worked out here: an idea naming a merged issue answers its keeper. */
function coveredOf(issues, ideas) {
  const keptOf = (id) => {
    const i = issues.find((x) => x.id === id);
    if (!i) return null;
    if (i.status === "kept") return i.id;
    if (i.status === "merged") return issues.find((x) => x.id === i.merged_into && x.status === "kept")?.id || null;
    return null;
  };
  const answered = new Set(ideas.flatMap((i) => i.issues || []).map(keptOf).filter(Boolean));
  return { covered: answered.size, of: issues.filter((i) => i.status === "kept").length };
}

for (const sc of scenarios()) {
  const ref = sc.reference;
  r.check(!!ref, `${sc.id}: the scenario carries its frozen reference`);
  if (!ref) continue;
  for (const lang of LANGS) {
    const where = `${sc.id} ${lang}`;
    const run = recordedRun(sc, lang);
    const stake = stakeOf(run.issues);
    r.check(same(stake, ref.at_stake), `${where}: at stake worked out here ${JSON.stringify(stake)} equals the frozen ${JSON.stringify(ref.at_stake)}`);
    r.check(same({ eur: run.figures.atStake.eur, stated: run.figures.atStake.stated, of: run.figures.atStake.of }, ref.at_stake), `${where}: the engine's at stake equals the frozen figure`);
    r.check(run.issues.filter((i) => i.status === "kept").length === ref.kept, `${where}: ${ref.kept} kept issues`);
    r.check(same(coveredOf(run.issues, run.ideas), ref.covered) && same({ covered: run.figures.covered.covered, of: run.figures.covered.of }, ref.covered), `${where}: ${ref.covered.covered} of ${ref.covered.of} kept issues covered, here and in the engine`);
    r.check(run.ideas.length === ref.ideas && run.ideas.length === sc.count && run.ideas.length <= 10, `${where}: ${ref.ideas} ideas, as the scenario asks and never more than ten`);
    r.check(same(run.ranked.map((x) => x.id), ref.order), `${where}: the ranking ${run.ranked.map((x) => x.id).join(" ")} is the frozen one`);
    r.check(run.figures.top.id === ref.top.id && Math.round(run.figures.top.value * 100) / 100 === ref.top.score, `${where}: top score ${ref.top.id} at ${ref.top.score}`);
    const firsts = Object.fromEntries(Object.entries(run.stability.counts).map(([id, c]) => [id, c.firsts]));
    r.check(same(firsts, ref.firsts), `${where}: how often each idea comes first, as frozen`);
    r.check((run.figures.share === null ? null : Math.round(run.figures.share * 1000) / 1000) === ref.shortlist_share, `${where}: the recorded shortlist answers ${ref.shortlist_share} of the money at stake`);
    for (const preset of ["fast", "balanced", "thorough"]) {
      const got = run.estimate[preset].eur.map(cents);
      r.check(same(got, ref.cost_cents[lang][preset]), `${where}: one run on ${preset} costs ${got.join(" to ")} cents, as frozen`);
    }

    // ---- another path ----
    const state = otherChoices(sc, lang);
    const other = buildRun(sc, lang, state);
    const stake2 = stakeOf(other.issues);
    const cov2 = coveredOf(other.issues, other.ideas);
    const tiles = tileModel({ mode: "simulation", run: other, preview: run, reached: 5, lang });
    r.check(!same(state.decisions, sc.choices.issues), `${where}: the other path decides differently from the recorded one`);
    r.check(tiles.stake.value === (stake2.eur === null ? t("kpi.atStake.noneValue", null, lang) : fmtEurCompact(stake2.eur, lang)), `${where}, other path: the at-stake tile shows ${tiles.stake.value}, as counted here`);
    r.check(tiles.covered.value === t("kpi.covered.value", { covered: cov2.covered, of: cov2.of }, lang), `${where}, other path: the covered tile shows ${tiles.covered.value}, as counted here`);
    const ideas = ideasOf(sc, lang);
    const ranked = rankIdeas(ideas, state.weights, { lang });
    r.check(same(other.ranked.map((x) => x.id), ranked.map((x) => x.id)), `${where}, other path: the ranking is the engine's for weights ${Object.values(state.weights).join("/")}`);
    const first = other.recommended[0];
    r.check(first && first.id === state.picks[0] && tiles.top.value === fmtScore(first.value, lang), `${where}, other path: the top tile shows the first pick's score ${tiles.top.value}`);
    const st = stability(ideas, state.weights, { lang });
    const sentence = stabilitySentence(st, (id) => ideas.find((i) => i.id === id)?.name || id, (k, v) => t(k, v, lang));
    r.check(other.sentence === sentence, `${where}, other path: the stability sentence is the engine's: "${sentence.slice(0, 70)}…"`);
    const rec = other.recommendation || {};
    const text = Object.values(rec).join(" ");
    r.check(!/\{\{/.test(text), `${where}, other path: the report's sentences keep no placeholder`);
    if (stake2.eur !== null && /at_stake/.test(JSON.stringify(sc.answers[lang].recommendation || {}))) {
      r.check(text.includes(fmtEurCompact(stake2.eur, lang)), `${where}, other path: the report says ${fmtEurCompact(stake2.eur, lang)} at stake, the figure counted here`);
    }
    if (/top\.name/.test(JSON.stringify(sc.answers[lang].recommendation || {}))) {
      r.check(text.includes(other.figures.top.name), `${where}, other path: the report names the top idea, ${other.figures.top.name}`);
    }
  }
}

// Controls: the checks above can fail. Parking a kept issue that states an amount changes at stake, and
// other weights change the ranking of at least one scenario.
{
  const sc = scenarios()[0];
  const run = recordedRun(sc, "en");
  const victim = run.issues.find((i) => i.status === "kept" && typeof i.eur_year_expected === "number");
  const parked = run.issues.map((i) => (i === victim ? { ...i, status: "parked" } : i));
  r.control(!same(stakeOf(parked), sc.reference.at_stake), "parking one kept issue with an amount moves at stake off the frozen figure");
  const moved = scenarios().some((x) => !same(rankIdeas(ideasOf(x, "en"), { value: 40, evidence: 0, buildable: 0, agentic: 0, relevance: 0, demo: 0, risk: 40 }, { lang: "en" }).map((y) => y.id), x.reference.order));
  r.control(moved, "other weights give another order than a frozen one");
}

r.finish("SIMULATION OK");
