// The presenter (brief §7 and §8, PLAN.md §10): the six steps, one screen each, story on the left and
// evidence on the right; the Your turn bar with each step's one primary action; Play, which walks the
// steps at 7 to 14 seconds each and stops wherever the person acts; the key figures that answer first; the
// EN and DE switch without a reload; and Run it live, which opens the live Start step with the drop zone.
// Taken from the Data Quality Agent 2.2.0's app.js (Play, keys, deep links, focus and scroll kept across a
// re-render) with the Sovereignty Assessment's language switch.
//
// A live run (brief §5) is a scenario the agents write while it plays: js/live_run.js turns the person's
// files and the agents' answers into the scenarios' format, so every step past Start draws a live run with
// the code that draws a replay. Start the agents opens the live-run dialog; reading, the Ideator and the
// Writer each run where the person asks for them, with a Stop button while they work and, when one stops,
// what happened in plain words and the one thing to do next. Each mode keeps its own run, so the
// simulation and a live run can be swapped without losing either.
//
// The simulation is a recorded run played through the same code a live run uses (js/simulation.js): the
// person's choices (keep, merge or park an issue, the weights, the shortlist) live here as plain values,
// and every render builds the run from them, so the tiles, the table, the chart, the stability sentence
// and the summary always agree with the engine. Space plays or pauses; the arrow keys, PageDown and
// PageUp move; ?scenario=s1&step=4 plays the recorded run up to the fourth step, paused.

import { setLang, getLang, onLang, t, tn } from "./i18n/index.js";
import { scenarios, scenarioById } from "./scenarios.js";
import { buildRun, recordedRun, referenceOf } from "./simulation.js";
import { decide } from "./issues.js";
import { tileModel, renderTiles, costText } from "./kpis.js";
import { DEFAULT_WEIGHTS, weightProblems } from "./engine.js";
import { readFile, checkIntake } from "./documents.js";
import { addDocument, removeDocument, addEvent, markResult, markDownloaded } from "./session.js";
import { renderStart } from "./views/start.js";
import { renderIntake } from "./views/intake.js";
import { renderRead } from "./views/read.js";
import { renderIdeate, ideaPage } from "./views/ideate.js";
import { renderScore } from "./views/score.js";
import { renderShortlist, placeIdea } from "./views/shortlist.js";
import { renderReport } from "./views/report.js";
import { turnBar } from "./views/common.js";
import { clear, h } from "./dom.js";
import { fmtScore, fmtEur, fmtEurSpend } from "./format.js";
import { LIMITS, BUDGET, MODELS } from "./config.js";
import { openLiveDialog } from "./live_dialog.js";
import { readStep, ideasStep, writerStep } from "./live_agents.js";
import { liveScenario, acceptedFiles, readingSize, privateSources, savedRun } from "./live_run.js";
import { createMeter } from "./pipeline.js";
import { messageOf } from "./api_messages.js";
import { getKey, hasKey, redactSecrets } from "./keystore.js";
import { privateFindings } from "./privacy.js";
import { liveSizes, estimateLive, timeWords } from "./estimate.js";

const LANGS = ["en", "de"];
export const STEPS = ["start", "read", "ideate", "score", "shortlist", "report"];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = () => new Date().toISOString().slice(0, 10);

/** The page's state: plain values, so every render can build the run from them. */
const S = {
  mode: "simulation",
  scenarioId: "s1",
  step: 0,
  reached: 0,
  decisions: null,
  weights: null,
  draft: null,
  picks: null,
  decided: false,
  ideated: false,
  weightsOpen: false,
  scoreView: "chart",
  // After a switch of company that set choices aside: the run as it was, for Undo.
  undo: null,
  live: blankLive()
};

/** A live run before anything happened: no files, no answers, no spend. The key lives in js/keystore.js. */
function blankLive() {
  return {
    entries: [],
    form: { count: LIMITS.ideasDefault, company: "", sector: "", focus: "", constraints: "" },
    version: 0,                 // goes up whenever the files, the fields or the answers change
    answers: { reader: null, merges: null, ideas: null, recommendation: null },
    reading: null,              // none, merges or reader, once read
    settings: null,             // { preset, model, effort, thinking } from the dialog
    capEur: BUDGET.defaultEur,
    runLang: null,              // the language the agents write in, set when the run starts
    meter: null,                // js/pipeline.js createMeter: the run's spend
    busy: null,                 // { phase, agent, step, startedAt, retryUntil, repairing, counting } while a request runs
    stop: null,                 // { key, vars, next, problems, phase, agent, step } once a step stopped
    ctrl: null,                 // the AbortController of the running step
    unchecked: { reader: [], merges: [], ideator: [], writer: [] },
    repaired: { reader: false, merges: false, ideator: false, writer: false },
    ms: { reader: 0, merges: 0, ideator: 0, writer: 0 },
    requests: 0,
    last: null,                 // the last finished run in this tab: { eur, seconds }, for the dialog
    setAside: null              // after Start a new run: the run as it was, for Undo
  };
}

// Each mode keeps its own run: what the person chose in the simulation and in a live run.
const MODE_KEYS = ["step", "reached", "decisions", "weights", "draft", "picks", "decided", "ideated", "weightsOpen", "scoreView"];
const blankRun = () => ({ step: 0, reached: 0, decisions: null, weights: null, draft: null, picks: null, decided: false, ideated: false, weightsOpen: false, scoreView: "chart" });
const stash = { simulation: null, live: null };
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, structuredClone(o[k])]));

/** Play: on, the frame it asked for, the time spent reading the step, the step it timed, the last frame. */
const P = { on: false, raf: 0, at: 0, step: -1, last: 0 };
let stage;
let lastStep = -1;
const runCache = new Map();

const sc = () => scenarioById(S.scenarioId) || scenarios()[0];

/** The live run as a scenario (js/live_run.js), rebuilt only when its files, fields or answers change. */
let liveScCache = { version: -1, lang: null, sc: null };
function liveSc() {
  const runLang = S.live.runLang || getLang();
  if (liveScCache.version !== S.live.version || liveScCache.lang !== runLang) {
    liveScCache = { version: S.live.version, lang: runLang, sc: liveScenario({ entries: S.live.entries, form: S.live.form, answers: S.live.answers, runLang, asOf: today() }) };
  }
  return liveScCache.sc;
}
const runKey = () => (S.mode === "live" ? `live${S.live.version}` : S.scenarioId);

