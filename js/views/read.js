// Step 2, Read: the issue map (brief §6.2). Each kept issue with what it puts at stake a year, its KPIs
// and where it was found; the issues merged into it sit under it; the person keeps, merges or parks each,
// and a parked issue keeps its reason. The Reader's merge proposals arrive applied and say why, in lilac;
// undoing one keeps both issues. Euros a year that the Reader worked out from a document carry the "AI
// estimate" tag with their basis; a quote from a PDF says that code did not check it (D9).

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { fmtDate } from "../format.js";
import { fmtEurCompact, fmtEurRange } from "../format.js";
import { heading, agentLine, aiNote, turnBar, storyPanel, evidencePanel, tag, toolShort, uncheckedTag } from "./common.js";
import { kindOf } from "../documents.js";

export const PARK_REASONS = ["scope", "handled", "notIssue", "uncertain"];

/**
 * An issue's euros a year as a cell: the expected value, its range, and the AI tag for an estimate. A kept
 * issue counts at its group's value (D15), also when that is a merged member's and it states none itself
 * (review B2); counted is the issue whose value that is.
 */
function stakeCell(issue, groupValue, lang, counted = issue) {
  const own = typeof issue.eur_year_expected === "number";
  if (!own && groupValue === null) {
    return h("td", { class: "vc-num stake-cell stake-cell--none" }, h("span", { class: "muted" }, t("read.notStated")), issue.money_as_stated ? h("span", { class: "stake-stated" }, issue.money_as_stated) : null);
  }
  // A group counts once, at its largest value; the range shown is the issue's own, so it goes when the
  // group's value is another issue's.
  const fromGroup = groupValue !== null && groupValue !== issue.eur_year_expected;
  const from = fromGroup ? counted : issue;
  return h("td", { class: "vc-num stake-cell" },
    h("strong", {}, fmtEurCompact(groupValue ?? issue.eur_year_expected, lang)),
    fromGroup ? h("span", { class: "stake-sub" }, t("read.largest")) : null,
    !fromGroup && typeof issue.eur_year_low === "number" ? h("span", { class: "stake-sub" }, fmtEurRange(issue.eur_year_low, issue.eur_year_high, lang)) : null,
    !own && issue.money_as_stated ? h("span", { class: "stake-stated" }, issue.money_as_stated) : null,
    from.estimate ? h("span", { class: "vc-tag vc-tag--feature vc-tag--sm ai-tag", title: from.eur_basis || "" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), t("read.aiEstimate")) : null);
}

/** The issue whose expected euros a kept issue's group counts at: the largest among it and its members. */
function countedIn(issue, issues) {
  const members = [issue, ...issues.filter((x) => x.status === "merged" && x.merged_into === issue.id)];
  return members.filter((m) => typeof m.eur_year_expected === "number").sort((a, b) => b.eur_year_expected - a.eur_year_expected)[0] || issue;
}

/** Where an issue was found: the challenger, or the document and page with the quote. */
function foundCell(issue) {
  // A challenger's issue: its short tag ("Canvas"); the full name goes to screen readers and the tooltip.
  if (issue.source?.kind === "handoff") {
    const name = issue.source.tool.name;
    return h("span", { class: "found" }, h("span", { class: "vc-tag vc-tag--sm", title: name }, toolShort(issue.source.tool.type), h("span", { class: "vc-visually-hidden" }, `, ${name}`)));
  }
  const q = issue.quotes?.[0];
  // The document's own kind, from its name: a Markdown or CSV file is not a PDF (review A7).
  const kind = kindOf(q?.file || issue.source?.file || "", "");
  return h("span", { class: "found" },
    kind !== "unknown" ? tag(t(`doc.kind.${kind}`)) : null,
    q ? h("span", { class: "found-text" }, q.where) : null,
    q ? h("q", { class: "found-quote" }, q.text) : null,
    q && q.checked === "not-checked" ? h("span", { class: "found-check" }, t("read.notChecked")) : null);
}

/**
 * A title short enough for the merge target's select, which can't wrap: cut at a word, with an ellipsis,
 * rather than mid-word by the select's edge (review B6). The option's title holds the whole.
 */
export function shortTitle(text, max = 26) {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1).replace(/\s+\S*$/u, "").replace(/[\s,;:.\u2013\u2014-]+$/u, "");
  return `${cut || s.slice(0, max)}\u2026`;
}

