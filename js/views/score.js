// Step 4, Score (brief §6.4, AC-20): the engine's score table and the chart of score against build effort,
// the stability check in one sentence with its nine rankings one click away, and the weights. A weight
// moves in steps of 5 from 0 to 40 %; when they don't add up to 100 %, each shows its share of the total;
// all at zero is refused. A change re-ranks at once, without any request, and is logged in the session.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { fmtScore, fmtEur, fmtInt, fmtShare } from "../format.js";
import { CRITERIA, WEIGHT_RULE, DEFAULT_WEIGHTS, normaliseWeights, weightProblems } from "../engine.js";
import { scoreChart } from "../charts.js";
import { heading, turnBar, storyPanel, evidencePanel } from "./common.js";

/** The seven sliders. weights: the weights in use; draft: what the sliders show (may be all zero). */
export function weightSliders({ weights, draft, onChange, lang }) {
  const shares = normaliseWeights(draft);
  const total = CRITERIA.reduce((s, c) => s + draft[c], 0);
  const refused = weightProblems(draft).length > 0;
  return h("div", { class: "weights", id: "weights" },
    h("div", { class: "weights-grid" }, CRITERIA.map((c) => {
      const id = `w-${c}`;
      const out = h("output", { for: id, class: "weight-out" }, `${draft[c]} %`, total !== 100 && shares ? h("span", { class: "weight-share" }, t("score.share", { share: fmtShare(shares[c], lang) })) : null);
      // While a slider moves, only its own figure changes; the ranking follows when it is let go (change),
      // so a drag is never cut short by the step drawing itself again.
      return h("div", { class: "vc-field weight-field" },
        h("div", { class: "weight-head" }, h("label", { class: "vc-label weight-label", for: id }, t(`crit.${c}`)), out),
        h("input", {
          class: "vc-slider", id, type: "range", min: WEIGHT_RULE.min, max: WEIGHT_RULE.max, step: WEIGHT_RULE.step, value: draft[c],
          dataset: { criterion: c, action: "weight" },
          "aria-valuetext": `${draft[c]} %`,
          on: {
            input: (e) => { const v = Number(e.target.value); out.firstChild.textContent = `${v} %`; e.target.setAttribute("aria-valuetext", `${v} %`); },
            change: (e) => onChange(c, Number(e.target.value))
          }
        }));
    })),
    // The sum only speaks when it is not 100 %: then each weight counts at its share, or nothing ranks.
    total === 100 && !refused ? null : h("p", { class: ["weights-sum", refused ? "is-refused" : ""], role: refused ? "alert" : "status" },
      refused ? t("score.weights.zero") : t("score.weights.rescaled", { total })));
}

/** The score table: rank, idea, the seven ratings, the score, the build effort and one live run's cost. */
export function scoreTable(run, { picks = [], lang, onOpen }) {
  return h("div", { class: "vc-table-wrap score-wrap" },
    h("table", { class: "vc-table vc-table--compact score-table", id: "score-table" },
      h("caption", { class: "vc-visually-hidden" }, t("score.caption")),
      h("thead", {}, h("tr", {},
        h("th", { scope: "col", class: "vc-num" }, t("score.col.rank")),
        h("th", { scope: "col" }, t("score.col.idea")),
        CRITERIA.map((c) => h("th", { scope: "col", class: "vc-num crit-col", title: t(`crit.${c}`) }, h("abbr", { title: t(`crit.${c}`) }, t(`crit.short.${c}`)))),
        h("th", { scope: "col", class: "vc-num" }, t("score.col.score")),
        h("th", { scope: "col", class: "vc-num wide-col" }, t("score.col.days")),
        h("th", { scope: "col", class: "vc-num wide-col" }, t("score.col.cost")))),
      h("tbody", {}, run.ranked.map((r) => {
        const idea = run.ideas.find((i) => i.id === r.id);
        const place = picks.indexOf(r.id);
        return h("tr", { class: place >= 0 ? "is-pick" : "", dataset: { idea: r.id } },
          h("td", { class: "vc-num" }, String(r.rank)),
          h("th", { scope: "row" }, h("button", { type: "button", class: "link-button", dataset: { action: "open-idea", idea: r.id }, on: { click: () => onOpen(r.id) } }, r.name)),
          CRITERIA.map((c) => h("td", { class: "vc-num crit-col" }, String(idea.ratings[c].score))),
          h("td", { class: "vc-num score-value" }, h("strong", {}, fmtScore(r.value, lang))),
          h("td", { class: "vc-num wide-col" }, t("score.days", { low: fmtInt(idea.effort_days.low, lang), high: fmtInt(idea.effort_days.high, lang) })),
          h("td", { class: "vc-num wide-col" }, fmtEur(run.facts[`idea.${r.id}.cost`]?.value, lang)));
      }))));
}

