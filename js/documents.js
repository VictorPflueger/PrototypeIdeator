// Intake (brief §6.1, AC-18): which files a live run takes and what it says about the others. Up to five
// files, 20 MB in all and 100 PDF pages; PDF, Markdown, text and CSV go to the Reader, a challenger's
// handoff file (JSON with "schema": "strategy-challenge/1") becomes issues without any request, and Word,
// PowerPoint and other office files are refused with "Save it as PDF first". Everything read stays in the
// tab's memory (js/session.js). The rules are pure, so the tests run them in Node; reading a File object
// is the only browser part.

import { LIMITS } from "./config.js";
import { readHandoff } from "./handoff.js";

const EXT = {
  pdf: ["pdf"],
  markdown: ["md", "markdown"],
  text: ["txt", "text"],
  csv: ["csv"],
  json: ["json"],
  office: ["doc", "docx", "docm", "dot", "dotx", "ppt", "pptx", "pptm", "pps", "ppsx", "xls", "xlsx", "xlsm", "odt", "odp", "ods", "rtf", "pages", "key", "numbers"]
};

/** What a file is, from its name and type: pdf, markdown, text, csv, json, office or unknown. */
export function kindOf(name = "", type = "") {
  const ext = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  for (const [kind, list] of Object.entries(EXT)) if (list.includes(ext)) return kind;
  if (type === "application/pdf") return "pdf";
  if (type === "application/json") return "json";
  if (type === "text/csv") return "csv";
  if (type === "text/markdown") return "markdown";
  if (/^text\//.test(type)) return "text";
  if (/officedocument|msword|ms-excel|ms-powerpoint|opendocument/.test(type)) return "office";
  return "unknown";
}

/** The accept attribute of the drop zone's input. */
export const ACCEPT = ".pdf,.md,.markdown,.txt,.csv,.json,application/pdf,text/markdown,text/plain,text/csv,application/json";

/** Bytes as a string, one character a byte, so a PDF's keywords can be found with a regular expression. */
function latin1(u8) {
  let text = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) text += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  return text;
}