/** The run now in a language, built from the person's choices (cached per state): the scenario's or the live one. */
function currentRun(lang = getLang()) {
  const key = JSON.stringify([runKey(), lang, S.decisions, S.weights, S.picks, S.decided]);
  if (!runCache.has(key)) {
    if (runCache.size > 40) runCache.clear();
    runCache.set(key, buildRun(S.mode === "live" ? liveSc() : sc(), lang, { decisions: S.decisions, weights: S.weights, picks: S.picks, decided: S.decided }));
  }
  return runCache.get(key);
}
/** The run before the person's choices: a scenario's recording, or a live run as the agents left it. */
function previewRun(id = S.scenarioId, lang = getLang()) {
  const key = `preview|${id}|${lang}`;
  if (!runCache.has(key)) runCache.set(key, recordedRun(scenarioById(id), lang));
  return runCache.get(key);
}
function livePreview(lang = getLang()) {
  const key = `preview|live${S.live.version}|${lang}`;
  if (!runCache.has(key)) runCache.set(key, buildRun(liveSc(), lang, {}));
  return runCache.get(key);
}

/** What the person's files are, before and after the run reads them. */
const liveIntake = () => checkIntake(S.live.entries);

// ---- start -----------------------------------------------------------------------------------------------

/** Starts the page. */
export async function start() {
  stage = $("#stage");
  const params = new URLSearchParams(location.search);
  const wanted = scenarioById(params.get("scenario"));
  if (wanted) S.scenarioId = wanted.id;

  for (const button of $$(".lang-option")) button.addEventListener("click", () => switchTo(button.dataset.lang));
  $("#btn-live")?.addEventListener("click", () => (S.mode === "live" ? toSimulation() : toLive()));
  $("#btn-back")?.addEventListener("click", () => go(S.step - 1));
  $("#btn-next")?.addEventListener("click", () => next());
  $("#btn-play")?.addEventListener("click", () => (P.on ? pause() : play()));
  $$("#steps .vc-step").forEach((li, n) => {
    li.querySelector(".vc-step__button")?.addEventListener("click", () => go(n));
  });
  document.addEventListener("keydown", onKey);
  for (const type of ["pointerdown", "keydown", "wheel"]) document.addEventListener(type, () => { if (!P.on) armAttention(); }, { capture: true, passive: true });
  // The guide's Start, on a guide opened during a replay, plays on from where the page is.
  for (const g of $$(".vc-guide")) g.addEventListener("vc:guideclose", (e) => { if (e.detail?.returnValue === "done" && S.mode === "simulation" && S.reached > 0) play(); });

  showLang(getLang());
  onLang(() => { showLang(getLang()); render(); fillGuide(); });
  fillGuide();
  const step = Number(params.get("step"));
  if (Number.isInteger(step) && step >= 2 && step <= 6) deepLink(step);
  else render();
  armAttention();
}

function switchTo(lang) {
  if (!LANGS.includes(lang) || lang === getLang()) return;
  setLang(lang);
  announce(t("p.lang.now"));
}

/** What changes with the language beyond the texts: html lang, the pressed button, the guide's button. */
function showLang(lang) {
  const root = document.documentElement;
  root.setAttribute("lang", lang === "de" ? "de" : "en-GB");
  root.dataset.lang = lang;
  for (const button of $$(".lang-option")) button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  for (const l of LANGS) {
    const opener = $(`[data-vc-guide-open="guide-${l}"]`);
    if (opener) opener.hidden = l !== lang;
  }
}

// ---- the run ----------------------------------------------------------------------------------------------

/** Back to the first screen of a scenario, nothing chosen. */
function reset(id = S.scenarioId) {
  pause();
  Object.assign(S, { scenarioId: id, step: 0, reached: 0, decisions: null, weights: null, draft: null, picks: null, decided: false, ideated: false, weightsOpen: false, scoreView: "chart", undo: null });
}

const RUN_KEYS = ["scenarioId", "step", "reached", "decisions", "weights", "draft", "picks", "decided", "ideated", "weightsOpen", "scoreView"];

/**
 * What the person chose in the current scenario that a switch of company would set aside: the issue
 * decisions that differ from the recording, weights other than the recording's, a top three other than the
 * engine's. Empty when nothing differs, so a switch before any choice says nothing.
 */
function choicesMade(lang = getLang()) {
  const s = sc();
  const items = [];
  if (S.decisions) {
    const recorded = new Map((s.choices.issues || []).map((d) => [d.id, d]));
    const mine = new Map(S.decisions.map((d) => [d.id, d]));
    const ids = new Set([...recorded.keys(), ...mine.keys()]);
    const same = (a, b) => (a?.action || "keep") === (b?.action || "keep") && (a?.into || null) === (b?.into || null);
    const changed = [...ids].filter((id) => !same(recorded.get(id), mine.get(id))).length;
    if (changed) items.push(tn("start.undo.decisions", changed, {}, lang));
  }
  const recordedWeights = s.choices.weights || DEFAULT_WEIGHTS;
  if (S.weights && Object.keys(S.weights).some((k) => S.weights[k] !== recordedWeights[k])) items.push(t("start.undo.weights", {}, lang));
  if (S.picks) {
    const engine = buildRun(s, lang, { decisions: S.decisions, weights: S.weights }).ranked.slice(0, 3).map((r) => r.id);
    if (S.picks.join() !== engine.join()) items.push(t("start.undo.shortlist", {}, lang));
  }
  return items;
}

/**
 * Another company: what the person chose in this one is set aside, and the Start step says so with Undo,
 * which brings back the company and the run as they were. A switch before any choice says nothing.
 */
function switchCompany(id) {
  const lang = getLang();
  const items = choicesMade(lang);
  const snapshot = Object.fromEntries(RUN_KEYS.map((k) => [k, structuredClone(S[k])]));
  const company = sc().company.name;
  reset(id);
  if (items.length) S.undo = { snapshot, company, what: new Intl.ListFormat(lang === "de" ? "de" : "en-GB", { type: "conjunction" }).format(items) };
  syncUrl();
  render();
  announce(`${S.undo ? `${t("start.undo.lead", { company: S.undo.company, what: S.undo.what })} ` : ""}${t("start.chosen", { company: sc().company.name })}`);
}

/** Undo: the company and the run as they were before the switch. */
function undoSwitch() {
  if (!S.undo) return;
  const { snapshot, company } = S.undo;
  pause();
  Object.assign(S, structuredClone(snapshot), { undo: null });
  syncUrl();
  render();
  announce(t("start.undo.done", { company }));
  ($("#step-title") || stage).focus({ preventScroll: true });
}

/** Start: the Reader reads the scenario's files; the page shows the Read step. */
function begin() {
  S.undo = null;
  S.reached = Math.max(S.reached, 1);
  log("run_start", "start", { scenario: S.scenarioId });
  go(1, { keep: true });
}

