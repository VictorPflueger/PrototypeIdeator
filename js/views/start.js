// Step 1, Start, in the simulation: the three fictional companies to choose from, the chosen one's
// documents as chips (kind, size, pages, stand-in), the fictional-company line with the scenario's date,
// and the Your turn bar that starts the replay. The evidence panel explains the four figures and links the
// three challengers. A live run's Start step is js/views/intake.js.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { fmtInt } from "../format.js";
import { heading, turnBar, fictionalLine, storyPanel, evidencePanel, tag, TOOLS } from "./common.js";

/** A file's size in words: "18 KB", "1.2 MB". */
export function sizeText(bytes, lang) {
  if (bytes >= 1024 * 1024) return t("doc.mb", { n: new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) }, lang);
  return t("doc.kb", { n: fmtInt(Math.max(1, Math.round(bytes / 1024)), lang) }, lang);
}

/** A document's name for people: its own title where it has one, the challenger that wrote a handoff
    file, otherwise the file's name without its extension and with spaces for the dashes
    ("Annual-Report-2025.pdf" → "Annual Report 2025"). */
export function docTitle(doc) {
  if (doc.title) return doc.title;
  if (doc.kind === "handoff" && TOOLS[doc.tool]) return TOOLS[doc.tool].name;
  const base = String(doc.name || "").replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[-_]+/g, " ").trim();
  return base || String(doc.name || "");
}

/** A document chip in one row: its title, size and pages, and its tags; the file's name is its tooltip. */
export function documentChip(doc, { lang, href = null } = {}) {
  const meta = [sizeText(doc.bytes, lang), doc.pages ? tn("doc.pages", doc.pages, {}, lang) : null].filter(Boolean).join(" · ");
  const title = docTitle(doc);
  return h("li", { class: "doc-chip", title: doc.name, dataset: { doc: doc.id } },
    h("span", { class: "vc-cell vc-cell--sm doc-chip__cell", "aria-hidden": "true" }, h("span", { class: `vc-icon vc-icon--${doc.kind === "handoff" ? "layers" : "memo"}` })),
    h("span", { class: "doc-chip__title" },
      href ? h("a", { class: "vc-link", href, target: "_blank", rel: "noopener" }, title, h("span", { class: "vc-visually-hidden" }, t("p.newTab"))) : title),
    h("span", { class: "doc-chip__tags" },
      doc.kind === "handoff" ? null : tag(t(`doc.kind.${doc.kind}`, null, lang)),
      doc.stand_in ? tag(t("doc.standIn", null, lang), "honey") : null),
    h("span", { class: "doc-chip__meta" }, meta));
}

/** "No documents yet?" and the three challengers, each opening in a new tab. */
export function challengersBlock() {
  return h("div", { class: "challengers" },
    h("p", { class: "step-note" }, t("p.start.challengers")),
    h("ul", { class: "challenger-links" }, Object.values(TOOLS).map(({ name, url }) => h("li", {}, h("a", { class: "vc-link", href: url, rel: "noopener", target: "_blank" }, h("span", {}, name), h("span", { class: "vc-icon vc-icon--external", "aria-hidden": "true" }), h("span", { class: "vc-visually-hidden" }, t("p.newTab")))))));
}

/** The four figures explained, one line each: the evidence of the simulation's first step. */
export function figuresPanel() {
  const row = (label, text) => h("div", {}, h("dt", {}, t(label)), h("dd", {}, t(text)));
  return evidencePanel(t("p.figures.title"),
    h("dl", { class: "figure-list" },
      row("kpi.atStake.label", "p.figures.atStake"),
      row("kpi.covered.label", "p.figures.covered"),
      row("kpi.top.label", "p.figures.top"),
      row("kpi.cost.label", "p.figures.cost")),
    challengersBlock(),
    h("p", { class: "step-note public-note" }, t("p.public")));
}

/**
 * The Start step of the simulation. ctx: { sc, scenarios, lang, today, idle, onChoose(id), onStart(), onNext() }.
 * At 1280 × 720 everything fits above the Your turn bar: the three companies as one row of buttons, the
 * chosen one's line, its documents in two lines each.
 */
export function renderStart(ctx) {
  const { sc, scenarios, lang, today } = ctx;
  // Vici's segmented control: a radio group, so the arrow keys move between the companies.
  const picker = h("div", { class: "scenario-picker" },
    h("div", { class: "vc-segmented scenario-switch", role: "radiogroup", "aria-label": t("start.choose") }, scenarios.map((x) =>
      h("label", {},
        h("input", { type: "radio", name: "scenario", value: x.id, id: `scenario-${x.id}`, checked: x.id === sc.id || undefined, dataset: { scenario: x.id, action: "choose-scenario" }, on: { change: () => ctx.onChoose(x.id) } }),
        h("span", {}, x.company.name)))),
    h("p", { class: "scenario-pitch" }, sc.pitch[lang]),
    fictionalLine(sc, lang, today));
  const docs = h("ul", { class: "doc-list", "aria-label": t("start.documents") }, sc.documents.map((d) => documentChip(
    { id: d.id, name: d.name[lang], title: d.title ? d.title[lang] : null, kind: d.kind, tool: d.tool, bytes: d.bytes[lang], pages: d.pages ? d.pages[lang] : null, stand_in: d.stand_in },
    { lang, href: d.href ? d.href[lang] : null })));
  const started = !ctx.idle;
  return h("div", { class: "step", dataset: { step: "start" } },
    storyPanel(
      ...heading(t(`scenario.${sc.id}.title`)),
      picker,
      docs,
      turnBar(started
        ? { kind: "next", text: t("start.turn.again"), action: { label: t("start.action.read"), icon: "arrow-right", onClick: ctx.onNext } }
        : { kind: "turn", text: t("start.turn", { count: sc.count }), action: { label: t("start.action"), icon: "play", onClick: ctx.onStart } })),
    figuresPanel());
}
