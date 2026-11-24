// Step 5, Shortlist (brief §6.5): the engine's top three arrive preselected; the person ranks a top
// three (3, 2 and 1 points, as on the vote sheet) or keeps one idea, then lets the Writer write the report.
// Any shortlist works: the recommendation is assembled by code from the ideas picked.

import { h } from "../dom.js";
import { t, tn } from "../i18n/index.js";
import { fmtScore } from "../format.js";
import { heading, turnBar, storyPanel, evidencePanel, namesOf } from "./common.js";

/** The shortlist after putting an idea at a place (1 to 3), or taking it off (place 0). */
export function placeIdea(picks, id, place) {
  const slots = [picks[0] ?? null, picks[1] ?? null, picks[2] ?? null];
  const from = slots.indexOf(id);
  if (from >= 0) slots[from] = null;
  if (place >= 1 && place <= 3) {
    const there = slots[place - 1];
    slots[place - 1] = id;
    if (there && there !== id && from >= 0) slots[from] = there;
  }
  // Places close up: a second without a first moves up.
  return slots.filter(Boolean);
}

/** The Shortlist step. ctx: { run, lang, picks, decided, onPlace(id, place), onWrite, onNext }. */
export function renderShortlist(ctx) {
  const { run, lang } = ctx;
  const names = namesOf(run);
  const picks = ctx.picks;
  const first = picks[0] ? names.ideaName(picks[0]) : "";
  const title = ctx.decided ? tn("short.title.done", picks.length, { name: first }) : t("short.title");
  const lead = ctx.decided ? t("short.lead.done") : t("short.lead");
  const summary = h("ol", { class: "pick-summary", "aria-label": t("short.yours") }, [0, 1, 2].map((k) => h("li", { class: picks[k] ? "" : "is-empty" },
    h("span", { class: "pick-place" }, t("short.placeLong", { n: k + 1 })),
    h("span", { class: "pick-name" }, picks[k] ? names.ideaName(picks[k]) : t("short.open")),
    h("span", { class: "pick-points" }, tn("short.points", 3 - k)))));
  // The ideas as a table, by score: rank, name (opens its page), the issue it answers, the score and the
  // three place buttons. A table keeps all of them in view on a projector.
  const table = h("div", { class: "vc-table-wrap pick-wrap" },
    h("table", { class: "vc-table vc-table--compact pick-table" },
      h("caption", { class: "vc-visually-hidden" }, t("short.caption")),
      h("thead", {}, h("tr", {},
        h("th", { scope: "col", class: "vc-num" }, t("score.col.rank")),
        h("th", { scope: "col" }, t("score.col.idea")),
        h("th", { scope: "col", class: "vc-num" }, t("score.col.score")),
        h("th", { scope: "col" }, t("short.col.place")))),
      h("tbody", {}, run.ranked.map((r) => {
        const idea = run.ideas.find((i) => i.id === r.id);
        const place = picks.indexOf(r.id) + 1;
        const issue = names.keptOf(idea.issues[0]) || names.issue(idea.issues[0]);
        return h("tr", { class: place ? "is-pick" : "", dataset: { idea: r.id } },
          h("td", { class: "vc-num" }, String(r.rank)),
          h("th", { scope: "row", class: "pick-idea" },
            h("button", { type: "button", class: "link-button", dataset: { action: "open-idea" }, on: { click: () => ctx.onOpen(r.id) } }, idea.name),
            issue ? h("span", { class: "pick-issue" }, t("short.answers", { title: issue.title })) : null),
          h("td", { class: "vc-num" }, h("strong", {}, fmtScore(r.value, lang))),
          h("td", { class: "place-cell" },
            h("div", { class: "place-group", role: "group", "aria-label": t("short.placeFor", { name: idea.name }) },
              [1, 2, 3].map((p) => h("button", {
                type: "button",
                class: ["vc-button", "vc-button--secondary", "place-btn", place === p ? "is-on" : ""],
                "aria-pressed": String(place === p),
                dataset: { action: "place", place: String(p) },
                on: { click: () => ctx.onPlace(r.id, place === p ? 0 : p) }
              }, t("short.placeShort", { n: p }))))));
      }))));
  const action = ctx.decided
    ? turnBar({ kind: "next", text: t("short.turn.after"), action: { label: t("short.next"), icon: "arrow-right", onClick: ctx.onNext } })
    : turnBar({ kind: "decision", text: t("short.turn"), action: { label: t("short.action"), icon: "memo", disabled: !picks.length, reason: picks.length ? null : t("short.none"), onClick: ctx.onWrite } });
  return h("div", { class: "step", dataset: { step: "shortlist" } },
    storyPanel(...heading(title, lead), summary, action),
    evidencePanel(t("short.panel"), table));
}
