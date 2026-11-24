// The session-cost estimate (brief §5.5 and §5.6, PLAN.md §9.4): each step's request rebuilt from the real
// prompt, the state the step sends and its output schema, priced with the shared cost model. A recorded
// run gives the answers' sizes; a live run before it starts uses the expected sizes below. Assumptions,
// stated in the guide: about four characters a token; a thinking allowance per step on Balanced and
// Thorough; a PDF page at 1,500 to 3,000 text tokens plus 1,568 image tokens, which a live run replaces
// with the free token count. The result is a range, low and high, in tokens, dollars and euros.

import { ESTIMATE, PRESETS, FX_USD_EUR } from "./config.js";
import { usageCostUsd } from "./cost.js";
import { readerPrompt, mergesPrompt, ideatorPrompt, writerPrompt } from "./prompts.js";
import { readerSchema, mergesSchema, ideasSchema, recommendationSchema } from "./schemas.js";

/** Tokens of a text at about four characters a token. */
export const tokensOf = (text) => Math.ceil(String(text ?? "").length / ESTIMATE.charsPerToken);
const json = (v) => JSON.stringify(v ?? null);

/** A PDF's tokens by Anthropic's rule, per page: [low, high]. */
export function pdfTokens(pages) {
  const n = Math.max(0, Number(pages) || 0);
  const { textLow, textHigh, image } = ESTIMATE.pdfPage;
  return [n * (textLow + image), n * (textHigh + image)];
}

/**
 * One request: system prompt, user turn and schema in, the answer and the thinking allowance out.
 * extra: [low, high] input tokens on top, such as a PDF's.
 */
function request(agent, { system, user, schema, answer, thinking, extra = [0, 0] }) {
  const base = tokensOf(system) + tokensOf(user) + tokensOf(json(schema));
  const output = tokensOf(json(answer)) + thinking;
  return { agent, input: [base + extra[0], base + extra[1]], output };
}

/**
 * The requests of a recorded run on one preset. run: { lang, count, documents, readerInputText,
 * mergesInputText, ideatorInputText, writerInputText, answers } as js/simulation.js builds it.
 */
export function stepsOf(run, presetId = "balanced") {
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[1];
  const thinking = ESTIMATE.thinkingTokens[preset.id] ?? 0;
  const lang = run.lang || "en";
  const steps = [];
  const a = run.answers || {};
  if (a.reader) {
    const pages = (run.documents || []).filter((d) => d.kind === "pdf").reduce((s, d) => s + (d.pages || 0), 0);
    const texts = (run.documents || []).filter((d) => ["markdown", "text", "csv"].includes(d.kind)).reduce((s, d) => s + Math.ceil((d.bytes || 0) / ESTIMATE.charsPerToken), 0);
    const [lo, hi] = pdfTokens(pages);
    steps.push(request("reader", { system: readerPrompt({ lang }), user: run.readerInputText, schema: readerSchema(), answer: a.reader, thinking, extra: [lo + texts, hi + texts] }));
  } else if (a.merges) {
    steps.push(request("merges", { system: mergesPrompt({ lang }), user: run.mergesInputText, schema: mergesSchema(), answer: a.merges, thinking }));
  }
  if (a.ideas) steps.push(request("ideator", { system: ideatorPrompt({ lang, count: run.count }), user: run.ideatorInputText, schema: ideasSchema(run.count), answer: a.ideas, thinking }));
  if (a.recommendation) steps.push(request("writer", { system: writerPrompt({ lang }), user: run.writerInputText, schema: recommendationSchema(), answer: a.recommendation, thinking }));
  return { preset, steps };
}

/** The run's cost on a preset: { preset, steps, input, output, usd, eur }, each a [low, high] range. */
export function estimateRun(run, presetId = "balanced") {
  const { preset, steps } = stepsOf(run, presetId);
  const sum = (k) => [0, 1].map((i) => steps.reduce((s, x) => s + (Array.isArray(x[k]) ? x[k][i] : x[k]), 0));
  const input = sum("input");
  const output = sum("output");
  // Each request is priced on its own, so Haiku's long-prompt price applies only to the request above it.
  const usd = [0, 1].map((i) => steps.reduce((s, x) => s + usageCostUsd(preset.model, { input_tokens: x.input[i], output_tokens: x.output }), 0));
  return { preset: preset.id, model: preset.model, steps, input, output, usd, eur: usd.map((u) => u * FX_USD_EUR) };
}

// ---- a live run, before it starts ------------------------------------------------------------------------

const span = (xs) => (xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0]);

/**
 * What the recorded scenarios say each step takes, for a live run's estimate: the Ideator's input and its
 * output per idea, the Writer's input and output, the Reader's output per issue and the merges answer, each
 * a [low, high] range over the scenarios' recorded runs (js/simulation.js buildRun, in one language).
 */
