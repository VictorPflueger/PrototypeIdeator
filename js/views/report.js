// Step 6, Report: the report's short version (brief §9.1, page 2). The Writer wrote the headline, what was
// looked at, what was found and what is needed, every figure a placeholder that code fills; code writes
// what is recommended from the shortlist, each idea with its score, its reason and what one live run would
// cost, so any shortlist reads right. The whole report with its PDF, HTML and JSON downloads comes with
// version 0.4.0.

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { fmtScore, fmtEur, fmtInt } from "../format.js";
import { renderFacts } from "../facts.js";
import { heading, agentLine, turnBar, storyPanel, evidencePanel, uncheckedTag, uncheckedNote } from "./common.js";

/** The short version of the report, as its second page will carry it. unchecked: the Writer's texts the fact audit refused twice. */
export function shortVersion(run, lang, unchecked = new Set()) {
  const rec = run.recommendation;
  const sources = new Set(run.issues.flatMap((i) => (i.evidence || []).map((e) => e.url).concat((i.quotes || []).map((q) => `${q.file}|${q.where}`)))).size;
  const stat = (label, value) => h("div", { class: "vc-stat report-stat" }, h("p", { class: "vc-stat__label" }, label), h("p", { class: "vc-stat__value" }, value));
  const ai = h("span", { class: "vc-tag vc-tag--feature vc-tag--sm ai-tag" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), t("ai.tag"));
  const mark = (field) => (unchecked.has(field) ? uncheckedTag() : null);
  const block = (key, text, field) => h("section", { class: "report-block" }, h("h3", { class: "report-h" }, t(key), ai.cloneNode(true), mark(field)), h("p", {}, text));
  return h("article", { class: "report-page" },
    h("p", { class: "report-kicker" }, t("report.kicker")),
    h("h2", { class: "report-headline" }, rec.headline, ai.cloneNode(true), mark("headline")),
    h("div", { class: "report-stats" },
      stat(t("report.stat.issues"), fmtInt(run.figures.covered.of, lang)),
      stat(t("report.stat.ideas"), fmtInt(run.ideas.length, lang)),
      stat(t("report.stat.sources"), fmtInt(sources, lang)),
      stat(t("report.stat.top"), fmtScore(run.figures.top.value, lang))),
    block("report.lookedAt", rec.looked_at, "looked_at"),
    block("report.found", rec.found, "found"),
    h("section", { class: "report-block" },
      h("h3", { class: "report-h" }, t("report.recommend"), h("span", { class: "vc-tag vc-tag--sm" }, t("report.byCode"))),
      h("ol", { class: "report-picks" }, run.recommended.map((p) => h("li", {},
        h("p", { class: "report-pick__head" }, h("strong", {}, p.name), h("span", {}, t("report.pickLine", { score: fmtScore(p.value, lang), rank: p.rank }))),
        h("p", {}, renderFacts(p.why, run.facts, lang)),
        h("p", { class: "muted" }, t("report.pickCost", { cost: fmtEur(p.cost, lang) })))))),
    block("report.needed", rec.needed, "needed"),
    h("p", { class: "report-foot" }, t("report.public")));
}

/**
 * The Report step. ctx: { run, lang, onAnother, live }: live, after a live run, is { measured (the run's
 * cost, requests, time and setting in words), cutoff, onSave, unchecked (the Writer's fields), agentExtra };
 * its Your turn bar saves the run as a simulation instead of trying another company.
 */
export function renderReport(ctx) {
  const { run, lang, live } = ctx;
  const unchecked = live?.unchecked || new Set();
  const turn = live
    ? turnBar({ kind: "turn", text: t("report.turn.live"), action: { label: t("report.save"), icon: "download", onClick: live.onSave } })
    : turnBar({ kind: "turn", text: t("report.turn"), action: { label: t("report.action"), icon: "refresh", onClick: ctx.onAnother } });
  return h("div", { class: "step", dataset: { step: "report" } },
    storyPanel(
      ...heading(t("report.title")),
      agentLine(live?.agentExtra ? `${t("report.agent")} ${live.agentExtra}` : t("report.agent")),
      unchecked.size ? uncheckedNote() : null,
      live ? h("p", { class: "step-note live-measured" }, live.measured, " ", h("span", { class: "live-cutoff" }, live.cutoff)) : null,
      turn),
    // What this page is, above it: the report's second page, the whole report with its downloads to come.
    evidencePanel(t("report.panel"),
      h("p", { class: "vc-alert vc-alert--neutral version-note", role: "note" }, h("span", { class: "vc-icon vc-icon--info", "aria-hidden": "true" }), h("span", {}, t("report.later"))),
      shortVersion(run, lang, unchecked)));
}