/** Find prototype ideas: the Ideator's ideas, scored and ranked; the run waits at the shortlist. */
function findIdeas() {
  S.ideated = true;
  S.reached = Math.max(S.reached, 4);
  log("ideas", "ideate", { ideas: currentRun().ideas.length });
  go(2, { keep: true });
}

/** Write the report: the shortlist is the person's decision; the Writer's summary follows. */
function writeReport() {
  const run = currentRun();
  S.picks = run.shortlist.picks.map((p) => p.idea);
  S.decided = true;
  S.reached = 5;
  log("shortlist", "shortlist", { picks: S.picks });
  go(5, { keep: true });
}

/** ?scenario=s2&step=4: the recorded run up to that step, paused. */
function deepLink(step) {
  S.reached = 1;
  if (step >= 3) { S.decisions = null; S.ideated = true; S.reached = 4; }
  if (step >= 6) { S.picks = [...(sc().choices.shortlist || [])]; S.decided = true; S.reached = 5; }
  S.step = Math.min(step - 1, S.reached);
  render();
}

function log(type, step, detail) {
  addEvent({ type, step, at: Math.round(performance.now()), detail });
}

// ---- navigation ----------------------------------------------------------------------------------------------

/** Shows step n. A step chosen by the presenter pauses Play; keep: Next and Play go on playing. */
function go(n, { focus = true, keep = false } = {}) {
  if (S.mode === "live" && S.live.busy && S.live.busy.agent) return;
  if (!keep) pause();
  if (S.mode === "simulation" && S.reached === 0 && n > 0) { begin(); return; }
  S.step = Math.max(0, Math.min(S.reached, n));
  if (P.step !== S.step) Object.assign(P, { step: S.step, at: 0 });
  syncUrl();
  render();
  announce(t("p.announce.step", { n: S.step + 1, of: STEPS.length, title: $("#step-title")?.textContent || t(`p.step.${STEPS[S.step]}`) }));
  if (!P.on) armAttention();
  if (focus) ($("#step-title") || stage).focus({ preventScroll: true });
}

function next() {
  if (S.step < S.reached) go(S.step + 1, { keep: true });
  else if (S.step === 0 && S.reached === 0 && S.mode === "simulation") begin();
}

function onKey(e) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (document.querySelector("dialog[open]")) return;
  const tgt = e.target;
  if (tgt && tgt.closest?.("input, textarea, select, [contenteditable]")) return;
  if (e.key === " ") {
    if (tgt?.closest?.("button, a, summary, [role=button]")) return;
    e.preventDefault();
    if (!e.repeat) (P.on ? pause() : play());
    return;
  }
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(S.step + 1); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(S.step - 1); }
}

function syncUrl() {
  if (S.mode !== "simulation") return;
  const u = new URL(location.href);
  u.searchParams.set("scenario", S.scenarioId);
  if (S.step > 0) u.searchParams.set("step", String(S.step + 1)); else u.searchParams.delete("step");
  history.replaceState(null, "", u);
}

// ---- Play --------------------------------------------------------------------------------------------------

