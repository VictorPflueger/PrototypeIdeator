// The presenter (brief §7 and §8, PLAN.md §10): the six steps, one screen each, story on the left and
// evidence on the right; the Your turn bar with each step's one primary action; Play, which walks the
// steps at 7 to 14 seconds each and stops wherever the person acts; the key figures that answer first; the
// EN and DE switch without a reload; and Run it live, which opens the live Start step with the drop zone.
// Taken from the Data Quality Agent 2.2.0's app.js (Play, keys, deep links, focus and scroll kept across a
// re-render) with the Sovereignty Assessment's language switch.
//
// The simulation is a recorded run played through the same code a live run uses (js/simulation.js): the
// person's choices (keep, merge or park an issue, the weights, the shortlist) live here as plain values,
// and every render builds the run from them, so the tiles, the table, the chart, the stability sentence
// and the summary always agree with the engine. Space plays or pauses; the arrow keys, PageDown and
// PageUp move; ?scenario=s1&step=4 plays the recorded run up to the fourth step, paused.

import { setLang, getLang, onLang, t, tn } from "./i18n/index.js";
import { scenarios, scenarioById } from "./scenarios.js";
import { buildRun, recordedRun } from "./simulation.js";
import { decide, applyDecisions } from "./issues.js";
import { tileModel, renderTiles, costText } from "./kpis.js";
import { factValues, DEFAULT_WEIGHTS, weightProblems, atStake } from "./engine.js";
import { readHandoffs } from "./handoff.js";
import { readFile, checkIntake } from "./documents.js";
import { addDocument, removeDocument, addEvent } from "./session.js";
import { renderStart } from "./views/start.js";
import { renderIntake } from "./views/intake.js";
import { renderRead } from "./views/read.js";
import { renderIdeate, ideaPage } from "./views/ideate.js";
import { renderScore } from "./views/score.js";
import { renderShortlist, placeIdea } from "./views/shortlist.js";
import { renderReport } from "./views/report.js";
import { clear, h } from "./dom.js";
import { fmtScore } from "./format.js";
import { LIMITS } from "./config.js";

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
  live: { entries: [], form: { count: LIMITS.ideasDefault, company: "", sector: "", focus: "", constraints: "" }, read: false, decisions: [] }
};

/** Play: on, the frame it asked for, the time spent reading the step, the step it timed, the last frame. */
const P = { on: false, raf: 0, at: 0, step: -1, last: 0 };
let stage;
let lastStep = -1;
const runCache = new Map();

const sc = () => scenarioById(S.scenarioId) || scenarios()[0];

/** The run of the current scenario in a language, built from the person's choices (cached per state). */
function currentRun(lang = getLang()) {
  const key = JSON.stringify([S.scenarioId, lang, S.decisions, S.weights, S.picks, S.decided]);
  if (!runCache.has(key)) {
    if (runCache.size > 40) runCache.clear();
    runCache.set(key, buildRun(sc(), lang, { decisions: S.decisions, weights: S.weights, picks: S.picks, decided: S.decided }));
  }
  return runCache.get(key);
}
function previewRun(id = S.scenarioId, lang = getLang()) {
  const key = `preview|${id}|${lang}`;
  if (!runCache.has(key)) runCache.set(key, recordedRun(scenarioById(id), lang));
  return runCache.get(key);
}

/** The live run's reading: the handoff files' issues with the person's decisions, no request. */
function liveRun(lang = getLang()) {
  const intake = checkIntake(S.live.entries);
  const ok = intake.files.filter((f) => !f.refusal && f.handoff);
  const read = ok.length ? readHandoffs(ok.map((f) => ({ json: f.json, file: f.name }))) : { ok: false, issues: [], company: null };
  const issues = read.ok ? applyDecisions(read.issues, S.live.decisions) : [];
  const facts = factValues({ issues, ideas: [], lang });
  const documents = intake.files.filter((f) => !f.refusal).map((f) => ({ id: f.id, name: f.name, kind: f.handoff ? "handoff" : f.kind, bytes: f.bytes, pages: f.pages, stand_in: false, fictional: false, from: "upload" }));
  return { intake, issues, proposals: [], documents, facts, company: read.company, tools: read.tools || [], figures: { atStake: atStake(issues) } };
}

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
  Object.assign(S, { scenarioId: id, step: 0, reached: 0, decisions: null, weights: null, draft: null, picks: null, decided: false, ideated: false, weightsOpen: false, scoreView: "chart" });
}