/** The nine rankings of the stability check, for its dialog. */
export function stabilityTable(run, lang) {
  const st = run.stability;
  const label = (l) => (l === "current" ? t("score.st.current") : l === "equal" ? t("score.st.equal") : t("score.st.without", { criterion: t(`crit.${l.split(":")[1]}`) }));
  const nameOf = (id) => run.ideas.find((i) => i.id === id)?.name || "";
  return h("div", { class: "stability" },
    h("p", { class: "stability-sentence" }, run.sentence),
    h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact stability-table" },
      h("caption", {}, t("score.st.caption", { of: st.of })),
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("score.st.weights")), [1, 2, 3].map((p) => h("th", { scope: "col" }, t("score.st.place", { n: p }))))),
      h("tbody", {}, st.rankings.map((r) => h("tr", {}, h("th", { scope: "row" }, label(r.label)), r.order.slice(0, 3).map((id) => h("td", {}, nameOf(id)))))))),
    h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact stability-counts" },
      h("caption", {}, t("score.st.counts")),
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("score.col.idea")), h("th", { scope: "col", class: "vc-num" }, t("score.st.firsts")), h("th", { scope: "col", class: "vc-num" }, t("score.st.top3")))),
      h("tbody", {}, st.order.map((id) => h("tr", {}, h("th", { scope: "row" }, nameOf(id)), h("td", { class: "vc-num" }, t("score.st.of", { n: st.counts[id].firsts, of: st.of })), h("td", { class: "vc-num" }, t("score.st.of", { n: st.counts[id].top3, of: st.of }))))))));
}

/**
 * The Score step. ctx: { run, lang, picks, weightsOpen, draft, onToggleWeights, onWeight, onResetWeights,
 * onStability, onOpen, onNext }.
 */
export function renderScore(ctx) {
  const { run, lang } = ctx;
  const top = run.ranked[0];
  const firsts = run.stability.counts[top.id].firsts;
  const picks = ctx.picks || [];
  const view = ["chart", "table", "stability"].includes(ctx.view) ? ctx.view : "chart";
  const rows = run.ranked.map((r) => {
    const idea = run.ideas.find((i) => i.id === r.id);
    return { id: r.id, name: r.name, value: r.value, low: idea.effort_days.low, high: idea.effort_days.high };
  });
  // Chart, table or stability: Vici's segmented control, a radio group that changes how the ranking is shown.
  const switcher = h("div", { class: "vc-segmented view-switch", role: "radiogroup", "aria-label": t("score.view") },
    [["chart", "hexagon"], ["table", "list"], ["stability", "scale"]].map(([v, icon]) => h("label", {},
      h("input", { type: "radio", name: "score-view", value: v, id: `view-${v}`, checked: view === v || undefined, dataset: { action: "score-view" }, on: { change: () => ctx.onView(v) } }),
      h("span", {}, h("span", { class: `vc-icon vc-icon--${icon}`, "aria-hidden": "true" }), t(`score.view.${v}`)))));
  const atDefault = CRITERIA.every((c) => ctx.draft[c] === DEFAULT_WEIGHTS[c]);
  return h("div", { class: "step", dataset: { step: "score" } },
    storyPanel(
      ...heading(t("score.title", { name: top.name, count: firsts, of: run.stability.of }), ctx.weightsOpen ? null : t("score.lead", { of: run.stability.of })),
      h("div", { class: "score-actions" },
        h("button", { type: "button", class: "vc-button vc-button--secondary", id: "btn-weights", "aria-expanded": String(!!ctx.weightsOpen), "aria-controls": "weights", dataset: { action: "toggle-weights" }, on: { click: ctx.onToggleWeights } },
          h("span", { class: "vc-icon vc-icon--settings", "aria-hidden": "true" }), t(ctx.weightsOpen ? "score.weights.hide" : "score.weights.show")),
        ctx.weightsOpen ? h("button", { type: "button", class: "vc-button vc-button--ghost", id: "btn-weights-reset", dataset: { action: "weights-reset" }, disabled: atDefault || undefined, on: { click: ctx.onResetWeights } },
          h("span", { class: "vc-icon vc-icon--refresh", "aria-hidden": "true" }), t("score.weights.reset")) : null),
      ctx.weightsOpen ? weightSliders({ weights: run.weights, draft: ctx.draft, onChange: ctx.onWeight, lang }) : null,
      // While the weights are open the bar keeps only its action, so the seven sliders fit above it.
      turnBar({ kind: "next", text: ctx.weightsOpen ? null : t("score.turn"), action: { label: t("score.next"), icon: "arrow-right", onClick: ctx.onNext } })),
    h("section", { class: "panel evidence", "aria-labelledby": "evidence-title" },
      h("div", { class: "panel-head" }, h("h2", { class: "panel-title", id: "evidence-title" }, t("score.panel")), switcher),
      view === "chart" ? scoreChart(rows, { picks })
        : view === "table" ? scoreTable(run, { picks, lang, onOpen: ctx.onOpen })
          : stabilityTable(run, lang)));
}
