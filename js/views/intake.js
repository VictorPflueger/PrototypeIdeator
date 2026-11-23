// Step 1, Start, in a live run (brief §6.1): Vici's drop zone with the public-information notice and where
// a live run sends the files, each file with its kind, size, pages and any refusal in words, the number of
// ideas (1 to 10), and the optional company, sector, focus and constraints. A challenger's report reads at
// once, without any request; the agents that read documents run from version 0.3.0, which the Your turn
// bar says instead of pretending to start them.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { LIMITS } from "../config.js";
import { SECTORS } from "../../data/kpis.js";
import { ACCEPT } from "../documents.js";
import { heading, turnBar, storyPanel, evidencePanel, tag, toolShort } from "./common.js";
import { sizeText, challengersBlock } from "./start.js";

/** One file of the intake as a row of the drop zone. */
function fileRow(f, { lang, onRemove }) {
  const kind = f.handoff ? t("doc.kind.handoff") : t(`doc.kind.${f.kind}`);
  const standIn = f.handoff && /stand-in|platzhalter/i.test(f.json?.disclaimer || "");
  const meta = [kind, sizeText(f.bytes, lang), f.pages ? tn("doc.pages", f.pages) : null, f.handoff ? tn("intake.issues", f.handoff.issues.length) : null].filter(Boolean).join(" · ");
  const refused = f.refusal ? t(`intake.refused.${f.refusal.code}`, { detail: f.refusal.detail || "" }) : null;
  const errId = `file-err-${f.id}`;
  return h("li", { class: "vc-dropzone__file", dataset: { state: refused ? "refused" : standIn ? "warning" : undefined, file: f.id } },
    h("span", { class: `vc-icon vc-icon--${f.handoff ? "layers" : "memo"}`, "aria-hidden": "true" }),
    h("span", { class: "vc-dropzone__body" },
      h("span", { class: "vc-dropzone__name" }, f.name),
      h("span", { class: "vc-dropzone__meta" }, h("span", {}, meta), f.handoff ? tag(toolShort(f.handoff.tool.type)) : null, standIn ? tag(t("doc.standIn"), "honey") : null),
      refused ? h("span", { class: "vc-dropzone__error", id: errId }, h("span", { class: "vc-icon vc-icon--error", "aria-hidden": "true" }), refused) : null,
      !refused && standIn ? h("span", { class: "vc-dropzone__error", id: errId }, h("span", { class: "vc-icon vc-icon--warning", "aria-hidden": "true" }), t("intake.standIn")) : null),
    h("button", { type: "button", class: "vc-icon-button vc-icon-button--sm", "aria-label": t("intake.remove", { name: f.name }), dataset: { action: "remove-file" }, on: { click: () => onRemove(f.id) } },
      h("span", { class: "vc-icon vc-icon--close", "aria-hidden": "true" })));
}

/**
 * The live Start step. ctx: { lang, intake ({ files, problems, ready, handoffOnly } from checkIntake),
 * form ({ count, company, sector, focus, constraints }), onFiles(FileList), onRemove(id), onForm(field,
 * value), onRead(), onBack() }.
 */