/** Keep, Merge or Park, with the issue to merge into or the reason for parking. */
function decisionCell(issue, { kept, onDecide, label }) {
  const status = issue.status;
  const buttons = [["keep", "read.keep"], ["merge", "read.merge"], ["park", "read.park"]].map(([action, key]) => h("button", {
    type: "button",
    class: ["vc-button", "vc-button--secondary", "vc-button--sm", "decide-btn", status === (action === "keep" ? "kept" : action === "merge" ? "merged" : "parked") ? "is-on" : ""],
    "aria-pressed": String(status === (action === "keep" ? "kept" : action === "merge" ? "merged" : "parked")),
    dataset: { action: `decide-${action}` },
    disabled: action === "merge" && !kept.some((k) => k.id !== issue.id) ? true : undefined,
    on: {
      click: () => {
        if (action === "merge") {
          const into = kept.find((k) => k.id !== issue.id);
          if (into && status !== "merged") onDecide(issue.id, "merge", { into: into.id });
        } else if (action === "park") {
          if (status !== "parked") onDecide(issue.id, "park", { reason: t(`read.reason.${PARK_REASONS[0]}`) });
        } else onDecide(issue.id, "keep");
      }
    }
  }, t(key)));
  let detail = null;
  if (status === "merged") {
    detail = h("label", { class: "decide-detail" }, h("span", { class: "vc-visually-hidden" }, t("read.into")), h("select", {
      class: "vc-select vc-select--sm",
      dataset: { action: "decide-into" },
      on: { change: (e) => onDecide(issue.id, "merge", { into: e.target.value }) }
    }, kept.filter((k) => k.id !== issue.id).map((k) => h("option", { value: k.id, title: k.title, selected: k.id === issue.merged_into ? true : undefined }, shortTitle(k.title)))));
  } else if (status === "parked") {
    const current = PARK_REASONS.find((r) => t(`read.reason.${r}`) === issue.park_reason) || PARK_REASONS[0];
    detail = h("label", { class: "decide-detail" }, h("span", { class: "vc-visually-hidden" }, t("read.why")), h("select", {
      class: "vc-select vc-select--sm",
      dataset: { action: "decide-reason" },
      on: { change: (e) => onDecide(issue.id, "park", { reason: t(`read.reason.${e.target.value}`) }) }
    }, PARK_REASONS.map((r) => h("option", { value: r, selected: r === current ? true : undefined }, t(`read.reason.${r}`)))));
  }
  return h("td", { class: "decide-cell" }, h("div", { class: "decide-group", role: "group", "aria-label": label }, buttons), detail);
}

/**
 * The issue map as a table. issues: the run's issues with their status; proposals: the Reader's merges;
 * groupValueOf(id): a kept issue's value counting its merged members once (D15); onDecide(id, action, opts).
 */
