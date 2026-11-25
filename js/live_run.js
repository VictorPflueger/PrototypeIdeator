// A live run as a scenario (brief §7, PLAN.md §6.1): the person's files and the agents' answers in the shape
// js/simulation.js plays, so every screen past Start draws a live run with the very code that draws a replay,
// and the same engine computes its figures. It is held in the tab's memory only. Save run as simulation
// downloads it in the scenarios' own format with "source": "live" and its one language; a file Victor sends
// back is curated (the second language, the checks) and marked "recorded" (brief §7).
//
// The requests the agents send are built here too: the Reader's (the PDFs as document blocks, the text
// files as text), the merges request for several challengers' files, the Ideator's and the Writer's.

import { checkIntake } from "./documents.js";
import { readHandoffs } from "./handoff.js";
import { SECTORS, kpisFor } from "../data/kpis.js";
import { readerPrompt, readerInput, mergesPrompt, mergesInput, ideatorPrompt, ideatorInput, writerPrompt, writerInput, briefPrompt, briefInput, DEFAULT_CONSTRAINTS } from "./prompts.js";
import { readerSchema, mergesSchema, ideasSchema, recommendationSchema, briefSchema } from "./schemas.js";
import { LIMITS, APP } from "./config.js";
import { pdfTokens } from "./estimate.js";

const LANGS = ["en", "de"];
const both = (v) => ({ en: v, de: v });
const TEXT_KINDS = ["markdown", "text", "csv"];