export function renderIntake(ctx) {
  const { lang, intake, form } = ctx;
  const files = intake.files;
  const zone = h("div", {
    class: ["vc-dropzone", "intake-zone", files.length ? "intake-zone--files" : ""], "data-vc-dropzone": "",
    on: { "vc:files": (e) => { e.preventDefault(); ctx.onFiles(e.detail.files); } }
  },
  h("input", { class: "vc-dropzone__input", id: "intake-files", type: "file", multiple: true, accept: ACCEPT }),
  h("label", { class: "vc-dropzone__target", for: "intake-files" },
    h("span", { class: "vc-cell vc-cell--lg vc-cell--lilac", "aria-hidden": "true" }, h("span", { class: "vc-icon vc-icon--upload" })),
    h("span", { class: "vc-dropzone__title" }, t("intake.drop"), " ", h("span", { class: "vc-dropzone__browse" }, t("intake.choose"))),
    h("span", { class: "vc-dropzone__hint" }, t("intake.hint", { files: LIMITS.files }))),
  h("p", { class: "vc-dropzone__notice" }, h("span", { class: "vc-icon vc-icon--shield", "aria-hidden": "true" }), h("span", {}, t("p.public"), " ", t("intake.where"))),
  // What came in, in one line that stays in view, and refused files first, so a refusal is never
  // below the fold of the list.
  files.length ? h("p", { class: "intake-summary" }, tn("intake.summary", files.length, { ready: files.filter((f) => !f.refusal).length, refused: files.filter((f) => f.refusal).length })) : null,
  h("ul", { class: "vc-dropzone__files", "aria-live": "polite", "aria-label": t("intake.files") }, [...files].sort((a, b) => (b.refusal ? 1 : 0) - (a.refusal ? 1 : 0)).map((f) => fileRow(f, { lang, onRemove: ctx.onRemove }))));

  const problems = intake.problems.map((p) => t(`intake.problem.${p.code}`, p));
  const count = h("div", { class: "vc-field count-field" },
    h("label", { class: "vc-label", for: "intake-count" }, t("intake.count")),
    h("select", { class: "vc-select", id: "intake-count", dataset: { action: "count" }, on: { change: (e) => ctx.onForm("count", Number(e.target.value)) } },
      Array.from({ length: LIMITS.ideasMax }, (_, k) => k + 1).map((n) => h("option", { value: String(n), selected: n === form.count ? true : undefined }, String(n)))),
    h("p", { class: "vc-help" }, t("intake.countHelp", { max: LIMITS.ideasMax })));
  const field = (key, input) => h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: `intake-${key}` }, t(`intake.${key}`), h("span", { class: "vc-label__hint" }, t("intake.optional"))), input);
  const optional = h("details", { class: "intake-more" },
    h("summary", {}, h("span", { class: "vc-icon vc-icon--chevron-right summary-chevron", "aria-hidden": "true" }), t("intake.more")),
    h("div", { class: "intake-fields" },
      h("p", { class: "step-note public-note" }, t("p.public")),
      field("company", h("input", { class: "vc-input", id: "intake-company", value: form.company, autocomplete: "off", on: { input: (e) => ctx.onForm("company", e.target.value) } })),
      field("sector", h("select", { class: "vc-select", id: "intake-sector", on: { change: (e) => ctx.onForm("sector", e.target.value) } },
        h("option", { value: "" }, t("intake.sectorAny")),
        SECTORS.filter((s) => s.id !== "general").map((s) => h("option", { value: s.id, selected: s.id === form.sector ? true : undefined }, s.name[lang] || s.name.en)))),
      field("focus", h("input", { class: "vc-input", id: "intake-focus", value: form.focus, autocomplete: "off", on: { input: (e) => ctx.onForm("focus", e.target.value) } })),
      field("constraints", h("textarea", { class: "vc-textarea", id: "intake-constraints", rows: "2", on: { input: (e) => ctx.onForm("constraints", e.target.value) } }, form.constraints))));

  const needsReader = files.some((f) => !f.refusal && !f.handoff);
  let action;
  if (!files.some((f) => !f.refusal)) action = { label: t("intake.read"), icon: "layers", disabled: true, reason: t("intake.reason.empty"), onClick: () => {} };
  else if (problems.length) action = { label: t("intake.read"), icon: "layers", disabled: true, reason: problems[0], onClick: () => {} };
  else if (needsReader) action = { label: t("intake.agents"), icon: "sparkle", disabled: true, reason: t("intake.reason.later"), onClick: () => {} };
  else action = { label: t("intake.read"), icon: "layers", onClick: ctx.onRead };

  // At 1280 x 720 the drop zone and its files take the story's height and the list scrolls inside it, so
  // the Your turn bar never covers a file; the run's settings sit on the right.
  return h("div", { class: "step", dataset: { step: "start", mode: "live" } },
    storyPanel(
      ...heading(t("intake.title")),
      zone,
      problems.length ? h("div", { class: "vc-alert vc-alert--danger intake-problems", role: "alert" }, h("span", { class: "vc-icon vc-icon--error", "aria-hidden": "true" }), h("ul", {}, problems.map((p) => h("li", {}, p)))) : null,
      turnBar({ kind: "turn", text: t("intake.turn"), action })),
    evidencePanel(t("intake.run"), count, optional, challengersBlock()));
}