/** The step waits for the person: Start, the issue map before the ideas, the shortlist before the report. */
function waits() {
  if (S.mode !== "simulation") return true;
  if (S.step === 0 && S.reached === 0) return true;
  if (S.step === 1 && !S.ideated) return true;
  if (S.step === 4 && !S.decided) return true;
  return false;
}
const finished = () => S.mode === "simulation" && S.decided && S.step === 5;
const covered = () => !!document.querySelector("dialog[open]");
/** How long Play stays on a step: the time to read its title and lead, between 7 and 14 seconds. */
function readMs() {
  const words = $$("[data-read]", stage).map((e) => e.textContent).join(" ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.min(14000, Math.max(7000, 3000 + 230 * words));
}

function play() {
  if (S.mode !== "simulation") return;
  if (S.reached === 0 || finished()) {
    reset(S.scenarioId);
    P.on = true;
    begin();
  }
  P.on = true;
  P.last = 0;
  calm();
  drawPlay();
  if (!P.raf) P.raf = requestAnimationFrame(playFrame);
}

function pause() {
  if (!P.on) return;
  P.on = false;
  cancelAnimationFrame(P.raf);
  P.raf = 0;
  fill(0);
  drawPlay();
  drawFoot();
  armAttention();
}

function playFrame(now) {
  P.raf = 0;
  if (!P.on) return;
  const dt = P.last ? Math.min(now - P.last, 100) : 0;
  P.last = now;
  if (P.step !== S.step) Object.assign(P, { step: S.step, at: 0 });
  const total = readMs();
  if (waits()) {
    P.at = 0;
  } else if (finished()) {
    pause();
    return;
  } else if (S.step < S.reached && !covered()) {
    P.at += dt;
    if (P.at >= total) {
      go(S.step + 1, { focus: false, keep: true });
      P.raf = requestAnimationFrame(playFrame);
      return;
    }
  }
  fill(waits() ? 0 : P.at / total);
  drawFoot(total);
  P.raf = requestAnimationFrame(playFrame);
}

/** How far the step is read: the rail to the next step and the bar along the step's action fill with it. */
function fill(p) {
  const v = Math.max(0, Math.min(1, p)).toFixed(4);
  $$("#steps .vc-step").forEach((li, n) => li.style.setProperty("--vc-step-fill", n === S.step ? v : "0"));
  $("#btn-cta")?.style.setProperty("--fill", v);
}

/** Play, Pause or Replay on the one button before the steps. */
function drawPlay() {
  const btn = $("#btn-play");
  if (!btn) return;
  const st = P.on ? "pause" : finished() ? "replay" : "play";
  btn.disabled = S.mode !== "simulation";
  btn.hidden = S.mode !== "simulation";
  if (btn.dataset.state === st) return;
  btn.dataset.state = st;
  btn.querySelector(".vc-icon").className = `vc-icon vc-icon--${st === "pause" ? "pause" : st === "replay" ? "refresh" : "play"}`;
  const text = $("#play-text");
  text.dataset.i18n = st === "pause" ? "p.pause" : st === "replay" ? "p.replay" : "p.play";
  text.textContent = t(text.dataset.i18n);
}

/** Beside the step's action, in words: when Play moves on, or that the move is the person's. */
function drawFoot(total = readMs()) {
  const note = $("#foot-note");
  if (!note) return;
  const playing = P.on && S.mode === "simulation";
  const words = playing ? (S.step < S.reached && !waits() ? t("p.playsOn", { s: Math.max(1, Math.ceil((total - P.at) / 1000)) }) : waits() ? t("p.yourMove") : "") : "";
  if (note.textContent !== words) note.textContent = words;
}

// Paused, the step's action draws the eye after six seconds without a click, a key or a scroll.
let quiet = 0;
function calm() { $("#btn-cta")?.classList.remove("vc-attention-late"); }
function armAttention() {
  clearTimeout(quiet);
  calm();
  quiet = setTimeout(() => {
    const cta = $("#btn-cta");
    if (P.on || !cta || cta.disabled || covered()) return;
    cta.classList.add("vc-attention-late");
  }, 6000);
}

// ---- modes ----------------------------------------------------------------------------------------------------

/** Run it live: the live run as the person left it, or its Start step with the drop zone. */
function toLive() {
  pause();
  stash.simulation = pick(S, MODE_KEYS);
  S.mode = "live";
  Object.assign(S, stash.live || blankRun());
  history.replaceState(null, "", location.pathname + (new URLSearchParams(location.search).has("lang") ? `?lang=${getLang()}` : ""));
  render();
  announce(t(S.reached > 0 ? "live.resume" : "live.now"));
  ($("#step-title") || stage).focus({ preventScroll: true });
}

/** Back to the simulation where the person left it; the live run waits in memory. */
function toSimulation() {
  if (S.live.busy) return;
  stash.live = pick(S, MODE_KEYS);
  S.mode = "simulation";
  Object.assign(S, stash.simulation || blankRun());
  syncUrl();
  render();
  announce(t("live.back"));
  ($("#step-title") || stage).focus({ preventScroll: true });
}

/** Files and fields change what the next request sends; the run reads them again only from Start. */
function liveChanged() {
  S.live.version += 1;
}

async function addFiles(fileList) {
  const files = [...fileList];
  let n = S.live.entries.length;
  for (const file of files) {
    const id = `f${Date.now().toString(36)}${(n += 1)}`;
    const entry = await readFile(file, id);
    S.live.entries.push(entry);
    addDocument({ id, name: entry.name, kind: entry.kind === "json" ? "handoff" : ["pdf", "markdown", "text", "csv"].includes(entry.kind) ? entry.kind : "text", bytes: entry.bytes, pages: entry.pages, stand_in: false, fictional: false, from: "upload" }, entry.content);
  }
  liveChanged();
  render();
  const intake = liveIntake();
  announce(tn("intake.added", files.length, { refused: intake.files.filter((f) => f.refusal).length }));
}

function removeFile(id) {
  S.live.entries = S.live.entries.filter((e) => e.id !== id);
  removeDocument(id);
  liveChanged();
  render();
  $("#intake-files")?.focus();
}

// ---- the live run ----------------------------------------------------------------------------------------

const modelLabel = (id) => MODELS.find((m) => m.id === id)?.label || id;
const AGENT_OF = { read: null, ideas: "ideator", write: "writer" };
let sizes = null;
let ticker = 0;

/** The estimate's sizes, from the three recorded scenarios (once per tab). */
function sizesOf() {
  if (!sizes) sizes = liveSizes(scenarios().map((x) => previewRun(x.id, "en")));
  return sizes;
}

/** Cost and time in the dialog's words. */
const costWords = (eur) => {
  const lang = getLang();
  const [lo, hi] = eur;
  if (hi < 0.005) return t("ld.cost.under", { amount: fmtEur(0.01, lang) });
  const a = fmtEur(lo, lang);
  const b = fmtEur(hi, lang);
  return a === b ? t("ld.cost.about", { amount: a }) : t("ld.cost.range", { low: a, high: b });
};
const secondsWords = (s) => {
  const n = Math.max(0, Math.round(s));
  return n < 60 ? t("time.s", { s: n }) : t("time.min", { m: Math.floor(n / 60), s: n % 60 });
};

/**
 * Opens the live-run dialog for what is left to do: from the start (phase read), or to go on after a stop
 * (the stopped phase). On Start the live run, the key has passed the free check and the run goes on.
 */
async function openDialog(phase = "read", { forgetFirst = false } = {}) {
  const files = acceptedFiles(S.live.entries);
  const size = readingSize({ files, form: S.live.form });
  const labels = { company: t("intake.company"), focus: t("intake.focus"), constraints: t("intake.constraints") };
  const result = await openLiveDialog({
    settings: S.live.settings,
    capEur: S.live.capEur,
    spentEur: S.live.meter ? S.live.meter.spentEur() : 0,
    estimate: (settings) => estimateLive({ ...size, count: S.live.form.count, settings, sizes: sizesOf(), lang: S.live.runLang || getLang(), from: phase }),
    words: { cost: costWords, time: (sec) => timeWords(sec, t) },
    findings: phase === "read" ? privateFindings(privateSources({ files, form: S.live.form, labels })) : [],
    pdfs: phase === "read" && files.some((f) => f.kind === "pdf"),
    last: S.live.last,
    forgetFirst
  });
  if (!result) { $("#btn-cta")?.focus({ preventScroll: true }); return; }
  S.live.settings = result.settings;
  S.live.capEur = result.capEur;
  if (!S.live.meter) S.live.meter = createMeter(result.settings.model, result.capEur);
  else S.live.meter.set({ capEur: result.capEur, model: result.settings.model });
  if (!S.live.runLang) S.live.runLang = getLang();
  log("run_start", STEPS[S.step], { mode: "live", phase, preset: result.settings.preset, model: result.settings.model, effort: result.settings.effort, cap: result.capEur });
  runLive(phase);
}

/** True until the person has given a key and settings for this run in the dialog. */
const needsDialog = () => !hasKey() || !S.live.settings || !S.live.meter;

/**
 * A step the person asked for: reading one challenger's file runs at once, without any request; anything
 * that calls a model asks for the key and the settings first, the first time.
 */
function askLive(phase) {
  const free = phase === "read" && readingSize({ files: acceptedFiles(S.live.entries), form: S.live.form }).reading === "none";
  if (!free && needsDialog()) { openDialog(phase); return; }
  runLive(phase);
}

/** Try again: the stopped step once more with the same key and settings; without a key, the dialog first. */
function tryAgain(phase) {
  if (needsDialog()) { openDialog(phase); return; }
  runLive(phase);
}

/** Stop: the running request ends and what is done stays. */
function stopLive() {
  S.live.ctrl?.abort();
}

/** What the busy bar says while a step runs, and the line under it. */
function busyWords() {
  const b = S.live.busy;
  if (!b) return { text: "", meta: "", note: "" };
  const files = acceptedFiles(S.live.entries).filter((f) => f.kind !== "handoff").length;
  const count = Math.max(LIMITS.ideasMin, Math.min(LIMITS.ideasMax, Number(S.live.form.count) || LIMITS.ideasDefault));
  const text = b.agent === "merges" ? t("live.busy.merges")
    : b.agent === "reader" ? tn("live.busy.reader", files)
      : b.agent === "ideator" ? tn("live.busy.ideator", count)
        : t("live.busy.writer");
  const seconds = (performance.now() - b.startedAt) / 1000;
  const spent = S.live.meter ? S.live.meter.spentEur() : 0;
  const meta = t("live.busy.meta", { time: secondsWords(seconds), amount: fmtEurSpend(spent) });
  const wait = b.retryUntil ? Math.max(0, Math.ceil((b.retryUntil - performance.now()) / 1000)) : 0;
  const note = b.counting ? t("live.busy.counting") : wait ? t("live.retrying", { s: wait }) : b.repairing ? t("live.repairing") : "";
  return { text, meta, note };
}

/** The busy bar's moving parts, once a second, without drawing the step again. */
function tick() {
  const w = busyWords();
  const meta = $("#busy-meta");
  const note = $("#busy-note");
  if (meta && meta.textContent !== w.meta) meta.textContent = w.meta;
  if (note && note.textContent !== w.note) note.textContent = w.note;
  const text = $("#turn .turn-text");
  if (text && text.textContent !== w.text) text.textContent = w.text;
}

/** A pipeline event: who works now, a retry's wait, a repair, the meter after an answer. */
function onLiveEvent(e) {
  const b = S.live.busy;
  if (!b) return;
  if (e.type === "counting") b.counting = true;
  if (e.type === "request") { b.agent = e.agent; b.counting = false; b.retryUntil = 0; b.repairing = !!e.repair; }
  if (e.type === "retry") b.retryUntil = performance.now() + e.waitMs;
  if (e.type === "answer") { b.retryUntil = 0; S.live.requests += 1; renderKpis(); }
  if (e.type === "repair") b.repairing = true;
  tick();
}

/**
 * One step of the live run: read (no request for one challenger's file), ideas or write. While it runs the
 * step's bar shows what the agent does with Stop; what comes back goes into the run, and the page moves on.
 * When it stops, the bar says why and what to do next, and what is done stays.
 */
async function runLive(phase) {
  if (S.live.busy) return;
  const ctrl = new AbortController();
  const size = readingSize({ files: acceptedFiles(S.live.entries), form: S.live.form });
  const agent = phase === "read" ? (size.reading === "none" ? null : size.reading) : AGENT_OF[phase];
  S.live.ctrl = ctrl;
  S.live.stop = null;
  S.live.busy = { phase, agent, step: S.step, startedAt: performance.now(), retryUntil: 0, repairing: false, counting: false };
  const started = performance.now();
  if (agent) {
    render();
    clearInterval(ticker);
    ticker = setInterval(tick, 1000);
  }
  const ctx = { key: getKey(), settings: S.live.settings, meter: S.live.meter, signal: ctrl.signal, onEvent: onLiveEvent, runLang: S.live.runLang };
  let next = null;
  try {
    if (phase === "read") {
      const out = await readStep({ ...ctx, entries: S.live.entries, form: S.live.form });
      S.live.answers = { reader: out.reader, merges: out.merges, ideas: null, recommendation: null };
      S.live.reading = out.reading;
      if (out.reading !== "none") { S.live.unchecked[out.reading] = out.unchecked; S.live.repaired[out.reading] = out.repaired; S.live.ms[out.reading] = out.ms; }
      Object.assign(S, { decisions: null, weights: null, draft: null, picks: null, decided: false, ideated: false });
      liveChanged();
      S.reached = 1;
      log("issue_map", "read", { reading: out.reading, issues: currentRun().issues.length });
      next = 1;
    } else if (phase === "ideas") {
      const out = await ideasStep({ ...ctx, run: currentRun(S.live.runLang), form: S.live.form });
      S.live.answers = { ...S.live.answers, ideas: out.ideas, recommendation: null };
      S.live.unchecked.ideator = out.unchecked;
      S.live.repaired.ideator = out.repaired;
      S.live.ms.ideator = out.ms;
      liveChanged();
      Object.assign(S, { picks: null, decided: false, ideated: true });
      S.reached = 4;
      markResult();
      log("ideas", "ideate", { ideas: out.ideas.ideas.length, repaired: out.repaired });
      next = 2;
    } else {
      const run = currentRun(S.live.runLang);
      const picks = run.shortlist.picks.map((p) => p.idea);
      const out = await writerStep({ ...ctx, run });
      S.live.answers = { ...S.live.answers, recommendation: out.recommendation };
      S.live.unchecked.writer = out.unchecked;
      S.live.repaired.writer = out.repaired;
      S.live.ms.writer = out.ms;
      liveChanged();
      Object.assign(S, { picks, decided: true });
      S.reached = 5;
      markResult();
      S.live.last = { eur: S.live.meter.spentEur(), seconds: Object.values(S.live.ms).reduce((a, b) => a + b, 0) / 1000 };
      log("recommendation", "report", { picks, repaired: out.repaired });
      next = 5;
    }
  } catch (e) {
    const aborted = ctrl.signal.aborted || e?.name === "AbortError";
    const m = messageOf(aborted ? { name: "AbortError" } : e, { model: modelLabel(S.live.settings?.model) });
    S.live.stop = { ...m, phase, agent: e?.agent || agent, step: S.live.busy.step };
    log(aborted ? "abort" : e?.name === "BudgetStop" ? "budget_stop" : "error", STEPS[S.step], { phase, key: m.key, status: e?.status ?? null, ms: Math.round(performance.now() - started) });
  } finally {
    clearInterval(ticker);
    ticker = 0;
    S.live.busy = null;
    S.live.ctrl = null;
  }
  if (S.live.stop) {
    render();
    announce(stopText(S.live.stop));
    $("#btn-cta")?.focus({ preventScroll: true });
    return;
  }
  go(next, { keep: true });
}

/**
 * What the checks found, with names for ids: the guards write for the model, which knows the ids, so the
 * issues an id names show by their titles; an id the run doesn't have stays as the model wrote it.
 */
function named(problem) {
  const issues = S.reached >= 1 ? currentRun(S.live.runLang || getLang()).issues : [];
  return issues.reduce((text, i) => text.split(`"${i.id}"`).join(`“${i.title}”`), problem);
}

/** A stop in words, with the cap and the model filled in. */
function stopText(st) {
  return redactSecrets(t(st.key, { ...(st.vars || {}), cap: fmtEur(S.live.capEur), model: modelLabel(S.live.settings?.model) }));
}

/** The bar a live step shows while its agent works or after it stopped, in place of the step's own. */
function liveBar() {
  const b = S.live.busy;
  const st = S.live.stop;
  if (b && b.agent) {
    const w = busyWords();
    return turnBar({
      kind: "busy", text: w.text,
      action: { label: t("live.stop"), icon: "stop", secondary: true, onClick: stopLive },
      extra: [h("p", { class: "busy-meta", id: "busy-meta" }, w.meta), h("p", { class: "busy-note", id: "busy-note", "aria-live": "polite" }, w.note)]
    });
  }
  if (!st) return null;
  const primary = st.next === "key"
    ? { label: t("live.key"), icon: "key", onClick: () => openDialog(st.phase, { forgetFirst: true }) }
    : st.next === "settings"
      ? { label: t("live.settings"), icon: "settings", onClick: () => openDialog(st.phase) }
      : { label: t("live.again"), icon: "refresh", onClick: () => tryAgain(st.phase) };
  const quiet = (label, action, onClick) => h("button", { type: "button", class: "vc-button vc-button--secondary vc-button--sm", dataset: { action }, on: { click: onClick } }, label);
  // The way back to the simulation stands in the header all along, so the bar offers only what goes on.
  const actions = st.next === "retry" ? [quiet(t("live.settings"), "live-settings", () => openDialog(st.phase))] : [];
  // Opened, the list makes the bar taller: the story scrolls to its end so the bar sits in its own place, under
  // what the agents finished, rather than over it.
  const reveal = (e) => { if (e.target.open) { const panel = e.target.closest(".panel"); if (panel) panel.scrollTop = panel.scrollHeight; } };
  const problems = st.problems && st.problems.length
    ? h("details", { class: "stop-problems", on: { toggle: reveal } }, h("summary", {}, h("span", { class: "vc-icon vc-icon--chevron-right summary-chevron", "aria-hidden": "true" }), t("live.problems")), h("ul", { lang: "en" }, st.problems.slice(0, 8).map((p) => h("li", {}, named(redactSecrets(p))))))
    : null;
  return turnBar({ kind: "stopped", text: stopText(st), action: primary, actions, extra: problems });
}

/** Start a new run: the files, fields and answers of this one are set aside, with Undo. */
function newLiveRun() {
  if (S.live.busy) return;
  const aside = { live: { ...S.live, entries: [...S.live.entries], form: { ...S.live.form } }, run: pick(S, MODE_KEYS) };
  const keep = { settings: S.live.settings, capEur: S.live.capEur, last: S.live.last };
  S.live = { ...blankLive(), ...keep, setAside: aside };
  Object.assign(S, blankRun());
  render();
  announce(t("intake.new.undo"));
  $("#intake-files")?.focus();
}

/** Undo: the live run that Start a new run set aside comes back as it was. */
function undoNewRun() {
  const aside = S.live.setAside;
  if (!aside) return;
  S.live = { ...aside.live, setAside: null };
  Object.assign(S, aside.run);
  liveChanged();
  render();
  announce(t("intake.new.done"));
  ($("#step-title") || stage).focus({ preventScroll: true });
}

/** A file name as the report's: prototype-ideator-<company>-<date>-<lang>, umlauts written out. */
export function fileName(company, lang, suffix) {
  const slug = String(company || "run").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "run";
  return `prototype-ideator-${slug}-${today()}-${lang}${suffix}`;
}

/** Save run as simulation: the run in the scenarios' format, downloaded; nothing is stored. */
function saveRun() {
  const run = currentRun(S.live.runLang);
  const meter = S.live.meter?.snapshot();
  const ref = referenceOf(run);
  const data = savedRun(liveSc(), {
    decisions: run.decisions, weights: S.weights, picks: S.picks, reference: { ...ref, cost_cents: { [S.live.runLang || getLang()]: ref.cost_cents } },
    settings: S.live.settings, cost: meter ? Math.round(meter.eur * 1e6) / 1e6 : null,
    timing: Math.round(Object.values(S.live.ms).reduce((a, b) => a + b, 0) / 100) / 10,
    byAgent: meter?.byAgent
  });
  const name = fileName(run.company?.name, S.live.runLang || getLang(), "-run.json");
  const blob = new Blob([redactSecrets(JSON.stringify(data, null, 2))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name, hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markDownloaded();
  announce(t("report.saved", { file: name }));
}

/** The Read step's lilac line in a live run: what reading took, in one sentence. */
function liveReadText(run) {
  const reading = S.live.reading || "none";
  const repaired = S.live.repaired[reading] ? ` ${t("live.repaired")}` : "";
  if (reading === "none") return t("read.agent.handoffNone");
  const n = run.proposals.length;
  if (reading === "merges") return (n ? tn("read.agent.handoff", n) : t("read.agent.handoffNoMerge")) + repaired;
  const files = tn("read.files", acceptedFiles(S.live.entries).filter((f) => f.kind !== "handoff").length);
  const issues = tn("read.issues", run.issues.filter((i) => i.source?.kind === "document").length);
  return (n ? tn("read.agent.reader", n, { files, issues }) : t("read.agent.reader.none", { files, issues })) + repaired;
}

/** A live run's texts the fact audit refused twice, by where they show. */
function liveMarks() {
  const u = S.live.unchecked;
  const issues = new Set(u.reader.map((w) => (/^issue (\S+) /.exec(w) || [])[1]).filter(Boolean).map((id) => `doc-${id}`));
  const ideas = new Set(u.ideator.map((w) => (/^idea (\d+) /.exec(w) || [])[1]).filter(Boolean).map((n) => `P${n}`));
  const report = new Set(u.writer);
  return { issues, ideas, report };
}

// ---- dialogs ----------------------------------------------------------------------------------------------------

function openIdea(id) {
  const dlg = $("#idea-drawer");
  const run = currentRun();
  const idea = run.ideas.find((i) => i.id === id);
  if (!dlg || !idea) return;
  $("#idea-title").textContent = idea.name;
  const body = $("#idea-body");
  clear(body);
  body.append(ideaPage(idea, { run, lang: getLang(), unchecked: S.mode === "live" && liveMarks().ideas.has(id) }));
  dlg.dataset.idea = id;
  if (!dlg.open) dlg.showModal();
  body.scrollTop = 0;
}


// ---- rendering ------------------------------------------------------------------------------------------------

const keyOf = (el) => {
  if (!el || !stage.contains(el)) return null;
  if (el.id) return `#${el.id}`;
  const box = el.closest("[data-issue],[data-idea],[data-file],[data-scenario],[data-criterion]");
  const where = box ? `${box.dataset.issue || box.dataset.idea || box.dataset.file || box.dataset.scenario || box.dataset.criterion}` : "";
  return el.dataset.action ? `${where}|${el.dataset.action}|${el.dataset.place || el.dataset.scenario || el.dataset.criterion || ""}` : null;
};
const findByKey = (key) => {
  if (key.startsWith("#")) return document.getElementById(key.slice(1));
  const [where, action, extra] = key.split("|");
  return $$(`[data-action="${action}"]`, stage).find((b) => {
    const box = b.closest("[data-issue],[data-idea],[data-file],[data-scenario],[data-criterion]");
    const w = box ? box.dataset.issue || box.dataset.idea || box.dataset.file || box.dataset.scenario || box.dataset.criterion : "";
    return w === where && (!extra || b.dataset.place === extra || b.dataset.scenario === extra || b.dataset.criterion === extra);
  }) || null;
};

function render() {
  if (!stage) return;
  const lang = getLang();
  const active = document.activeElement;
  const focusKey = keyOf(active);
  const sameStep = lastStep === S.step;
  const scrolls = sameStep ? [...stage.querySelectorAll(".panel, .vc-table-wrap")].map((el) => el.scrollTop) : [];
  const open = new Set([...stage.querySelectorAll("details[open]")].map((d) => d.className));
  clear(stage);
  const live = S.mode === "live";
  const view = live && S.step === 0 ? intakeView(lang) : stepView(lang);
  // Past Start, every step names the company under its title; in the simulation with the words that say
  // it is fictional, so a room that joins late still knows what it is looking at.
  if (S.step > 0) {
    const company = live ? currentRun(lang).company?.name || "" : sc().company.name;
    const title = view.querySelector(".story #step-title");
    if (title && (company || !live)) title.after(companyLine(company, !live || currentRun(lang).company?.fictional === true));
  }
  // A live step that runs or stopped shows that in its bar; while an agent works, the rest of the step
  // waits, so what the request was built from can't change under it.
  if (live) {
    const own = (S.live.busy && S.live.busy.agent && S.live.busy.step === S.step) || (S.live.stop && S.live.stop.step === S.step);
    const bar = own ? liveBar() : null;
    if (bar) view.querySelector("#turn")?.replaceWith(bar);
    if (S.live.busy && S.live.busy.agent) for (const el of view.querySelectorAll(".evidence, .story > :not(#turn)")) el.inert = true;
  }
  stage.append(view);
  for (const d of stage.querySelectorAll("details")) if (open.has(d.className)) d.open = true;
  if (sameStep) [...stage.querySelectorAll(".panel, .vc-table-wrap")].forEach((el, i) => { if (scrolls[i]) el.scrollTop = scrolls[i]; });
  if (focusKey) {
    const target = findByKey(focusKey);
    if (target && !target.disabled) target.focus({ preventScroll: true });
    else if (!stage.contains(document.activeElement)) ($("#step-title") || stage).focus({ preventScroll: true });
  }
  lastStep = S.step;
  window.Vici?.init?.(stage);
  renderBar();
  renderKpis();
  drawPlay();
  drawFoot();
  fill(P.on && !waits() ? P.at / readMs() : 0);
}

/** The line under a step's title: the company, and in the simulation the fictional-company tag. */
function companyLine(company, fictional) {
  return h("p", { class: "step-company" },
    company ? h("span", { class: "step-company__name" }, company) : null,
    fictional ? h("span", { class: "vc-tag vc-tag--sm fiction-tag" }, t("fiction.tag")) : null);
}

/** Steps 2 to 6, and the simulation's Start: the same views for a replay and a live run. */
function stepView(lang) {
  const live = S.mode === "live";
  const s = live ? liveSc() : sc();
  const run = currentRun(lang);
  const marks = live ? liveMarks() : null;
  const picks = S.reached >= 4 ? run.shortlist.picks.map((p) => p.idea) : [];
  const groupValueOf = (id) => run.facts[`issue.${id}.eur`]?.value ?? null;
  switch (STEPS[S.step]) {
    case "read":
      return renderRead({
        run, lang, ideated: S.ideated,
        agentText: live ? liveReadText(run) : s.answers[lang].reader ? tn("read.agent.document", run.proposals.length) : run.proposals.length ? tn("read.agent.handoff", run.proposals.length) : t("read.agent.handoffNone"),
        groupValueOf,
        unchecked: marks?.issues || null,
        onDecide: (id, action, opts) => { S.decisions = decide(S.decisions || run.decisions || [], id, action, opts); log("decision", "read", { issue: id, action }); render(); },
        onIdeas: live ? () => askLive("ideas") : findIdeas,
        onNext: () => go(2, { keep: true })
      });
    case "ideate":
      return renderIdeate({
        run, lang, picks: S.decided ? picks : [], onOpen: openIdea, onNext: () => go(3, { keep: true }),
        agentExtra: live && S.live.repaired.ideator ? t("live.repaired") : "",
        unchecked: live && marks.ideas.size > 0
      });
    case "score":
      return renderScore({
        run, lang, picks: S.decided ? picks : [], weightsOpen: S.weightsOpen, draft: S.draft || { ...run.weights }, view: S.scoreView,
        onView: (v) => { S.scoreView = v; render(); },
        onToggleWeights: () => { S.weightsOpen = !S.weightsOpen; S.draft = S.draft || { ...run.weights }; render(); },
        onWeight: (c, v) => {
          S.draft = { ...(S.draft || run.weights), [c]: v };
          if (!weightProblems(S.draft).length) { S.weights = { ...S.draft }; log("decision", "score", { weights: S.weights }); }
          render();
        },
        onResetWeights: () => { S.draft = { ...DEFAULT_WEIGHTS }; S.weights = null; log("decision", "score", { weights: "default" }); render(); },
        onOpen: openIdea,
        onNext: () => go(4, { keep: true })
      });
    case "shortlist":
      return renderShortlist({
        run, lang, picks: run.shortlist.picks.map((p) => p.idea), decided: S.decided,
        onPlace: (id, place) => { S.picks = placeIdea(run.shortlist.picks.map((p) => p.idea), id, place); S.decided = false; if (S.reached > 4) S.reached = 4; log("decision", "shortlist", { idea: id, place }); render(); },
        onWrite: live ? () => askLive("write") : writeReport,
        onOpen: openIdea,
        onNext: () => go(5, { keep: true })
      });
    case "report": {
      if (!live) return renderReport({ run, lang, onAnother: () => { const ids = scenarios().map((x) => x.id); switchCompany(ids[(ids.indexOf(S.scenarioId) + 1) % ids.length]); ($("#step-title") || stage).focus({ preventScroll: true }); } });
      const meter = S.live.meter?.snapshot();
      const st = S.live.settings;
      const setting = st ? t("report.setting", { preset: t(`ld.preset.${st.preset}`), model: modelLabel(st.model), effort: t(`effort.${st.effort}`) }) : "";
      const seconds = Object.values(S.live.ms).reduce((a, b) => a + b, 0) / 1000;
      return renderReport({
        run, lang,
        live: {
          measured: t("report.measured", { cost: fmtEurSpend(meter ? meter.eur : 0), requests: tn("report.requests", meter ? meter.requests : 0), time: secondsWords(seconds), setting }),
          cutoff: t("report.cutoff"),
          onSave: saveRun,
          unchecked: marks.report,
          agentExtra: S.live.repaired.writer ? t("live.repaired") : ""
        }
      });
    }
    default:
      return renderStart({
        sc: s, scenarios: scenarios(), lang, today: today(), idle: S.reached === 0,
        undo: S.undo ? { text: t("start.undo.lead", { company: S.undo.company, what: S.undo.what }), onUndo: undoSwitch } : null,
        onChoose: (id) => { if (id !== S.scenarioId) switchCompany(id); },
        onStart: () => { begin(); play(); },
        onNext: () => go(1, { keep: true })
      });
  }
}

/** A live run's Start step: the drop zone, the run's fields and Start the agents. */
function intakeView(lang) {
  return renderIntake({
    lang, intake: liveIntake(), form: S.live.form, read: S.reached >= 1,
    reading: readingSize({ files: acceptedFiles(S.live.entries), form: S.live.form }).reading,
    undo: S.live.setAside && S.reached === 0 ? { text: t("intake.new.undo"), onUndo: undoNewRun } : null,
    onFiles: (files) => { addFiles(files); },
    onRemove: removeFile,
    onForm: (field, value) => { S.live.form[field] = value; liveChanged(); if (field === "count") render(); else renderKpis(); },
    onStart: () => askLive("read"),
    onNext: () => go(1, { keep: true }),
    onNew: newLiveRun,
    onBack: toSimulation
  });
}

/** The step bar: the current step, the steps done, those not reached yet, and whose turn it is. */
function renderBar() {
  const live = S.mode === "live";
  // While an agent works, the page stays on its step: the steps, Back, Next and the way back to the
  // simulation wait for the answer or for Stop.
  const busy = live && !!(S.live.busy && S.live.busy.agent);
  $$("#steps .vc-step").forEach((li, n) => {
    const b = li.querySelector(".vc-step__button");
    const current = n === S.step;
    li.classList.toggle("vc-step--current", current);
    li.classList.toggle("vc-step--done", n < S.step && n <= S.reached);
    if (current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    b.disabled = n > S.reached || busy;
    let turn = "";
    if (busy) turn = "";
    else if (n === 0 && S.reached === 0) turn = "p.turn.yours";
    else if (n === 1 && S.reached >= 1 && !S.ideated) turn = "p.turn.yours";
    else if (n === 4 && S.reached >= 4 && !S.decided) turn = "p.turn.decision";
    li.dataset.turn = turn ? "yours" : "";
    const hint = li.querySelector(".vc-step__hint");
    if (hint) hint.textContent = turn ? t(turn) : "";
  });
  $("#btn-back").disabled = S.step === 0 || busy;
  $("#btn-next").disabled = busy || !(S.step < S.reached || (S.step === 0 && S.reached === 0 && !live));
  const tagEl = $("#mode-tag");
  tagEl.dataset.mode = live ? "live" : "simulation";
  // LIVE wears Vici's solid tag, so nobody takes a live run for the replay.
  tagEl.classList.toggle("vc-tag--solid", live);
  $("#mode-text").textContent = live ? "LIVE" : "SIMULATION";
  const tip = $("#tip-mode");
  tip.dataset.i18n = live ? "p.mode.tipLive" : "p.mode.tip";
  tip.textContent = t(tip.dataset.i18n);
  const liveBtn = $("#btn-live");
  liveBtn.disabled = busy;
  const liveText = liveBtn.querySelector("[data-i18n]");
  liveText.dataset.i18n = live ? "p.live.back" : "p.live";
  liveText.textContent = t(liveText.dataset.i18n);
  liveBtn.querySelector(".vc-icon").className = `vc-icon vc-icon--${live ? "arrow-left" : "key"}`;
  document.documentElement.dataset.mode = S.mode;
}

function renderKpis() {
  const lang = getLang();
  let model;
  if (S.mode === "live") {
    const read = S.reached >= 1;
    const meter = S.live.meter?.snapshot();
    model = tileModel({
      mode: "live", lang, reached: S.reached,
      run: read ? currentRun(lang) : null,
      preview: read ? livePreview(lang) : null,
      live: { cost: meter && meter.requests > 0 ? { eur: meter.eur, capEur: meter.capEur } : null }
    });
  } else model = tileModel({ mode: "simulation", run: currentRun(lang), preview: previewRun(S.scenarioId, lang), reached: S.reached, lang });
  renderTiles(document, model);
}

/** The guide's figures, from scenario S1's recorded run in the page's language: the guide can't drift from the page. */
function fillGuide() {
  for (const lang of LANGS) {
    const run = previewRun("s1", lang);
    const model = tileModel({ mode: "simulation", run, preview: run, reached: 0, lang });
    const set = (key, text) => document.querySelectorAll(`#guide-${lang} [data-fig="${key}"]`).forEach((el) => { el.textContent = text; });
    set("kpi.atStake", model.stake.value);
    set("kpi.covered", model.covered.value);
    set("kpi.top", `${model.top.value} (${run.figures.top.name})`);
    set("kpi.cost", model.cost.value);
    set("talk.atStake", model.stake.value);
    set("talk.top", run.figures.top.name);
    set("talk.score", fmtScore(run.figures.top.value, lang));
    set("talk.firsts", t("score.st.of", { n: run.stability.counts[run.figures.top.id].firsts, of: run.stability.of }, lang));
    set("talk.ideas", String(run.ideas.length));
    set("talk.issues", String(run.issues.length));
    set("talk.kept", String(run.figures.covered.of));
    set("talk.thorough", costText(run.estimate.thorough.eur, lang));
  }
}

function announce(text) {
  const el = $("#announce");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = text; });
}

/** For the tests and the console: the state, and the actions a person can take. */
export const presenter = { state: S, go, play, pause, begin, findIdeas, writeReport, reset, render, switchCompany, undoSwitch, toLive, toSimulation, openDialog, stopLive, get playing() { return P.on; } };
