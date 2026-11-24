// Step 6, Report (brief §9, PLAN.md §11): the whole report beside the story, its pages as light sheets in
// the evidence panel with the HTML file and the ideas file above them, and the Your turn bar with Save as
// PDF, which prints the report alone with its footer on every page, and Write a build brief, which turns a
// shortlisted idea into two blocks for a new Claude project (brief §6.6). After a live run, Save run as
// simulation stands under them as a quiet link (PLAN.md §2, fix 4).

import { h } from "../dom.js";
import { t } from "../i18n/index.js";
import { heading, agentLine, turnBar, storyPanel, uncheckedNote } from "./common.js";

/** The downloads as quiet buttons: the PDF when onPdf is given (a stopped run's bar), the HTML file, the ideas file. */
export function downloadButtons({ onPdf = null, onHtml, onJson }) {
  const quiet = (label, icon, action, onClick) => h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm", dataset: { action }, on: { click: onClick } },
    h("span", { class: `vc-icon vc-icon--${icon}`, "aria-hidden": "true" }), h("span", {}, label));
  return [
    onPdf ? quiet(t("report.pdf"), "download", "download-pdf", onPdf) : null,
    quiet(t("report.html"), "layout", "download-html", onHtml),
    quiet(t("report.json"), "code", "download-json", onJson)
  ].filter(Boolean);
}

/**
 * The Report step. ctx: { run, lang, report (the article js/report_doc.js built), onPdf, onHtml, onJson,
 * onBrief, live } where live, after a live run, is { measured (the run's cost, requests, time and setting in
 * words), cutoff, onSave, unchecked (the Writer's fields), agentExtra }. The Your turn bar holds Save as PDF
 * and Write a build brief, as the brief's 1.1 has it; the HTML file and the ideas file stand above the
 * report they come from.
 */
export function renderReport(ctx) {
  const { live } = ctx;
  const unchecked = live?.unchecked || new Set();
  const brief = h("button", { type: "button", class: "vc-button vc-button--secondary", id: "btn-brief", "aria-haspopup": "dialog", on: { click: ctx.onBrief } },
    h("span", { class: "vc-icon vc-icon--memo", "aria-hidden": "true" }), h("span", {}, t("brief.open")));
  const save = live ? h("button", { type: "button", class: "vc-button vc-button--ghost vc-button--sm save-run", dataset: { action: "save-run" }, on: { click: live.onSave } }, t("report.save")) : null;
  const turn = turnBar({
    kind: "turn",
    inline: true,
    text: t("report.turn"),
    action: { label: t("report.pdf"), icon: "download", onClick: ctx.onPdf },
    actions: [brief],
    extra: [h("p", { class: "turn-hint" }, t("report.pdfHint"))]
  });
  // At 1280 × 720 the story holds the step's words and the bar; what a live run cost and Save run as
  // simulation stand with the report they belong to.
  return h("div", { class: "step", dataset: { step: "report" } },
    storyPanel(
      ...heading(t("report.title"), t("report.lead")),
      agentLine(live?.agentExtra ? `${t("report.agent")} ${live.agentExtra}` : t("report.agent")),
      unchecked.size ? uncheckedNote() : null,
      turn),
    h("section", { class: "panel evidence", "aria-labelledby": "evidence-title" },
      h("div", { class: "panel-head report-head" },
        h("h2", { class: "panel-title", id: "evidence-title" }, t("report.panel")),
        h("div", { class: "turn-downloads report-downloads" }, downloadButtons({ onHtml: ctx.onHtml, onJson: ctx.onJson }), save)),
      live ? h("p", { class: "step-note live-measured" }, live.measured, " ", h("span", { class: "live-cutoff" }, live.cutoff)) : null,
      h("div", { class: "report-view" }, ctx.report)));
}
