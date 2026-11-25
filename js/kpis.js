// The four key figures, top right (brief §1.2, AC-07). They answer first: in the simulation every tile
// shows the scenario's value from the first screen, worked out from its recorded run before anything
// plays; in a live run a tile shows the ellipsis and what it waits for until its run reaches it. When a
// decision moves a figure, the tile keeps the value it had before struck through (Vici's vc-stat__was)
// beside the new one. Every value comes from the engine or the session-cost estimate.
//   At stake a year   the kept issues' expected euros a year; after the decision, the share the shortlist answers
//   Issues covered    kept issues that at least one idea answers, of all kept issues
//   Top score         the highest weighted score; after the decision, the first pick and its score
//   Session cost      estimated for a replay on the Balanced setting; measured in a live run

import { t } from "./i18n/index.js";
import { fmtScore, fmtShare, fmtEur, fmtEurCompact, fmtEurSpend } from "./format.js";

/** The cost of a run in words: "under €0.01", "≈ €0.09" or a range "€0.11–€0.13". */
export function costText(eur, lang) {
  const [lo, hi] = Array.isArray(eur) ? eur : [eur, eur];
  if (hi < 0.005) return t("kpi.cost.under", { amount: fmtEur(0.01, lang) }, lang);
  // A range that starts under half a cent reads "up to", never "€0.00–€0.01", which looks free.
  if (lo < 0.005) return t("kpi.cost.upTo", { amount: fmtEur(hi, lang) }, lang);
  const a = fmtEur(lo, lang);
  const b = fmtEur(hi, lang);
  return a === b ? t("kpi.cost.about", { amount: a }, lang) : t("kpi.cost.range", { low: a, high: b }, lang);
}

const covered = (c, lang) => t("kpi.covered.value", { covered: c.covered, of: c.of }, lang);

/** At stake in a tile: the amount alone as the value, so it fits beside three others at 1280 px, and in the
    note how many kept issues state one ("on 7 of 8 kept issues"). The prose keeps atStakeText's one line. */
function stakeParts(s, lang) {
  if (s.eur === null) return { value: t("kpi.atStake.noneValue", null, lang), note: t("kpi.atStake.none", null, lang), ai: "" };
  return {
    value: fmtEurCompact(s.eur, lang),
    note: s.stated === s.of ? t("kpi.atStake.note", null, lang) : t("kpi.atStake.notePart", { stated: s.stated, of: s.of }, lang),
    // A second line, in lilac, when the sum holds the Reader's AI estimates (review A6).
    ai: s.estimated > 0 ? t(s.estimated < s.stated ? "kpi.atStake.aiSome" : "kpi.atStake.aiAll", null, lang) : ""
  };
}

/** At stake, Issues covered and Top score from a run, with the value before a decision struck through. */
function figuresOf(run, preview, reached, lang) {
  const f = run.figures;
  const p = preview.figures;
  const decided = run.shortlist.decided && reached >= 5;
  const stakeNow = stakeParts(f.atStake, lang);
  const stakeWas = stakeParts(p.atStake, lang);
  const stakeMoved = stakeNow.value !== stakeWas.value || stakeNow.note !== stakeWas.note;
  const stake = {
    value: stakeNow.value,
    was: stakeNow.value !== stakeWas.value ? stakeWas.value : "",
    note: decided && f.share !== null ? t("kpi.atStake.share", { share: fmtShare(f.share, lang) }, lang) : stakeNow.note,
    ai: stakeNow.ai,
    state: stakeMoved || decided ? "moved" : "idle"
  };
  if (!f.top || !p.top) return { stake, covered: null, top: null };
  const covNow = covered(f.covered, lang);
  const covWas = covered(p.covered, lang);
  const cov = { value: covNow, was: covNow !== covWas ? covWas : "", note: t("kpi.covered.note", null, lang), state: covNow !== covWas ? "moved" : "idle" };
  let top;
  if (decided && f.first) {
    const firstScore = fmtScore(f.first.value, lang);
    const topScore = fmtScore(f.top.value, lang);
    top = { value: firstScore, was: f.first.id !== f.top.id && firstScore !== topScore ? topScore : "", note: t("kpi.top.first", { name: f.first.name }, lang), state: "moved" };
  } else {
    const now = fmtScore(f.top.value, lang);
    const was = fmtScore(p.top.value, lang);
    top = { value: now, was: now !== was ? was : "", note: t("kpi.top.note", { name: f.top.name }, lang), state: now !== was ? "moved" : "idle" };
  }
  return { stake, covered: cov, top };
}

