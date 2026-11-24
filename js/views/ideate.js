// Step 3, Ideate: the honeycomb of ideas, one hexagon per idea, and the idea's own page in a drawer
// (brief §6.3): what it does, the issue it answers, what the room sees, its key figures today and in the
// demo, how the agent works in five steps and the person's decision, the data, the risks, the build effort,
// what one live run would cost, the seven ratings with their reasons and why to build it. The Ideator
// wrote it all, so the page carries the AI tag; the cost and the score are the engine's.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { fmtScore, fmtEur, fmtInt } from "../format.js";
import { renderFacts } from "../facts.js";
import { CRITERIA } from "../engine.js";
import { honeycomb } from "../charts.js";
import { heading, agentLine, turnBar, storyPanel, evidencePanel, namesOf, uncheckedNote } from "./common.js";

/** Five hexagon cells, filled up to a rating of 1 to 5 (Vici's rating cells), with the number in words. */
export function ratingCells(score) {
  return h("span", { class: "vc-rating rating-cells", role: "img", "aria-label": t("drawer.rating", { n: score }) },
    [1, 2, 3, 4, 5].map((k) => h("span", { class: ["vc-rating__cell", k <= score ? "vc-rating__cell--on" : ""], "aria-hidden": "true" })));
}

/** The idea's page, for the drawer. ctx: { run, lang, unchecked (true when the fact audit refused a text of it twice) }. */
export function ideaPage(idea, { run, lang, unchecked = false }) {
  const names = namesOf(run);
  const facts = run.facts;
  const fill = (s) => renderFacts(s, facts, lang);
  const ranked = run.ranked.find((r) => r.id === idea.id);
  const cost = facts[`idea.${idea.id}.cost`]?.value;
  const issueItems = idea.issues.map((id) => {
    const i = names.issue(id);
    if (!i) return null;
    const keptOf = names.keptOf(id);
    return h("li", {}, h("span", {}, (keptOf || i).title), i.status === "parked" ? h("span", { class: "vc-tag vc-tag--sm vc-tag--warning parked-tag" }, t("drawer.parkedIssue")) : null);
  });
  const section = (key, ...children) => h("section", { class: "idea-section" }, h("h3", { class: "idea-h" }, t(key)), ...children);
  return h("article", { class: "idea-page", dataset: { idea: idea.id } },
    unchecked ? uncheckedNote() : null,
    h("p", { class: "idea-what" }, fill(idea.what_it_does)),
    h("div", { class: "idea-facts" },
      h("p", {}, h("span", { class: "idea-label" }, t("drawer.score")), h("strong", {}, ranked ? fmtScore(ranked.value, lang) : "…"), ranked ? h("span", { class: "muted" }, t("drawer.rank", { n: ranked.rank, of: run.ideas.length })) : null),
      h("p", {}, h("span", { class: "idea-label" }, t("drawer.effort")), h("strong", {}, t("drawer.days", { low: fmtInt(idea.effort_days.low, lang), high: fmtInt(idea.effort_days.high, lang) }))),
      h("p", {}, h("span", { class: "idea-label" }, t("drawer.cost")), h("strong", {}, cost !== undefined ? fmtEur(cost, lang) : "…"), h("span", { class: "muted" }, t("drawer.costBasis", { calls: idea.live_inputs.model_calls, searches: idea.live_inputs.web_searches })))),
    section("drawer.answers", h("ul", { class: "idea-issues" }, issueItems), h("p", { class: "muted" }, t("drawer.for", { audience: fill(idea.audience) }))),
    section("drawer.room", h("ol", { class: "idea-room" }, idea.room.map((x) => h("li", {}, fill(x))))),
    section("drawer.figures", h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact figures-table" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("drawer.figure")), h("th", { scope: "col" }, t("drawer.today")), h("th", { scope: "col" }, t("drawer.demo")))),
      h("tbody", {}, idea.key_figures.map((f) => h("tr", {},
        h("th", { scope: "row" }, fill(f.name)),
        h("td", {}, f.public ? [h("span", {}, f.today), h("span", { class: "figure-source" }, /^https?:/.test(f.source) ? h("a", { class: "vc-link", href: f.source, rel: "noopener", target: "_blank" }, t("drawer.source"), h("span", { class: "vc-visually-hidden" }, t("p.newTab"))) : f.source)] : h("span", { class: "muted" }, t("drawer.notPublic"))),
        h("td", {}, fill(f.demo)))))))),
    section("drawer.how", h("dl", { class: "idea-how" }, ["spot", "check", "calculate", "propose", "prepare", "decision"].map((k) => h("div", { class: k === "decision" ? "how-decision" : "" }, h("dt", {}, t(`drawer.how.${k}`)), h("dd", {}, fill(idea.how[k])))))),
    section("drawer.data", h("ul", {}, idea.data.map((x) => h("li", {}, fill(x))))),
    idea.risks.length ? section("drawer.risks", h("ul", {}, idea.risks.map((x) => h("li", {}, fill(x))))) : null,
    section("drawer.ratings", h("div", { class: "vc-table-wrap" }, h("table", { class: "vc-table vc-table--compact ratings-table" },
      h("tbody", {}, CRITERIA.map((c) => h("tr", {},
        h("th", { scope: "row" }, t(`crit.${c}`)),
        h("td", {}, ratingCells(idea.ratings[c].score)),
        h("td", {}, fill(idea.ratings[c].reason)))))))),
    section("drawer.why", h("p", {}, fill(idea.why))));
}

/** The Ideate step. ctx: { run, lang, picks, onOpen(id), onNext, agentExtra (a live run's note on a repair), unchecked (true when an idea shows Unchecked) }. */
export function renderIdeate(ctx) {
  const { run } = ctx;
  const n = run.ideas.length;
  const cov = run.figures.covered;
  const title = cov.covered === n && cov.of === n ? tn("ideate.title.each", n) : tn("ideate.title", n, { covered: cov.covered, of: cov.of });
  return h("div", { class: "step", dataset: { step: "ideate" } },
    storyPanel(
      ...heading(title, t("ideate.lead")),
      agentLine(ctx.agentExtra ? `${tn("ideate.agent", n)} ${ctx.agentExtra}` : tn("ideate.agent", n)),
      ctx.unchecked ? uncheckedNote() : null,
      h("p", { class: "step-note" }, t("ideate.hint")),
      turnBar({ kind: "next", text: t("ideate.turn"), action: { label: t("ideate.next"), icon: "arrow-right", onClick: ctx.onNext } })),
    evidencePanel(t("ideate.panel"),
      honeycomb(run.ideas, { picks: ctx.picks || [], onOpen: ctx.onOpen }),
      h("p", { class: "step-note comb-note" }, t("ideate.note"))));
}
