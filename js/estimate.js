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