export function liveSizes(runs) {
  const steps = (r) => r.estimate.fast.steps;
  const pick = (agent, fn) => runs.map((r) => { const s = steps(r).find((x) => x.agent === agent); return s ? fn(s, r) : null; }).filter((v) => v !== null && Number.isFinite(v));
  const docIssues = (r) => r.issues.filter((i) => i.source?.kind !== "handoff").length || 1;
  return {
    ideatorInput: span(pick("ideator", (s) => s.input[0])),
    ideatorPerIdea: span(pick("ideator", (s, r) => s.output / Math.max(1, r.ideas.length))),
    writerInput: span(pick("writer", (s) => s.input[0])),
    writerOutput: span(pick("writer", (s) => s.output)),
    readerPerIssue: span(pick("reader", (s, r) => s.output / docIssues(r))),
    mergesOutput: span(pick("merges", (s) => s.output))
  };
}

/** Seconds as the dialog says them: under a minute, about a minute, or a range of whole minutes. */
export function timeWords(seconds, t) {
  const [lo, hi] = seconds;
  if (hi < 50) return t("ld.time.under");
  const a = Math.max(1, Math.round(lo / 60));
  const b = Math.max(1, Math.ceil(hi / 60));
  if (b <= 1) return t("ld.time.about");
  return t("ld.time.range", { low: Math.min(a, b - 1), high: b });
}

/**
 * The whole live run on a setting, before it starts: the reading request from the real files (a PDF by
 * Anthropic's rule per page, the text files by their size), the Ideator and the Writer from the recorded
 * scenarios' sizes for the number of ideas asked for, each with the setting's thinking allowance. Returns
 * { steps, eur, seconds, longPrompt }: euros and seconds as [low, high]; longPrompt when a request could pass
 * Haiku 5.5's 100,000-token price step. reading: "reader", "merges" or "none" (js/live_run.js readingOf);
 * from: the step the run starts or goes on from (read, ideas or write), so a run that goes on after a stop
 * is estimated for what is left.
 */
export function estimateLive({ reading, readerText = "", pdfPages = 0, textChars = 0, mergesText = "", count = 5, settings, sizes, lang = "en", from = "read" }) {
  const model = settings.model;
  const preset = PRESETS.find((p) => p.id === settings.preset) || PRESETS[1];
  const thinking = settings.thinking && settings.thinking.type === "disabled" ? 0 : ESTIMATE.thinkingTokens[preset.id === "fast" ? "balanced" : preset.id] ?? 1500;
  const steps = [];
  if (reading === "reader") {
    const [plo, phi] = pdfTokens(pdfPages);
    const base = tokensOf(readerPrompt({ lang })) + tokensOf(readerText) + tokensOf(json(readerSchema())) + Math.ceil(textChars / ESTIMATE.charsPerToken);
    const [ilo, ihi] = ESTIMATE.readerIssues;
    const per = sizes.readerPerIssue;
    steps.push({ agent: "reader", input: [base + plo, base + phi], output: [Math.round(ilo * per[0]) + thinking, Math.round(ihi * per[1]) + thinking] });
  } else if (reading === "merges") {
    const base = tokensOf(mergesPrompt({ lang })) + tokensOf(mergesText) + tokensOf(json(mergesSchema()));
    steps.push({ agent: "merges", input: [base, base], output: [sizes.mergesOutput[0] + thinking, Math.max(sizes.mergesOutput[1], 200) + thinking] });
  }
  const ideas = Math.max(1, Number(count) || 1);
  steps.push({ agent: "ideator", input: [...sizes.ideatorInput], output: [Math.round(ideas * sizes.ideatorPerIdea[0]) + thinking, Math.round(ideas * sizes.ideatorPerIdea[1]) + thinking] });
  steps.push({ agent: "writer", input: [...sizes.writerInput], output: [sizes.writerOutput[0] + thinking, sizes.writerOutput[1] + thinking] });
  const left = from === "write" ? steps.filter((x) => x.agent === "writer") : from === "ideas" ? steps.filter((x) => x.agent === "ideator" || x.agent === "writer") : steps;
  steps.splice(0, steps.length, ...left);
  const usd = [0, 1].map((i) => steps.reduce((s, x) => s + usageCostUsd(model, { input_tokens: x.input[i], output_tokens: x.output[i] }), 0));
  const rate = ESTIMATE.outputTokensPerSecond[model] || ESTIMATE.outputTokensPerSecond["claude-haiku-5-5"];
  const [slo, shi] = ESTIMATE.requestSeconds;
  const seconds = [
    steps.reduce((s, x) => s + slo + x.output[0] / rate[1], 0),
    steps.reduce((s, x) => s + shi + x.output[1] / rate[0], 0)
  ];
  const long = model === "claude-haiku-5-5" && steps.some((x) => x.input[1] > 100000);
  return { steps, usd, eur: usd.map((u) => u * FX_USD_EUR), seconds, longPrompt: long };
}
