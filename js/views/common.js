// What every step's view shares: the title and lead the reading time is measured on, the lilac line that
// says what an agent did, the Your turn bar with the step's one primary action, the fictional-company
// line with the scenario's date, and names for ids, so no record id ever reaches the screen.

import { h } from "../dom.js";
import { t, getLang } from "../i18n/index.js";
import { fmtDate } from "../format.js";
import { ageInDays, STALE_AFTER_DAYS } from "../scenarios.js";

/** The step's title (focused on arrival) and its lead; both count towards Play's reading time. */
export function heading(title, lead) {
  return [
    h("h1", { class: "step-title", id: "step-title", tabindex: "-1", "data-read": "" }, title),
    lead ? h("p", { class: "step-lead", "data-read": "" }, lead) : null
  ];
}

/** One sentence on what an agent did, in lilac with the AI tag: what the AI wrote or suggested. */
export function agentLine(text) {
  return h("p", { class: "agent-line", "data-read": "" },
    h("span", { class: "vc-tag vc-tag--feature vc-tag--sm ai-tag" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), t("ai.tag")),
    h("span", {}, text));
}

const TURN_TITLES = { turn: "turn.yours", decision: "turn.decision", next: "turn.next", busy: "turn.busy", stopped: "turn.stopped" };
const TURN_ICONS = { turn: "hand", decision: "hand", next: "arrow-right", stopped: "warning" };

/**
 * The Your turn bar: the one primary action of the step, where the eye is. kind: "turn" (your turn),
 * "decision" (your decision), "next" (the story goes on), "busy" (an agent is working: lilac, with Stop)
 * or "stopped" (a live run stopped: honey, with what to do next). action: { label, icon, onClick,
 * disabled, reason, secondary }. actions: the other ways on, quiet buttons beside the action in a
 * stopped bar or an inline one, whose text takes the bar's whole width. extra: what goes under the text.
 */
export function turnBar({ kind = "turn", text, action, actions = [], extra = null, inline = false }) {
  const title = t(TURN_TITLES[kind] || TURN_TITLES.turn);
  const button = h("button", {
    type: "button",
    class: ["vc-button", action.secondary ? "vc-button--secondary" : "", "cta", ["turn", "decision", "stopped"].includes(kind) ? "vc-attention" : ""],
    id: "btn-cta",
    disabled: action.disabled || undefined,
    "aria-describedby": action.reason ? "cta-reason" : undefined,
    on: { click: () => { if (!action.disabled) action.onClick(); } }
  }, action.icon ? h("span", { class: `vc-icon vc-icon--${action.icon}`, "aria-hidden": "true" }) : null, h("span", {}, action.label));
  const cell = kind === "busy"
    ? h("span", { class: "vc-callout__cell", "aria-hidden": "true" }, h("span", { class: "vc-spinner vc-spinner--sm turn-spinner" }))
    : h("span", { class: "vc-callout__cell", "aria-hidden": "true" }, h("span", { class: `vc-icon vc-icon--${TURN_ICONS[kind] || "hand"}` }));
  const stopped = kind === "stopped";
  const within = stopped || inline;
  return h("div", { class: ["vc-callout", kind === "busy" ? "vc-callout--ai" : stopped ? "vc-callout--caution" : "", "turn-bar", `turn-bar--${kind}`, inline ? "turn-bar--inline" : ""], id: "turn", "aria-busy": kind === "busy" ? "true" : undefined },
    cell,
    h("div", { class: "vc-callout__body" },
      h("p", { class: "vc-callout__title" }, title),
      text ? h("p", { class: "turn-text" }, text) : null,
      action.reason ? h("p", { class: "turn-reason", id: "cta-reason" }, action.reason) : null,
      h("p", { class: "foot-note", id: "foot-note", "aria-live": "off" }),
      within ? h("div", { class: "turn-actions" }, button, ...actions) : null,
      extra),
    within ? null : button);
}