/** The pages a PDF's text shows: its page objects, else the page tree's largest /Count, else null. */
function pagesIn(texts) {
  const pages = texts.reduce((n, text) => n + (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length, 0);
  if (pages) return pages;
  const counts = texts.flatMap((text) => [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map((m) => Number(m[1] || m[2])));
  return counts.length ? Math.max(...counts) : null;
}

/**
 * A PDF's page count from its bytes, without a library: the page objects ("/Type /Page"), or the page
 * tree's largest /Count, or a linearized file's page count (/N). null when none shows, as when the page
 * objects sit in compressed object streams (PDF 1.5); pdfPages() reads those too.
 */
export function pdfPageCount(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const text = latin1(u8);
  const found = pagesIn([text]);
  if (found !== null) return found;
  const linearized = text.slice(0, 2048).match(/\/Linearized\b[^>]*?\/N\s+(\d+)/);
  return linearized ? Number(linearized[1]) : null;
}

/** A Flate stream's bytes inflated as text, or null when they don't inflate. */
async function inflate(u8) {
  if (typeof DecompressionStream !== "function") return null;
  try {
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate"));
    return latin1(new Uint8Array(await new Response(stream).arrayBuffer()));
  } catch {
    return null;
  }
}

/**
 * The texts of a PDF's object streams (/Type /ObjStm), inflated: where PDF 1.5 and later keep the page
 * objects compressed. Only Flate streams are read, at their direct /Length or up to "endstream".
 */
async function objectStreams(u8, text) {
  const out = [];
  for (const m of text.matchAll(/\/Type\s*\/ObjStm\b/g)) {
    const kw = text.indexOf("stream", m.index);
    if (kw < 0) continue;
    const dict = text.slice(Math.max(0, text.lastIndexOf(" obj", m.index)), kw);
    if (!/\/Filter\s*(\[\s*)?\/FlateDecode\b/.test(dict) || /\/DecodeParms/.test(dict)) continue;
    let start = kw + 6;
    if (text[start] === "\r") start += 1;
    if (text[start] === "\n") start += 1;
    const end = text.indexOf("endstream", start);
    if (end < 0) continue;
    const length = dict.match(/\/Length\s+(\d+)(?![\d\s]*R)/);
    let stop = length && start + Number(length[1]) <= end ? start + Number(length[1]) : end;
    if (!length) while (stop > start && (u8[stop - 1] === 0x0a || u8[stop - 1] === 0x0d)) stop -= 1;
    const inflated = await inflate(u8.subarray(start, stop));
    if (inflated !== null) out.push(inflated);
  }
  return out;
}

/**
 * A PDF's page count as the intake reads it (AC-18): the plain scan, and the compressed object streams of
 * PDF 1.5 and later when the file has them, so a long report saved that way can't skip the 100-page limit
 * (review A2). null when neither shows the pages, as in an encrypted PDF: the intake refuses that file.
 */
export async function pdfPages(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const text = latin1(u8);
  if (!/\/Type\s*\/ObjStm\b/.test(text)) return pdfPageCount(u8);
  const found = pagesIn([text, ...(await objectStreams(u8, text))]);
  return found !== null ? found : pdfPageCount(u8);
}

/** Megabytes in words for the limits' messages, one decimal. */
const mb = (bytes) => Math.round((bytes / 1048576) * 10) / 10;

/**
 * The files of an intake, checked: entries [{ id, name, kind, bytes, pages, json, problem }] where json
 * is a parsed JSON file, else undefined. Returns { files, problems }: each file with its refusal (a code
 * and its values, which the page words in its language), and the problems of the whole intake (too many
 * files, too many bytes, too many pages).
 */
export function checkIntake(entries) {
  const files = entries.map((e) => ({ ...e, refusal: refusalOf(e), handoff: null }));
  for (const f of files) {
    if (f.refusal || f.kind !== "json") continue;
    const r = readHandoff(f.json, { file: f.name });
    if (r.ok) f.handoff = r;
    else f.refusal = r.reason === "not-handoff" ? { code: "notHandoff" } : r.reason === "version" ? { code: "version", detail: r.problems[0] } : { code: "invalid", detail: r.problems.slice(0, 2).join("; ") };
  }
  const problems = [];
  const counted = files.filter((f) => !f.refusal);
  if (counted.length > LIMITS.files) {
    for (const f of counted.slice(LIMITS.files)) f.refusal = { code: "tooMany" };
    problems.push({ code: "files", max: LIMITS.files });
  }
  const kept = files.filter((f) => !f.refusal);
  const bytes = kept.reduce((s, f) => s + (f.bytes || 0), 0);
  if (bytes > LIMITS.totalBytes) problems.push({ code: "bytes", mb: mb(bytes), max: mb(LIMITS.totalBytes) });
  const pages = kept.filter((f) => f.kind === "pdf").reduce((s, f) => s + (f.pages || 0), 0);
  if (pages > LIMITS.pdfPages) problems.push({ code: "pages", pages, max: LIMITS.pdfPages });
  const companies = [...new Set(kept.filter((f) => f.handoff).map((f) => f.handoff.company.name.trim().toLowerCase()))];
  if (companies.length > 1) problems.push({ code: "companies" });
  const tools = kept.filter((f) => f.handoff).map((f) => f.handoff.tool.type);
  if (new Set(tools).size < tools.length) problems.push({ code: "twice" });
  return { files, problems, ready: kept.length > 0 && !problems.length, handoffOnly: kept.length > 0 && kept.every((f) => f.handoff) };
}

function refusalOf(e) {
  if (e.kind === "office") return { code: "office" };
  if (e.kind === "unknown") return { code: "unknown" };
  if (e.kind === "json" && e.json === undefined) return { code: "badJson" };
  // A PDF whose pages can't be counted can't be held to the page limit or priced before the run (review A2).
  if (e.kind === "pdf" && !(Number.isInteger(e.pages) && e.pages > 0)) return { code: "pdfPages" };
  return null;
}

/** A File read into an intake entry, in memory: its text or bytes, its page count and, for JSON, the parse. */
export async function readFile(file, id) {
  const kind = kindOf(file.name, file.type);
  const entry = { id, name: file.name, kind, bytes: file.size, pages: null, json: undefined, content: null };
  if (kind === "office" || kind === "unknown") return entry;
  if (kind === "pdf") {
    const buf = new Uint8Array(await file.arrayBuffer());
    entry.pages = await pdfPages(buf);
    entry.content = buf;
    return entry;
  }
  const text = await file.text();
  entry.content = text;
  if (kind === "json") {
    try { entry.json = JSON.parse(text); } catch { entry.json = undefined; }
  }
  return entry;
}
