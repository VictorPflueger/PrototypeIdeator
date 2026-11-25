// The three downloads a run ends in (brief §9, PLAN.md §11): the report as a PDF through the browser's
// Save as PDF, the same report as an HTML file of its own, and the ideas file prototype-ideas/1. Vici's
// report pattern prints the report alone with the footer on every page and writes the HTML file
// (Vici.report.print and Vici.report.html); this module names the files, builds the ideas file from the
// run and checks it against schemas/prototype-ideas-1.json before it leaves. Nothing is stored: a download
// is the only way a result leaves the page, and anything shaped like a key is redacted from every file.

import { downloadText } from "./dom.js";
import { t } from "./i18n/index.js";
import { renderFacts } from "./facts.js";
import { validate, describeErrors } from "./schema.js";
import { IDEAS_FILE } from "./schemas.js";
import { redactSecrets } from "./keystore.js";
import { markDownloaded } from "./session.js";
import { APP } from "./config.js";

/** Today as an ISO day, in UTC like every date the run writes. */
export const today = () => {
  // The local date, not UTC: a report made in Berlin just after midnight is dated that day (review A17).
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A file name as the report's: prototype-ideator-<company>-<date>-<lang>, umlauts written out. */
export function fileName(company, lang, suffix, date = today()) {
  const slug = String(company || "run").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "run";
  return `prototype-ideator-${slug}-${date}-${lang}${suffix}`;
}

/**
 * A text file downloaded, with anything shaped like a key redacted. result: false for a file that is not the
 * run's result (a build brief), which leaves the leave-page warning as it is.
 */
export function saveText(name, text, mime, { result = true } = {}) {
  downloadText(name, redactSecrets(text), mime);
  if (result) markDownloaded();
}

/**
 * While the report prints, the page's title is the report's file name, which Save as PDF offers as the PDF's
 * name, as the challengers do; afterwards the title comes back. Returns the function that puts it back.
 */
function titled(name) {
  const was = document.title;
  if (name) document.title = name;
  return () => { document.title = was; };
}

/**
 * Save as PDF: the browser's print dialog on the report alone, with the footer on every page, offering the
 * file name `name` (prototype-ideator-<company>-<date>-<lang>). The person chooses Save as PDF as the printer;
 * the page can't choose it for them. The page can't tell a saved PDF from a cancelled dialog either, so a
 * print leaves the leave-page warning on; the HTML and ideas files clear it (review A12).
 */
export function printReport(report, name = "") {
  const untitle = titled(name);
  const after = () => { window.removeEventListener("afterprint", after); untitle(); };
  window.addEventListener("afterprint", after);
  if (window.Vici?.report?.print) window.Vici.report.print(report);
  else window.print();
}

/**
 * Ctrl+P prints the report alone too, wherever the page is: before the browser prints, the report the
 * step shows (or would show) is put in place under its file name; afterwards both go. reportFor() returns
 * { report, name }, or null to print the page as it is.
 */
export function printWithKeys(reportFor) {
  let undo = null;
  window.addEventListener("beforeprint", () => {
    if (document.querySelector("[data-vc-print]")) return;
    const found = reportFor();
    if (found?.report && window.Vici?.report?.prepare) {
      const unprint = window.Vici.report.prepare(found.report);
      const untitle = titled(found.name);
      undo = () => { unprint(); untitle(); };
    }
  });
  window.addEventListener("afterprint", () => { if (undo) { undo(); undo = null; } });
}

/** The report as an HTML file of its own: no script, nothing loaded, the light theme written out. */
export function reportHtml(report, title) {
  return redactSecrets(window.Vici.report.html(report, { title }));
}

/** Every string in a value with its {{fact:key}} placeholders filled, so the file reads right on its own. */
function filled(value, facts, lang) {
  if (typeof value === "string") return renderFacts(value, facts, lang);
  if (Array.isArray(value)) return value.map((v) => filled(v, facts, lang));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, filled(v, facts, lang)]));
  return value;
}

/** The step a live run finished before it stopped, for the ideas file. */
const AFTER = { reader: "start", merges: "start", ideator: "read", writer: "shortlist" };

/**
 * The ideas file, prototype-ideas/1: the issue map, the ideas, the weights, the scores, the stability check
 * and the shortlist as the engine has them. It holds where each issue was found, never a document's text,
 * and no prompt, answer or key. meta: { lang, mode, model (a live run's API id), setting (its preset),
 * stopped ({ agent, reason }), created (an ISO time), unchecked ({ issues, ideas, report }: the texts the
 * fact audit refused twice, as liveMarks gives them) }. prototype-ideas/1 has no field for those marks,
 * and a new field would mean a new schema name, so the disclaimer names them (review A10).
 */