/** Start: the Reader reads the scenario's files; the page shows the Read step. */
function begin() {
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

/** Run it live: the Start step becomes the drop zone; the tiles wait for the run. */
function toLive() {
  pause();
  S.mode = "live";
  S.step = 0;
  S.reached = S.live.read ? 1 : 0;
  history.replaceState(null, "", location.pathname + (new URLSearchParams(location.search).has("lang") ? `?lang=${getLang()}` : ""));
  render();
  announce(t("live.now"));
  ($("#step-title") || stage).focus({ preventScroll: true });
}

function toSimulation() {
  S.mode = "simulation";
  reset(S.scenarioId);
  syncUrl();
  render();
  announce(t("live.back"));
  ($("#step-title") || stage).focus({ preventScroll: true });
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
  S.live.read = false;
  S.live.decisions = [];
  S.reached = 0;
  render();
  const intake = checkIntake(S.live.entries);
  announce(tn("intake.added", files.length, { refused: intake.files.filter((f) => f.refusal).length }));
}

function removeFile(id) {
  S.live.entries = S.live.entries.filter((e) => e.id !== id);
  removeDocument(id);
  S.live.read = false;
  S.live.decisions = [];
  S.reached = 0;
  render();
  $("#intake-files")?.focus();
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
  body.append(ideaPage(idea, { run, lang: getLang() }));
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
  const view = S.mode === "live" ? liveView(lang) : simulationView(lang);
  // Past Start, every step names the company under its title; in the simulation with the words that say
  // it is fictional, so a room that joins late still knows what it is looking at.
  if (S.step > 0) {
    const company = S.mode === "live" ? liveRun(lang)?.company?.name || "" : sc().company.name;
    const title = view.querySelector(".story #step-title");
    if (title && (company || S.mode !== "live")) title.after(companyLine(company, S.mode !== "live"));
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

function simulationView(lang) {
  const s = sc();
  const run = currentRun(lang);
  const picks = S.reached >= 4 ? run.shortlist.picks.map((p) => p.idea) : [];
  const groupValueOf = (id) => run.facts[`issue.${id}.eur`]?.value ?? null;
  switch (STEPS[S.step]) {
    case "read":
      return renderRead({
        run, lang, ideated: S.ideated, live: false,
        agentText: s.answers[lang].reader ? tn("read.agent.document", run.proposals.length) : run.proposals.length ? tn("read.agent.handoff", run.proposals.length) : t("read.agent.handoffNone"),
        groupValueOf,
        onDecide: (id, action, opts) => { S.decisions = decide(S.decisions || s.choices.issues || [], id, action, opts); log("decision", "read", { issue: id, action }); render(); },
        onIdeas: findIdeas,
        onNext: () => go(2, { keep: true })
      });
    case "ideate":
      return renderIdeate({ run, lang, picks: S.decided ? picks : [], onOpen: openIdea, onNext: () => go(3, { keep: true }) });
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
        onWrite: writeReport,
        onOpen: openIdea,
        onNext: () => go(5, { keep: true })
      });
    case "report":
      return renderReport({ run, lang, onAnother: () => { const ids = scenarios().map((x) => x.id); reset(ids[(ids.indexOf(S.scenarioId) + 1) % ids.length]); syncUrl(); render(); ($("#step-title") || stage).focus({ preventScroll: true }); } });
    default:
      return renderStart({
        sc: s, scenarios: scenarios(), lang, today: today(), idle: S.reached === 0,
        onChoose: (id) => { if (id === S.scenarioId) return; reset(id); syncUrl(); render(); announce(t("start.chosen", { company: sc().company.name })); },
        onStart: () => { begin(); play(); },
        onNext: () => go(1, { keep: true })
      });
  }
}

function liveView(lang) {
  const live = liveRun(lang);
  if (STEPS[S.step] === "read" && S.live.read) {
    return renderRead({
      run: live, lang, ideated: false, live: true,
      agentText: live.tools.length > 1 ? t("read.agent.liveMany") : t("read.agent.live"),
      groupValueOf: (id) => live.facts[`issue.${id}.eur`]?.value ?? null,
      onDecide: (id, action, opts) => { S.live.decisions = decide(S.live.decisions, id, action, opts); render(); },
      onIdeas: () => {},
      onNext: () => {}
    });
  }
  return renderIntake({
    lang, intake: live.intake, form: S.live.form,
    onFiles: (files) => { addFiles(files); },
    onRemove: removeFile,
    onForm: (field, value) => { S.live.form[field] = value; if (field === "count") render(); },
    onRead: () => { S.live.read = true; S.reached = 1; log("issue_map", "read", { issues: liveRun().issues.length, requests: 0 }); go(1, { keep: true }); },
    onBack: toSimulation
  });
}

/** The step bar: the current step, the steps done, those not reached yet, and whose turn it is. */
function renderBar() {
  const live = S.mode === "live";
  $$("#steps .vc-step").forEach((li, n) => {
    const b = li.querySelector(".vc-step__button");
    const current = n === S.step;
    li.classList.toggle("vc-step--current", current);
    li.classList.toggle("vc-step--done", n < S.step && n <= S.reached);
    if (current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    b.disabled = n > S.reached || (live && n > 1);
    let turn = "";
    if (n === 0 && S.reached === 0) turn = "p.turn.yours";
    else if (!live && n === 1 && S.reached >= 1 && !S.ideated) turn = "p.turn.yours";
    else if (!live && n === 4 && S.reached >= 4 && !S.decided) turn = "p.turn.decision";
    li.dataset.turn = turn ? "yours" : "";
    const hint = li.querySelector(".vc-step__hint");
    if (hint) hint.textContent = turn ? t(turn) : "";
  });
  $("#btn-back").disabled = S.step === 0;
  $("#btn-next").disabled = !(S.step < S.reached || (S.step === 0 && S.reached === 0 && !live));
  const tagEl = $("#mode-tag");
  tagEl.dataset.mode = live ? "live" : "simulation";
  // LIVE wears Vici's solid tag, so nobody takes a live run for the replay.
  tagEl.classList.toggle("vc-tag--solid", live);
  $("#mode-text").textContent = live ? "LIVE" : "SIMULATION";
  const tip = $("#tip-mode");
  tip.dataset.i18n = live ? "p.mode.tipLive" : "p.mode.tip";
  tip.textContent = t(tip.dataset.i18n);
  const liveBtn = $("#btn-live");
  const liveText = liveBtn.querySelector("[data-i18n]");
  liveText.dataset.i18n = live ? "p.live.back" : "p.live";
  liveText.textContent = t(liveText.dataset.i18n);
  liveBtn.querySelector(".vc-icon").className = `vc-icon vc-icon--${live ? "arrow-left" : "key"}`;
  document.documentElement.dataset.mode = S.mode;
}

function renderKpis() {
  const lang = getLang();
  const model = S.mode === "live"
    ? (() => { const l = liveRun(lang); return tileModel({ mode: "live", lang, live: S.live.read ? { issues: l.issues, atStake: l.figures.atStake } : {} }); })()
    : tileModel({ mode: "simulation", run: currentRun(lang), preview: previewRun(S.scenarioId, lang), reached: S.reached, lang });
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
export const presenter = { state: S, go, play, pause, begin, findIdeas, writeReport, reset, render, get playing() { return P.on; } };