/** "Fictional company, illustrative figures", the scenario's date and, after 90 days, Check for updates. */
export function fictionalLine(sc, lang, today) {
  const stale = ageInDays(sc.as_of, today) > STALE_AFTER_DAYS;
  return h("p", { class: "fiction-line" },
    h("span", { class: "vc-tag vc-tag--sm fiction-tag" }, t("fiction.tag")),
    h("span", {}, t("fiction.asOf", { date: fmtDate(sc.as_of, lang) })),
    stale ? h("a", { class: "vc-link stale-link", href: "https://github.com/VictorPflueger/PrototypeIdeator/blob/main/DATA_SOURCES.md", rel: "noopener", target: "_blank" }, t("fiction.update"), h("span", { class: "vc-visually-hidden" }, t("p.newTab"))) : null);
}

/**
 * "Unchecked": a text the fact audit refused twice, shown rather than hidden (brief §5.10), with why in
 * its tooltip and for screen readers.
 */
export function uncheckedTag(lang = getLang()) {
  return h("span", { class: "vc-tag vc-tag--sm vc-tag--warning unchecked-tag", title: t("live.unchecked.why", null, lang) },
    h("span", { class: "vc-icon vc-icon--warning", "aria-hidden": "true" }), t("live.unchecked", null, lang),
    h("span", { class: "vc-visually-hidden" }, `: ${t("live.unchecked.why", null, lang)}`));
}

/** The visible line that says why a tag reads Unchecked, once per step (or report) that shows one. */
export function uncheckedNote(lang = getLang()) {
  return h("p", { class: "step-note unchecked-note" }, uncheckedTag(lang), h("span", {}, t("live.unchecked.why", null, lang)));
}

/** A small tag: the tone is a Vici tag modifier (feature for AI, neutral otherwise). */
export function tag(text, tone = "", icon = "") {
  return h("span", { class: ["vc-tag", "vc-tag--sm", tone ? `vc-tag--${tone}` : ""] }, icon ? h("span", { class: `vc-icon vc-icon--${icon}`, "aria-hidden": "true" }) : null, text);
}

/** The panel on the right: a title and its content. */
export function evidencePanel(titleText, ...children) {
  return h("section", { class: "panel evidence", "aria-labelledby": "evidence-title" },
    h("h2", { class: "panel-title", id: "evidence-title" }, titleText),
    ...children);
}

/** The panel on the left: the story, ending with the Your turn bar. */
export function storyPanel(...children) {
  return h("section", { class: "panel story", "aria-labelledby": "step-title" }, ...children);
}

/** Names for ids: an issue's title, an idea's name; ids stay in data attributes, never on screen. */
export function namesOf(run) {
  const issue = new Map(run.issues.map((i) => [i.id, i]));
  const idea = new Map(run.ideas.map((i) => [i.id, i]));
  return {
    issue: (id) => issue.get(id) || null,
    issueTitle: (id) => issue.get(id)?.title || "",
    idea: (id) => idea.get(id) || null,
    ideaName: (id) => idea.get(id)?.name || "",
    /** The kept issue an id counts for. */
    keptOf: (id) => {
      const i = issue.get(id);
      if (!i) return null;
      if (i.status === "kept") return i;
      if (i.status === "merged") return issue.get(i.merged_into) || null;
      return null;
    }
  };
}

/** The challenger that wrote an issue, or the document it came from, in words. */
export function sourceOf(issue) {
  if (issue.source?.kind === "handoff") return issue.source.tool?.name || t("doc.handoff");
  return issue.source?.file || t("doc.document");
}

/** The short name of a challenger for chips: Canvas, SWOT, PESTEL. */
export function toolShort(type) {
  return t(`tool.${type}`);
}

/** The three challengers by their product names, which stay English in both languages, and their sites. */
export const TOOLS = {
  bmc: { name: "Business Model Canvas Challenger", url: "https://victorpflueger.github.io/BMC-challenger/" },
  swot: { name: "SWOT Challenger", url: "https://victorpflueger.github.io/SWOT-challenger/" },
  pestel: { name: "PESTEL Challenger", url: "https://victorpflueger.github.io/PESTEL-challenger/" }
};