export function ideasFile(run, meta) {
  const lang = meta.lang;
  const ideas = run.ideas || [];
  const issues = run.issues.map((i) => ({
    id: i.id,
    title: i.title,
    area: i.area || "",
    description: i.description || "",
    money_as_stated: i.money_as_stated ?? null,
    eur_year_low: typeof i.eur_year_low === "number" ? i.eur_year_low : null,
    eur_year_high: typeof i.eur_year_high === "number" ? i.eur_year_high : null,
    eur_year_expected: typeof i.eur_year_expected === "number" ? i.eur_year_expected : null,
    eur_basis: i.eur_basis ?? null,
    estimate: !!i.estimate,
    kpis: (i.kpis || []).map((k) => ({ id: k.id ?? null, name: k.name, unit: k.unit ?? null, today: k.today ?? null })),
    sources: i.source?.kind === "handoff"
      ? [{ file: i.source.file || "", where: i.source.issue ? `issue ${i.source.issue}` : "" }]
      : (i.quotes || []).map((q) => ({ file: q.file, where: q.where })),
    confidence: ["low", "medium", "high"].includes(i.confidence) ? i.confidence : "medium",
    status: i.status,
    merged_into: i.merged_into ?? null,
    park_reason: i.park_reason ?? null,
    from: { kind: i.source?.kind === "handoff" ? "handoff" : "document", tool: i.source?.tool?.name ?? null }
  }));
  const keep = ["id", "name", "what_it_does", "issues", "audience", "room", "how", "key_figures", "data", "risks", "effort_days", "live_inputs", "ratings", "why"];
  const st = run.stability;
  return {
    schema: "prototype-ideas/1",
    tool: { id: "prototype-ideator", name: APP.name, version: APP.version, url: APP.url },
    created: meta.created || new Date().toISOString(),
    language: lang,
    mode: meta.mode === "live" ? "live" : "simulation",
    model: meta.mode === "live" ? meta.model || null : null,
    setting: meta.mode === "live" && ["fast", "balanced", "thorough"].includes(meta.setting) ? meta.setting : null,
    company: { name: run.company?.name || "", sector: run.company?.sector || "other", fictional: run.company?.fictional === true },
    stopped: meta.stopped ? { after: AFTER[meta.stopped.agent] || "read", reason: meta.stopped.reason } : null,
    issues: filled(issues, run.facts, lang),
    ideas: filled(ideas.map((idea) => Object.fromEntries(keep.map((k) => [k, structuredClone(idea[k])]))), run.facts, lang),
    weights: { ...run.weights },
    scores: (run.ranked || []).map((r) => ({ idea: r.id, value: r.value, rank: r.rank })),
    stability: { of: st.of, rankings: st.rankings.map((r) => ({ label: r.label, order: [...r.order] })), counts: structuredClone(st.counts), sentence: run.sentence || "" },
    shortlist: { decided: !!run.shortlist?.decided, picks: ideas.length ? (run.shortlist?.picks || []).map((p) => ({ idea: p.idea, place: p.place, points: p.points })) : [] },
    disclaimer: [`${t("rep.ai", null, lang)}.`, uncheckedLine(run, meta.unchecked, lang), t("report.public", null, lang)].filter(Boolean).join(" ")
  };
}

/** The texts the fact audit refused twice, named in one sentence, or "" when there are none. */
function uncheckedLine(run, marks, lang) {
  if (!marks) return "";
  const names = [
    ...[...(marks.issues || [])].map((id) => run.issues.find((i) => i.id === id)?.title).filter(Boolean),
    ...[...(marks.ideas || [])].map((id) => (run.ideas || []).find((i) => i.id === id)?.name).filter(Boolean),
    ...[...(marks.report || [])].map((f) => t(`json.unchecked.${f}`, null, lang))
  ];
  return names.length ? t("json.unchecked", { items: names.join("; ") }, lang) : "";
}

/** What keeps an ideas file from its schema, one line each; empty when it validates. */
export function ideasProblems(file) {
  const v = validate(file, IDEAS_FILE, IDEAS_FILE.$defs);
  return v.valid ? [] : describeErrors(v.errors).split("\n");
}