/** The base64 of a PDF's bytes, for its document block; read in chunks so a large file fits the call stack. */
export function base64Of(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

/** The intake's accepted files: handoff files, PDFs and text files, each with what the run needs of it. */
export function acceptedFiles(entries) {
  return checkIntake(entries).files.filter((f) => !f.refusal).map((f) => ({
    id: f.id, name: f.name, kind: f.handoff ? "handoff" : f.kind, bytes: f.bytes, pages: f.pages, json: f.json, content: f.content, handoff: f.handoff
  }));
}

/** The constraints the person wrote, one a line, or the defaults (brief §6.1: Victor's pattern). */
export function constraintsOf(form, lang) {
  const own = String(form.constraints || "").split(/\n|;/).map((s) => s.trim()).filter(Boolean);
  return own.length ? own : [...(DEFAULT_CONSTRAINTS[lang] || DEFAULT_CONSTRAINTS.en)];
}

/** What reading the files takes: nothing (one challenger's file), the merges request, or the Reader. */
export function readingOf(files) {
  const docs = files.filter((f) => f.kind !== "handoff");
  const handoffs = files.filter((f) => f.kind === "handoff");
  if (docs.length) return "reader";
  if (new Set(handoffs.map((f) => f.handoff?.tool?.type)).size > 1) return "merges";
  return "none";
}

/** The company as the person, the challengers' files or the Reader name it, in that order. */
export function companyOf({ form = {}, files = [], reader = null }) {
  const read = files.filter((f) => f.kind === "handoff").map((f) => f.handoff).filter(Boolean);
  const fromHandoff = read[0]?.company || null;
  const sectorIds = new Set(SECTORS.map((s) => s.id));
  const sector = [form.sector, reader?.company?.sector, fromHandoff?.sector].find((s) => s && s !== "other" && sectorIds.has(s)) || "general";
  return {
    name: String(form.company || "").trim() || String(reader?.company?.name || "").trim() || fromHandoff?.name || "",
    sector,
    country: fromHandoff?.country || "",
    description: fromHandoff?.description || "",
    fictional: fromHandoff?.fictional === true
  };
}

/**
 * The live run as a scenario for js/simulation.js. answers: { reader, merges, ideas, recommendation } as the
 * agents returned them (null where a step hasn't run). The run's own language fills both languages: a live
 * run writes in one, and the page's labels follow the switch around it.
 */
export function liveScenario({ entries, form, answers = {}, runLang = "en", asOf }) {
  const files = acceptedFiles(entries);
  const company = companyOf({ form, files, reader: answers.reader });
  const documents = files.map((f, k) => ({
    id: `d${k + 1}`,
    kind: f.kind,
    tool: f.kind === "handoff" ? f.handoff.tool.type : null,
    name: both(f.name),
    title: null,
    href: null,
    stand_in: f.kind === "handoff" && /stand-in|platzhalter/i.test(f.json?.disclaimer || ""),
    fictional: f.kind === "handoff" && f.json?.company?.fictional === true,
    bytes: both(f.bytes || 1),
    pages: f.pages ? both(f.pages) : null
  }));
  const filesById = {};
  files.forEach((f, k) => { if (f.kind === "handoff") filesById[`d${k + 1}`] = both(f.json); });
  const text = new Map(files.filter((f) => TEXT_KINDS.includes(f.kind)).map((f) => [f.name, String(f.content ?? "")]));
  const recorded = {
    reader: answers.reader || null,
    merges: answers.merges || null,
    ideas: answers.ideas || { ideas: [] },
    recommendation: answers.recommendation || null,
    brief: null
  };
  return {
    schema: "pi-scenario/1",
    id: "live",
    source: "live",
    as_of: asOf,
    language: runLang,
    company: { name: company.name, sector: company.sector, country: company.country || "DE", fictional: company.fictional },
    pitch: both(company.description || company.name),
    count: Math.max(LIMITS.ideasMin, Math.min(LIMITS.ideasMax, Number(form.count) || LIMITS.ideasDefault)),
    focus: both(String(form.focus || "")),
    documents,
    files: filesById,
    facts: [],
    answers: { en: recorded, de: recorded },
    choices: { issues: null, weights: null, shortlist: [], brief_idea: null },
    reference: null,
    // Not part of the file: the text files' contents, so quotes from them are checked word for word.
    textOf: (name) => (text.has(name) ? text.get(name) : null)
  };
}

/**
 * The Reader's request content and what the budget needs of it: the files as blocks (each PDF a document
 * block, each text file a text block headed by its name) and the state as JSON. pdfPages: the PDFs' pages.
 */
export function readerRequest({ files, form, runLang }) {
  const docs = files.filter((f) => f.kind !== "handoff");
  const handoffIssues = files.filter((f) => f.kind === "handoff").flatMap((f) => f.handoff.issues);
  const content = [];
  for (const f of docs) {
    if (f.kind === "pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Of(f.content) }, title: f.name });
    else content.push({ type: "text", text: `FILE ${f.name}\n${String(f.content ?? "")}` });
  }
  const kpis = form.sector ? kpisFor(form.sector) : allKpis();
  content.push({ type: "text", text: readerInput({ company: { name: form.company || "", sector: form.sector || "", focus: form.focus || "" }, sectors: SECTORS, kpis, handoffIssues, files: docs }) });
  const pages = docs.filter((f) => f.kind === "pdf").reduce((s, f) => s + (f.pages || 0), 0);
  return { system: readerPrompt({ lang: runLang }), content, schema: readerSchema(), pdfPages: pages, pdfTokensHigh: pdfTokens(pages)[1] };
}

/** Every KPI of the library once: the Reader's list when the person named no sector. */
function allKpis() {
  return SECTORS.flatMap((s) => kpisFor(s.id)).filter((k, i, a) => a.findIndex((x) => x.id === k.id) === i);
}

/** The challengers' issues among the files, read without a request. */
export function handoffIssuesOf(files) {
  const handoffs = files.filter((f) => f.kind === "handoff");
  if (!handoffs.length) return [];
  const read = readHandoffs(handoffs.map((f) => ({ json: f.json, file: f.name })));
  return read.ok ? read.issues : [];
}

/**
 * What the reading request would carry, for the estimate before a run, without encoding any PDF: the
 * reading it takes, the Reader's state as JSON, the text files' characters, the PDFs' pages and the merges
 * request's state.
 */
export function readingSize({ files, form }) {
  const reading = readingOf(files);
  const docs = files.filter((f) => f.kind !== "handoff");
  const issues = handoffIssuesOf(files);
  const readerText = reading === "reader"
    ? readerInput({ company: { name: form.company || "", sector: form.sector || "", focus: form.focus || "" }, sectors: SECTORS, kpis: form.sector ? kpisFor(form.sector) : allKpis(), handoffIssues: issues, files: docs })
    : "";
  return {
    reading,
    readerText,
    textChars: docs.filter((f) => f.kind !== "pdf").reduce((n, f) => n + String(f.content ?? "").length, 0),
    pdfPages: docs.filter((f) => f.kind === "pdf").reduce((n, f) => n + (f.pages || 0), 0),
    mergesText: reading === "merges" ? mergesInput({ issues }) : ""
  };
}

/**
 * What a live run would send that looks private (brief §5.10): the text files, the challengers' reports and
 * the optional fields, each named by its file or its field. labels: { company, focus, constraints } in the
 * page's language. PDFs can't be searched here; the dialog says so.
 */
export function privateSources({ files, form, labels }) {
  const out = [];
  for (const f of files) {
    if (f.kind === "pdf") continue;
    out.push({ where: f.name, text: f.kind === "handoff" ? JSON.stringify(f.json) : String(f.content ?? "") });
  }
  for (const k of ["company", "focus", "constraints"]) if (String(form[k] || "").trim()) out.push({ where: labels[k] || k, text: String(form[k]) });
  return out;
}

/** The merges request for several challengers' files: titles only. */
export function mergesRequest({ issues, runLang }) {
  return { system: mergesPrompt({ lang: runLang }), content: [{ type: "text", text: mergesInput({ issues }) }], schema: mergesSchema() };
}

/** The Ideator's request: the kept issues, the company, focus, constraints, count, the sector's KPIs and the facts it may cite. */
export function ideatorRequest({ run, form, runLang }) {
  const count = Math.max(LIMITS.ideasMin, Math.min(LIMITS.ideasMax, Number(form.count) || LIMITS.ideasDefault));
  const input = ideatorInput({ company: run.company, issues: run.issues, focus: form.focus || "", constraints: constraintsOf(form, runLang), count, kpis: kpisFor(run.company.sector), facts: run.facts, lang: runLang });
  return { system: ideatorPrompt({ lang: runLang, count }), content: [{ type: "text", text: input }], schema: ideasSchema(count), count, citable: JSON.parse(input).facts };
}

/** The Writer's request: the company, the documents, the kept issues, the ranking and the fact keys. */
export function writerRequest({ run, runLang }) {
  const kept = run.issues.filter((i) => i.status === "kept");
  return { system: writerPrompt({ lang: runLang }), content: [{ type: "text", text: writerInput({ company: run.company, documents: run.documents, issues: kept, ranked: run.ranked, facts: run.facts }) }], schema: recommendationSchema() };
}

/** The Brief writer's request: the company, one idea from the Ideator, the kept issues it answers, the fact keys. */
export function briefRequest({ run, idea, runLang }) {
  const issues = [...new Set(idea.issues.map((id) => {
    const i = run.issues.find((x) => x.id === id);
    return i && i.status === "merged" ? run.issues.find((x) => x.id === i.merged_into) || i : i;
  }).filter(Boolean))];
  return { system: briefPrompt({ lang: runLang }), content: [{ type: "text", text: briefInput({ company: run.company, idea, issues, facts: run.facts }) }], schema: briefSchema() };
}

/**
 * Save run as simulation: the run in the scenarios' format, in its one language, with the person's choices
 * and the engine's figures as its reference. No key, no prompt, no thinking and no document text beyond the
 * Reader's quotes of up to 150 characters each, which its issues cite: the challengers' files stay (they are
 * the Reader's input), PDFs and text files are named only (review A13).
 */
export function savedRun(sc, { decisions, weights, picks, reference, settings, cost, timing, byAgent = {} }) {
  const usage = Object.fromEntries(Object.entries(byAgent).map(([agent, a]) => [agent, { requests: a.requests, input_tokens: a.input_tokens, output_tokens: a.output_tokens, max_output_tokens: a.max_output_tokens }]));
  const answers = Object.fromEntries(LANGS.map((l) => [l, l === sc.language ? sc.answers[l] : null]));
  return {
    schema: "pi-scenario/1",
    id: "live",
    source: "live",
    as_of: sc.as_of,
    language: sc.language,
    tool: { name: APP.name, version: APP.version, url: APP.url },
    company: { ...sc.company },
    pitch: Object.fromEntries(LANGS.map((l) => [l, l === sc.language ? sc.pitch[l] : null])),
    count: sc.count,
    focus: Object.fromEntries(LANGS.map((l) => [l, l === sc.language ? sc.focus[l] : null])),
    documents: sc.documents.map((d) => ({ ...d, name: Object.fromEntries(LANGS.map((l) => [l, l === sc.language ? d.name[l] : null])), bytes: { [sc.language]: d.bytes[sc.language] }, pages: d.pages ? { [sc.language]: d.pages[sc.language] } : null })),
    files: Object.fromEntries(Object.entries(sc.files).map(([id, f]) => [id, { [sc.language]: f[sc.language] }])),
    facts: [],
    answers,
    choices: { issues: decisions || [], weights: weights || null, shortlist: picks || [], brief_idea: null },
    reference,
    run: { setting: settings?.preset || null, model: settings?.model || null, effort: settings?.effort || null, cost_eur: cost ?? null, seconds: timing ?? null, usage }
  };
}