/**
 * The tiles' contents. mode: simulation or live; run: the run now (js/simulation.js buildRun); preview: the
 * run before the person's choices (the recording, or the live run as the agents left it), for the value
 * before a decision; reached: the furthest step (0 nothing yet, 1 read, 4 ideas scored, 5 report);
 * live.cost: the live meter's { eur, capEur } once a request has gone out. Returns { stake, covered, top,
 * cost }, each { value, was, note, state } with state waiting, idle, yours or moved.
 */
export function tileModel({ mode, run, preview, reached, lang, live = {} }) {
  const wait = (key) => ({ value: "…", was: "", note: t(key, null, lang), state: "waiting" });
  if (mode === "live") {
    const out = {
      stake: wait("kpi.atStake.wait"),
      covered: wait("kpi.covered.wait"),
      top: wait("kpi.top.wait"),
      cost: wait("kpi.cost.wait")
    };
    if (live.cost) out.cost = { value: fmtEurSpend(live.cost.eur, lang), was: "", note: t("kpi.cost.live", { cap: fmtEur(live.cost.capEur, lang) }, lang), state: "idle" };
    if (!run || !preview || reached < 1) return out;
    const fig = figuresOf(run, preview, reached, lang);
    out.stake = fig.stake;
    if (fig.covered && run.ideas.length) { out.covered = fig.covered; out.top = fig.top; }
    return out;
  }
  const fig = figuresOf(run, preview, reached, lang);
  const cost = { value: costText(run.estimate.balanced.eur, lang), was: "", note: t("kpi.cost.note", null, lang), state: "idle" };
  return { stake: fig.stake, covered: fig.covered, top: fig.top, cost };
}

/** Draws the model into the four tiles of index.html. */
export function renderTiles(root, model) {
  const doc = root.ownerDocument || root;
  const ids = { stake: "kpi-stake", covered: "kpi-covered", top: "kpi-top", cost: "kpi-cost" };
  for (const [k, id] of Object.entries(ids)) {
    const el = root.querySelector(`#${id}`);
    if (!el) continue;
    const m = model[k];
    const value = el.querySelector(".kpi-value");
    const was = el.querySelector(".kpi-was");
    const note = el.querySelector(".kpi-note");
    if (value.textContent !== m.value) {
      value.textContent = m.value;
      value.classList.remove("flip");
      void value.offsetWidth;
      value.classList.add("flip");
    }
    if (was.textContent !== m.was) was.textContent = m.was;
    was.hidden = !m.was;
    // The note is the tile's own text now, no longer the static default of index.html; an AI line under it
    // is lilac, with Vici's sparkle.
    note.removeAttribute("data-i18n");
    const ai = m.ai || "";
    if (note.textContent !== m.note + ai || note.dataset.ai !== ai) {
      note.replaceChildren(doc.createTextNode(m.note));
      if (ai) {
        const line = doc.createElement("span");
        line.className = "kpi-ai";
        const icon = doc.createElement("span");
        icon.className = "vc-icon vc-icon--sparkle";
        icon.setAttribute("aria-hidden", "true");
        line.append(icon, doc.createTextNode(ai));
        note.append(line);
      }
      note.dataset.ai = ai;
    }
    el.dataset.state = m.state;
  }
}