export function issueTable({ issues, proposals, groupValueOf, onDecide, lang, unchecked = null }) {
  const kept = issues.filter((i) => i.status === "kept");
  const why = new Map(proposals.flatMap((p) => p.merged.map((id) => [id, { keep: p.keep, why: p.why }])));
  const rows = [];
  const order = [...issues.filter((i) => i.status !== "merged"), ...issues.filter((i) => i.status === "merged" && !issues.some((k) => k.id === i.merged_into && k.status === "kept"))];
  for (const issue of order) {
    rows.push(row(issue, false));
    for (const m of issues.filter((x) => x.status === "merged" && x.merged_into === issue.id)) rows.push(row(m, true));
  }
  function row(issue, member) {
    const proposed = why.get(issue.id);
    const into = issue.status === "merged" ? issues.find((k) => k.id === issue.merged_into) : null;
    const kpis = (issue.kpis || []).map((k) => (k.today ? `${k.name}: ${k.today}` : k.name)).join(" · ");
    return h("tr", { class: ["issue-row", `issue-row--${issue.status}`, member ? "issue-row--member" : ""], dataset: { issue: issue.id } },
      h("th", { scope: "row", class: "issue-cell" },
        h("span", { class: "issue-title" }, issue.title, unchecked && unchecked.has(issue.id) ? uncheckedTag() : null),
        // One line of context under the title: where it was found, its area and the KPIs it names.
        h("span", { class: "issue-meta" }, foundCell(issue), issue.area ? h("span", { class: "issue-area" }, issue.area) : null,
          kpis ? h("span", { class: "issue-kpis" }, h("span", { class: "issue-kpis__label" }, t("read.kpis")), kpis) : null),
        // A merged issue drawn under the issue it joined needs no words to say so; one listed apart does.
        issue.status === "merged" && into && !member ? h("span", { class: "issue-status" }, t("read.mergedInto", { title: into.title })) : null,
        issue.status === "merged" && proposed && proposed.keep === issue.merged_into ? h("span", { class: "issue-why" }, h("span", { class: "vc-tag vc-tag--feature vc-tag--sm ai-tag" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), t("ai.tag")), proposed.why) : null,
        issue.status === "parked" ? h("span", { class: "issue-status" }, t("read.parkedBecause", { reason: issue.park_reason || t("read.reason.scope") })) : null),
      issue.status === "kept" ? stakeCell(issue, groupValueOf(issue.id), lang, countedIn(issue, issues)) : stakeCell(issue, null, lang),
      decisionCell(issue, { kept, onDecide, label: t("read.decisionFor", { title: issue.title }) }));
  }
  return h("div", { class: "vc-table-wrap issue-wrap" },
    h("table", { class: "vc-table vc-table--compact issue-table" },
      h("caption", { class: "vc-visually-hidden" }, t("read.caption")),
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, t("read.col.issue")),
        h("th", { scope: "col", class: "vc-num" }, t("read.col.stake")),
        h("th", { scope: "col" }, t("read.col.decision")))),
      h("tbody", {}, rows)));
}

/** The sources the issues cite, with the date each was read. */
export function sourceList(issues, lang) {
  const seen = new Map();
  for (const i of issues) for (const e of i.evidence || []) if (!seen.has(e.url)) seen.set(e.url, e);
  if (!seen.size) return null;
  return h("details", { class: "sources" },
    h("summary", {}, h("span", { class: "vc-icon vc-icon--chevron-right summary-chevron", "aria-hidden": "true" }), tn("read.sources", seen.size)),
    h("ul", { class: "source-list" }, [...seen.values()].map((e) => h("li", {},
      h("a", { class: "vc-link", href: e.url, rel: "noopener", target: "_blank" }, e.title, h("span", { class: "vc-visually-hidden" }, t("p.newTab"))),
      h("span", { class: "source-date" }, t("read.readOn", { date: fmtDate(e.read_on, lang) }))))));
}

/**
 * The Read step. ctx: { run (issues, proposals, documents, figures), lang, ideated, onDecide, onIdeas,
 * onNext, groupValueOf, agentText, unchecked (a live run's issue ids whose texts the fact audit refused
 * twice) }.
 */
export function renderRead(ctx) {
  const { run, lang } = ctx;
  const all = run.issues.length;
  const kept = run.issues.filter((i) => i.status === "kept").length;
  const merged = run.issues.filter((i) => i.status === "merged").length;
  const parked = run.issues.filter((i) => i.status === "parked").length;
  const title = ctx.ideated ? tn("read.title.done", kept, { merged, parked }) : tn("read.title", all);
  const lead = ctx.ideated ? t("read.lead.done") : run.proposals.length ? tn("read.lead", run.proposals.length) : t("read.lead.none");
  const action = { label: t("read.action"), icon: "sparkle", onClick: ctx.onIdeas };
  return h("div", { class: "step", dataset: { step: "read" } },
    storyPanel(
      ...heading(title, lead),
      agentLine(ctx.agentText),
      ctx.ideated
        ? turnBar({ kind: "next", text: t("read.turn.after"), action: { label: t("read.next"), icon: "arrow-right", onClick: ctx.onNext } })
        : turnBar({ kind: "turn", text: t("read.turn"), action })),
    evidencePanel(t("read.panel"),
      issueTable({ issues: run.issues, proposals: run.proposals, groupValueOf: ctx.groupValueOf, onDecide: ctx.onDecide, lang, unchecked: ctx.unchecked }),
      // Where the Reader wrote issues from documents, their words are the AI's too (review B11).
      run.issues.some((i) => i.type === "document") ? aiNote(t("read.aiNote")) : null,
      sourceList(run.issues, lang)));
}
