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

/**
 * A PDF's page count from its bytes, without a library: the page objects ("/Type /Page"), or the page
 * tree's largest /Count when the objects are compressed. null when neither shows.
 */
export function pdfPageCount(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) text += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  const pages = (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  if (pages) return pages;
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map((m) => Number(m[1] || m[2]));
  return counts.length ? Math.max(...counts) : null;
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
  if (e.kind === "pdf" && e.pages === null) return null;
  return null;
}

/** A File read into an intake entry, in memory: its text or bytes, its page count and, for JSON, the parse. */
export async function readFile(file, id) {
  const kind = kindOf(file.name, file.type);
  const entry = { id, name: file.name, kind, bytes: file.size, pages: null, json: undefined, content: null };
  if (kind === "office" || kind === "unknown") return entry;
  if (kind === "pdf") {
    const buf = new Uint8Array(await file.arrayBuffer());
    entry.pages = pdfPageCount(buf);
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
