// Step 1, Start, in a live run (brief §6.1 and §5.3): Vici's drop zone with the public-information notice
// and where a live run sends the files, each file with its kind, size, pages and any refusal in words, the
// number of ideas (1 to 10), and the optional company, sector, focus and constraints. The Your turn bar's
// Start the agents opens the live-run dialog. Once the agents have read the files, the list stays as it
// was read: another set of files takes a new run, which sets this one aside with Undo.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { LIMITS } from "../config.js";
import { SECTORS } from "../../data/kpis.js";
import { ACCEPT } from "../documents.js";
import { heading, turnBar, storyPanel, evidencePanel, tag, toolShort } from "./common.js";
import { sizeText, challengersBlock } from "./start.js";

/** One file of the intake as a row of the drop zone; once read, without its Remove button. */
function fileRow(f, { lang, onRemove, locked }) {
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
    locked ? null : h("button", { type: "button", class: "vc-icon-button vc-icon-button--sm", "aria-label": t("intake.remove", { name: f.name }), dataset: { action: "remove-file" }, on: { click: () => onRemove(f.id) } },
      h("span", { class: "vc-icon vc-icon--close", "aria-hidden": "true" })));
}

/**
 * The live Start step. ctx: { lang, intake ({ files, problems, ready, handoffOnly } from checkIntake),
 * form ({ count, company, sector, focus, constraints }), reading (none, merges or reader: what reading the
 * files takes, js/live_run.js readingOf), read (the files have been read), undo
 * ({ text, onUndo } after a new run set the last one aside), onFiles(FileList), onRemove(id),
 * onForm(field, value), onStart(), onNext(), onNew(), onBack(), onClear() }.
 */
export function renderIntake(ctx) {
  const { lang, intake, form } = ctx;
  const files = intake.files;
  const locked = !!ctx.read;
  const list = h("ul", { class: "vc-dropzone__files", "aria-live": "polite", "aria-label": t("intake.files") }, [...files].sort((a, b) => (b.refusal ? 1 : 0) - (a.refusal ? 1 : 0)).map((f) => fileRow(f, { lang, onRemove: ctx.onRemove, locked })));
  const notice = h("p", { class: "vc-dropzone__notice" }, h("span", { class: "vc-icon vc-icon--shield", "aria-hidden": "true" }), h("span", {}, t("p.public"), " ", t("intake.where")));
  const zone = locked
    // Read: the files as the agents read them, and the way to another set of files.
    ? h("div", { class: ["vc-dropzone", "intake-zone", "intake-zone--files", "intake-zone--read"] },
      notice,
      list,
      h("div", { class: "intake-new" },
        h("p", { class: "intake-new__text" }, t("intake.locked")),
        h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm", dataset: { action: "new-run" }, on: { click: ctx.onNew } },
          h("span", { class: "vc-icon vc-icon--refresh", "aria-hidden": "true" }), h("span", {}, t("intake.new")))))
    : h("div", {
      class: ["vc-dropzone", "intake-zone", files.length ? "intake-zone--files" : ""], "data-vc-dropzone": "",
      on: { "vc:files": (e) => { e.preventDefault(); ctx.onFiles(e.detail.files); } }
    },
    h("input", { class: "vc-dropzone__input", id: "intake-files", type: "file", multiple: true, accept: ACCEPT }),
    h("label", { class: "vc-dropzone__target", for: "intake-files" },
      h("span", { class: "vc-cell vc-cell--lg vc-cell--lilac", "aria-hidden": "true" }, h("span", { class: "vc-icon vc-icon--upload" })),
      h("span", { class: "vc-dropzone__title" }, t("intake.drop"), " ", h("span", { class: "vc-dropzone__browse" }, t("intake.choose"))),
      h("span", { class: "vc-dropzone__hint" }, t("intake.hint", { files: LIMITS.files }))),
    notice,
    // What came in, in one line that stays in view, and refused files first, so a refusal is never
    // below the fold of the list.
    files.length ? h("p", { class: "intake-summary" }, tn("intake.summary", files.length, { ready: files.filter((f) => !f.refusal).length, refused: files.filter((f) => f.refusal).length })) : null,
    list);

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

  let bar;
  if (locked) bar = turnBar({ kind: "next", text: t("intake.turn.done"), action: { label: t("start.action.read"), icon: "arrow-right", onClick: ctx.onNext } });
  else {
    const ready = files.some((f) => !f.refusal);
    const reason = !ready ? t("intake.reason.empty") : problems[0] || null;
    // One challenger's report reads without any request, so its button says so; anything else needs an
    // agent and opens the live-run dialog first.
    const free = ready && !problems.length && ctx.reading === "none";
    bar = turnBar({ kind: "turn", text: t("intake.turn"), action: { label: t(free ? "intake.read" : "intake.agents"), icon: free ? "layers" : "sparkle", disabled: !!reason, reason, onClick: ctx.onStart } });
  }

  // At 1280 x 720 the drop zone and its files take the story's height and the list scrolls inside it, so
  // the Your turn bar never covers a file; the run's settings sit on the right.
  // Clear everything (brief §5.9): the key, the files, the fields and the run go from the tab. Asked once in
  // place, since it can't be undone, and saying so when a result hasn't been downloaded.
  const clear = h("div", { class: "intake-clear" },
    h("button", { type: "button", class: "vc-button vc-button--ghost vc-button--sm live-clear", id: "btn-clear", dataset: { action: "clear-everything" }, on: { click: ctx.onClear } },
      h("span", { class: "vc-icon vc-icon--trash", "aria-hidden": "true" }),
      h("span", {}, t("live.clear"))),
    h("p", { class: "vc-help" }, t("live.clear.help")));

  return h("div", { class: "step", dataset: { step: "start", mode: "live" } },
    storyPanel(
      ...heading(t("intake.title")),
      ctx.undo ? h("div", { class: "switch-undo", role: "status" }, h("p", { class: "switch-undo__text" }, ctx.undo.text), h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm", dataset: { action: "undo-new" }, on: { click: ctx.undo.onUndo } }, t("start.undo"))) : null,
      zone,
      problems.length && !locked ? h("div", { class: "vc-alert vc-alert--danger intake-problems", role: "alert" }, h("span", { class: "vc-icon vc-icon--error", "aria-hidden": "true" }), h("ul", {}, problems.map((p) => h("li", {}, p)))) : null,
      bar),
    evidencePanel(t("intake.run"), count, optional, challengersBlock(), clear));
}
