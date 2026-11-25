// The tab's session record (brief §5.9): the run's events and whether a result exists that hasn't been
// downloaded, with the documents the person added. The live run itself, its files' text and bytes, the
// fields and the agents' answers, lives in the presenter's state (S.live in js/presenter.js), and the key
// in js/keystore.js, which the four tools share. All of it lives in memory and nowhere else: nothing is
// written to local storage, session storage, IndexedDB, the Cache API or a cookie, put in a URL or logged,
// and a reload or a closed tab ends it. The person keeps a result only by downloading it. "Clear
// everything" on the live Start step empties the presenter's run, this record and the key. While a result
// exists that hasn't been downloaded, the browser asks before the page is left.

import { forgetKey } from "./keystore.js";
import { APP } from "./config.js";

function blank() {
  return {
    mode: "simulation",          // "simulation" or "live"
    scenario: null,              // the scenario's id in the simulation
    documents: [],               // Document contracts, without their content
    contents: new Map(),         // document id → text, or the PDF's base64; never exported
    form: { ideas: null, company: "", sector: "", focus: "", constraints: "" },
    issueMap: null,
    ideas: [],
    weights: null,
    shortlist: null,
    recommendation: null,
    brief: null,
    events: [],
    result: false,               // true once a run has produced something worth keeping
    downloaded: false            // true once that result has been downloaded since it last changed
  };
}

let state = blank();
const listeners = new Set();

function notify() {
  for (const fn of [...listeners]) {
    try { fn(state); } catch (e) { console.error(`[${APP.name}] session listener failed:`, e); }
  }
}

/** The session, read-only by convention: change it through the functions below. */
export function session() {
  return state;
}

/** Calls fn(session) after every change. Returns an unsubscribe function. */
export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Changes plain fields of the session (not documents, contents or events). */
export function updateSession(patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === "contents" || k === "documents" || k === "events") continue;
    if (Object.hasOwn(state, k)) state[k] = v;
  }
  notify();
}

/** Adds a document and its content (text, or a PDF's base64), held in memory only. */
export function addDocument(meta, content) {
  state.documents = [...state.documents, { ...meta }];
  state.contents.set(meta.id, content);
  notify();
}

/** Removes a document and its content. */
export function removeDocument(id) {
  state.documents = state.documents.filter((d) => d.id !== id);
  state.contents.delete(id);
  notify();
}

/** A document's content, or undefined. */
export function contentOf(id) {
  return state.contents.get(id);
}

/** Appends a run event. */
export function addEvent(event) {
  state.events = [...state.events, event];
  notify();
}

/** A result now exists that the person may want to keep; the leave-page warning starts. */
export function markResult() {
  state.result = true;
  state.downloaded = false;
  notify();
}

/** The person downloaded the result; the leave-page warning stops until the result changes. */
export function markDownloaded() {
  state.downloaded = true;
  notify();
}

/** True while a result exists that hasn't been downloaded. */
export function hasUnsavedResult() {
  return state.result && !state.downloaded;
}

/** "Clear everything": the session starts again and the key is forgotten. */
export function clearEverything() {
  state.contents.clear();
  state = blank();
  forgetKey();
  notify();
}

/**
 * The browser's own leave-page warning while a result hasn't been downloaded. `target` is the window;
 * returns a function that removes the listener.
 */
export function installLeaveWarning(target = globalThis.window) {
  if (!target?.addEventListener) return () => {};
  const onLeave = (event) => {
    if (!hasUnsavedResult()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  target.addEventListener("beforeunload", onLeave);
  return () => target.removeEventListener("beforeunload", onLeave);
}
