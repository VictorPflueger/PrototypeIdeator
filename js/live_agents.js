// The live run's agents, one request each (brief §5.2, PLAN.md §8.1): reading (nothing for one challenger's
// file, the Reader's merges request for several challengers' files, the Reader on documents), the Ideator on
// the kept issues, the Writer on the shortlist and, on request, the Brief writer on one shortlisted idea.
// Each builds its request from the run's state with js/live_run.js, checks the answer with its guards in
// js/guards.js (js/brief.js for the Brief writer) and goes through js/pipeline.js, which
// keeps the request under the budget cap and sends a failing answer back once. A PDF's tokens are counted
// first by the free endpoint, so the cap sees the real input before the Reader's request goes out.
//
// Pure apart from the requests: no DOM, no storage, no console. The presenter holds what comes back.

import { runStep } from "./pipeline.js";
import { countTokens } from "./count.js";
import { acceptedFiles, readingOf, readerRequest, mergesRequest, ideatorRequest, writerRequest, briefRequest, handoffIssuesOf } from "./live_run.js";
import { readerProblems, mergesProblems, ideaProblems, writerProblems } from "./guards.js";
import { briefProblems, briefEvidence } from "./brief.js";
import { evidenceOf } from "./simulation.js";
import { tokensOf } from "./estimate.js";

function abortError() {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}

/**
 * Reading the files. Returns { reading, reader, merges, unchecked, repaired, ms }: reading is none (one
 * challenger's file, no request), merges or reader. ctx: { entries, form, runLang, key, settings, meter,
 * signal, onEvent }.
 */
export async function readStep({ entries, form, runLang, key, settings, meter, signal, onEvent = () => {}, send }) {
  const files = acceptedFiles(entries);
  const reading = readingOf(files);
  const none = { reading, reader: null, merges: null, unchecked: [], repaired: false, ms: 0 };
  if (reading === "none") return none;
  const issues = handoffIssuesOf(files);
  const evidence = evidenceOf(issues);
  if (reading === "merges") {
    const req = mergesRequest({ issues, runLang });
    const out = await runStep({
      agent: "merges", key, settings, system: req.system, content: req.content, schema: req.schema, meter, signal, onEvent, send,
      check: (a) => mergesProblems(a, { issues, evidence })
    });
    return { ...none, merges: out.answer, unchecked: out.unchecked, repaired: out.repaired, ms: out.ms };
  }
  const req = readerRequest({ files, form, runLang });
  let pdf = 0;
  if (req.pdfPages) {
    // The count covers the prompt and every block; the text's share is taken out again, since the
    // pipeline counts the text itself.
    onEvent({ type: "counting", agent: "reader" });
    const counted = await countTokens({ key, body: { model: settings.model, system: req.system, messages: [{ role: "user", content: req.content }] }, signal });
    if (signal?.aborted) throw abortError();
    const text = tokensOf(req.system) + req.content.filter((b) => b.type === "text").reduce((s, b) => s + tokensOf(b.text), 0);
    pdf = counted ? Math.max(0, counted - text) : req.pdfTokensHigh;
  }
  // A number the Reader writes in a title or description passes the fact audit when a text file or a
  // challenger's issue holds it; code can't read a PDF's text, so a PDF's numbers belong in the fields made
  // for them.
  const docs = files.filter((f) => f.kind !== "handoff").map((f) => ({ name: f.name, kind: f.kind, content: f.kind === "pdf" ? null : String(f.content ?? "") }));
  const readerEvidence = { ...evidence, texts: [...evidence.texts, ...docs.filter((d) => d.content).map((d) => d.content)] };
  const out = await runStep({
    agent: "reader", key, settings, system: req.system, content: req.content, schema: req.schema, meter, signal, onEvent, send, pdfTokens: pdf,
    check: (a) => readerProblems(a, { files: docs, evidence: readerEvidence })
  });
  return { ...none, reader: out.answer, unchecked: out.unchecked, repaired: out.repaired, ms: out.ms };
}

/**
 * The Ideator on the run as it stands (the kept issues). Returns { ideas, unchecked, repaired, ms, count,
 * trimmed }: trimmed is { from, to } when the repaired answer still held more ideas than were asked for and
 * code kept the first ones, refusing the rest (brief §6.1), rather than stopping the run; null otherwise.
 */
export async function ideasStep({ run, form, runLang, key, settings, meter, signal, onEvent = () => {}, send }) {
  const req = ideatorRequest({ run, form, runLang });
  let trimmed = null;
  const out = await runStep({
    agent: "ideator", key, settings, system: req.system, content: req.content, schema: req.schema, meter, signal, onEvent, send,
    check: (a, { attempt = 1 } = {}) => {
      // The first answer with too many ideas goes back once (AC-17); after that, the ideas past the number
      // asked for are refused one by one, and the answer is checked without them. The prompt asks for the
      // strongest first.
      if (attempt > 1 && Array.isArray(a?.ideas) && a.ideas.length > req.count) {
        trimmed = { from: a.ideas.length, to: req.count };
        a.ideas.splice(req.count);
      }
      return ideaProblems(a, { count: req.count, issues: run.issues, facts: req.citable, evidence: run.evidence });
    }
  });
  return { ideas: out.answer, unchecked: out.unchecked, repaired: out.repaired, ms: out.ms, count: req.count, trimmed };
}

/** The Writer on the shortlist. Returns { recommendation, unchecked, repaired, ms }. */
export async function writerStep({ run, runLang, key, settings, meter, signal, onEvent = () => {}, send }) {
  const req = writerRequest({ run, runLang });
  const facts = Object.keys(run.facts);
  const out = await runStep({
    agent: "writer", key, settings, system: req.system, content: req.content, schema: req.schema, meter, signal, onEvent, send,
    check: (a) => writerProblems(a, { facts, evidence: run.evidence })
  });
  return { recommendation: out.answer, unchecked: out.unchecked, repaired: out.repaired, ms: out.ms };
}

/**
 * The Brief writer on one shortlisted idea: the idea's own part of its build brief, checked against the
 * template's fixed parts. Returns { brief, unchecked, repaired, ms }.
 */
export async function briefStep({ run, idea, runLang, key, settings, meter, signal, onEvent = () => {}, send }) {
  const req = briefRequest({ run, idea, runLang });
  const facts = Object.keys(run.facts);
  const evidence = briefEvidence(run, idea);
  const out = await runStep({
    agent: "brief", key, settings, system: req.system, content: req.content, schema: req.schema, meter, signal, onEvent, send,
    check: (a) => briefProblems(a, { facts, evidence })
  });
  return { brief: out.answer, unchecked: out.unchecked, repaired: out.repaired, ms: out.ms };
}
