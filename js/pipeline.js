// The agents as a pipeline of single structured requests (brief §5.2, PLAN.md §8): each step builds one
// request from its prompt, the state as JSON and its output schema, keeps it under the person's budget cap,
// sends it through the shared client with its retries, checks the answer with the schema validator and the
// step's own guards, and sends a failing answer back once with its problems listed. A second failure stops
// the step; what is done stays done. Code computes every figure; the meter prices each response's usage.
//
// Budget cap (brief §5.5): before every request its worst case is worked out, the input at the input price
// plus max_tokens at the output price. The input is counted by Anthropic's free token count (js/count.js)
// with a margin, and taken at a cautious ratio when the count fails (CAP_INPUT in js/config.js). When the
// spend so far plus the worst case would pass the cap, the request drops to its step's smallest max_tokens;
// when even that does not fit, the run stops before the request and says after which step. No run sends
// more requests than its steps and their repairs; the counts are free and are not requests to a model.
//
// Nothing here touches storage, the DOM or the console; the key is read from js/keystore.js at the moment
// a request goes out and goes nowhere but api.anthropic.com.

import { streamMessage, withRetry } from "./anthropic.js";
import { countTokens } from "./count.js";
import { usageCostUsd, normalizeUsage } from "./cost.js";
import { AGENT_TOKENS, PRESETS, DEFAULT_PRESET, FX_USD_EUR, EFFORTS, MODELS, CAP_INPUT } from "./config.js";
import { validate, describeErrors } from "./schema.js";

function abortError() {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}

/** The run stopped before a request whose worst case would pass the cap. */
export class BudgetStop extends Error {
  constructor(agent, { spentEur, capEur, needEur, uncounted = false }) {
    super(`Stopped at the budget cap before the ${agent}`);
    this.name = "BudgetStop";
    this.agent = agent;
    this.spentEur = spentEur;
    this.capEur = capEur;
    this.needEur = needEur;
    this.uncounted = uncounted;
  }
}

/** A step's answer failed its checks twice. problems: the second answer's, in words. */
export class StepFailed extends Error {
  constructor(agent, problems, { reason = "checks" } = {}) {
    super(`The ${agent}'s answer failed its checks twice`);
    this.name = "StepFailed";
    this.agent = agent;
    this.problems = problems;
    this.reason = reason;
  }
}

/**
 * What a run sends: the preset's model, effort and thinking, with Advanced's model and effort where the
 * person chose them. Haiku 5.5 takes thinking { type: "disabled" }; Sonnet 5.5 and Opus 5.5 refuse it, so
 * Fast on another model leaves the field out (adaptive thinking).
 */
export function settingsOf({ preset = DEFAULT_PRESET, model = null, effort = null } = {}) {
  const p = PRESETS.find((x) => x.id === preset) || PRESETS.find((x) => x.id === DEFAULT_PRESET);
  const m = MODELS.some((x) => x.id === model) ? model : p.model;
  const e = EFFORTS.includes(effort) ? effort : p.effort;
  const thinking = p.thinking && p.thinking.type === "disabled" && m !== "claude-haiku-5-5" ? null : p.thinking;
  return { preset: p.id, model: m, effort: e, thinking: thinking ? { ...thinking } : null };
}

/** A step's request body, without the key (that goes in a header) and without stream (the client adds it). */
export function requestOf({ settings, system, content, schema, maxTokens, history = [] }) {
  return {
    model: settings.model,
    max_tokens: maxTokens,
    ...(settings.thinking ? { thinking: settings.thinking } : {}),
    output_config: { effort: settings.effort, format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }, ...history]
  };
}

/**
 * Tokens of a text at the cautious ratio (CAP_INPUT): two letters a token, more than Anthropic's glossary
 * gives for English text on the 5.5 models; every other ASCII character, a digit, a space or a mark, a token
 * of its own, so a table of figures counts in full (review D3); and every other character at its UTF-8
 * bytes: 2 for an accented letter, 3 for Chinese, Japanese or Korean, 4 for an emoji (review C5). A tokenizer
 * that works on bytes gives no more tokens than a text has bytes; that it does is an assumption, since
 * Anthropic doesn't publish its tokenizer.
 */
export function cautiousTokensOf(text) {
  const s = String(text ?? "");
  let letters = 0;
  let other = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) letters += 1;
    else if (cp < 0x80) other += 1;
    else other += cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return Math.ceil(letters / CAP_INPUT.lettersPerToken) + other;
}

/** The output schema's tokens at the cautious ratio: what the cap adds to a count that leaves it out. */
export const schemaTokensOf = (body) => cautiousTokensOf(JSON.stringify(body.output_config?.format?.schema || {}));

/**
 * A request's input tokens when the count fails: the system prompt, the schema and every text block at the
 * cautious ratio, a few tokens a message for its frame, plus the PDFs' tokens at Anthropic's rule's high end
 * (pdfTokens).
 */
export function inputTokensOf(body, { pdfTokens = 0 } = {}) {
  let tokens = cautiousTokensOf(body.system) + schemaTokensOf(body);
  for (const m of body.messages || []) {
    tokens += CAP_INPUT.messageTokens;
    for (const b of Array.isArray(m.content) ? m.content : [{ type: "text", text: m.content }]) if (b.type === "text") tokens += cautiousTokensOf(b.text);
  }
  return tokens + pdfTokens;
}

/**
 * The input the budget check reckons with: the free count with its margin and the schema at the cautious
 * ratio, or, when the count failed (counted null), the whole request at the cautious ratio.
 */
export function checkedInputTokens(body, counted, { pdfTokens = 0 } = {}) {
  if (Number.isFinite(counted) && counted > 0) return Math.ceil(counted * (1 + CAP_INPUT.countMargin)) + CAP_INPUT.countMarginTokens + schemaTokensOf(body);
  return inputTokensOf(body, { pdfTokens });
}

/**
 * A request's worst case in euros: its input at the input price plus max_tokens at the output price; longTier
 * prices both at Haiku's long-prompt tier whatever the input.
 */
export function worstCaseEur(model, inputTokens, maxTokens, { longTier = false } = {}) {
  const long = longTier ? MODELS.find((m) => m.id === model)?.price?.longPrompt : null;
  if (long) return ((inputTokens * long.input + maxTokens * long.output) / 1e6) * FX_USD_EUR;
  return usageCostUsd(model, { input_tokens: inputTokens, output_tokens: maxTokens }) * FX_USD_EUR;
}

/**
 * The cap prices a request at Haiku's long-prompt tier though its input reckons below the step: when the count
 * failed and CAP_INPUT.fallbackTierMargin times the cautious count passes the step, since two letters a token
 * is no bound for every text, and the tier is a step of five times the price (review C5).
 */
export function longTierOf(model, inputTokens, counted) {
  const step = MODELS.find((m) => m.id === model)?.price?.longPrompt?.thresholdTokens;
  return !!step && !(Number.isFinite(counted) && counted > 0) && inputTokens * CAP_INPUT.fallbackTierMargin > step;
}

/**
 * The run's meter: every response's usage priced at the prices of the model that answered it (Haiku's
 * long-prompt prices above 100,000 prompt tokens), plus $0.01 a web search, at 0.894 euros a dollar. A
 * run that goes on after Change settings may switch model; its spend so far stays. capEur: the person's
 * cap, which Change settings may raise.
 */
export function createMeter(model, capEur) {
  const totals = { usd: 0, requests: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, web_searches: 0 };
  const byAgent = {};
  // What a stream that broke off may have cost: Anthropic's pages don't say whether it is billed, so the cap
  // holds its worst case as spent (review A15). The tiles and the report show the billed usage only.
  let held = 0;
  return {
    model,
    capEur,
    /** A broken stream's worst case, held against the cap. */
    hold(eur) { held += Math.max(0, Number(eur) || 0); },
    /**
     * What the free count gave for a step's request, before the margin: a saved run sets it beside the
     * billed input, so a live run shows how close the count came (TECH_NOTES, section 8).
     */
    counted(agent, tokens) {
      if (!agent || !(Number.isFinite(tokens) && tokens > 0)) return;
      const a = (byAgent[agent] ||= { usd: 0, requests: 0, input_tokens: 0, output_tokens: 0, max_output_tokens: 0 });
      a.counted_input_tokens = (a.counted_input_tokens || 0) + tokens;
    },
    heldEur() { return held; },
    /** What the cap counts as spent: the billed usage and what broken streams may have cost. */
    reservedEur() { return totals.usd * FX_USD_EUR + held; },
    add(usage, agent = null, at = this.model) {
      const u = normalizeUsage(usage);
      const usd = usageCostUsd(at, usage);
      totals.usd += usd;
      totals.requests += 1;
      totals.input_tokens += u.input_tokens;
      totals.output_tokens += u.output_tokens;
      totals.cache_read_tokens += u.cache_read_input_tokens;
      totals.cache_write_tokens += u.cache_creation_input_tokens;
      totals.web_searches += u.web_search_requests;
      if (agent) {
        const a = (byAgent[agent] ||= { usd: 0, requests: 0, input_tokens: 0, output_tokens: 0, max_output_tokens: 0 });
        a.usd += usd;
        a.requests += 1;
        a.input_tokens += u.input_tokens;
        a.output_tokens += u.output_tokens;
        // The largest single answer: what a step's max_tokens has to leave room for.
        a.max_output_tokens = Math.max(a.max_output_tokens, u.output_tokens);
      }
      return this.snapshot();
    },
    /** A new cap or model for what follows; the spend so far stays. */
    set({ capEur: cap = this.capEur, model: m = this.model } = {}) {
      this.capEur = cap;
      this.model = m;
    },
    spentEur() { return totals.usd * FX_USD_EUR; },
    snapshot() { return { ...totals, eur: totals.usd * FX_USD_EUR, heldEur: held, capEur: this.capEur, model: this.model, byAgent: JSON.parse(JSON.stringify(byAgent)) }; }
  };
}

/**
 * The max_tokens a request may use under the cap: the step's own, or its smallest, or null when even the
 * smallest would pass the cap. Returns { maxTokens, worstEur }.
 */
export function fitToCap({ model, inputTokens, limits, spentEur, capEur, longTier = false }) {
  for (const maxTokens of [limits.max, limits.min]) {
    const worstEur = worstCaseEur(model, inputTokens, maxTokens, { longTier });
    if (spentEur + worstEur <= capEur + 1e-12) return { maxTokens, worstEur };
  }
  return { maxTokens: null, worstEur: worstCaseEur(model, inputTokens, limits.min, { longTier }) };
}

/** The answer's JSON from an assistant message's text blocks, or why it can't be read. */
export function answerOf(message) {
  const text = (message?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  if (message?.stop_reason === "max_tokens") return { text, answer: null, error: "cut" };
  if (message?.stop_reason === "refusal") return { text, answer: null, error: "refusal" };
  if (!text.trim()) return { text, answer: null, error: "empty" };
  try { return { text, answer: JSON.parse(text), error: null }; } catch (e) { return { text, answer: null, error: "json" }; }
}

/** The repair turn: the problems in a list, and the ask to return the whole answer again. */
export function repairText({ read = null, schemaErrors = [], refusals = [], audit = [] }) {
  const lines = [];
  if (read === "cut") lines.push("Your answer was cut off at the output limit. Write less in every text so the whole answer fits.");
  if (read === "json" || read === "empty") lines.push("Your answer was not one JSON object as the schema asks.");
  if (schemaErrors.length) lines.push(...describeErrors(schemaErrors).split("\n").filter(Boolean).map((l) => `Schema: ${l}`));
  lines.push(...refusals);
  for (const a of audit) {
    if (a.tokens?.length) lines.push(`${a.where}: write these without numbers, or cite them as a placeholder from "facts": ${a.tokens.join(", ")}`);
    if (a.unknownFacts?.length) lines.push(`${a.where}: these placeholders are not in "facts": ${a.unknownFacts.join(", ")}`);
  }
  return `Your answer has these problems:\n${lines.map((l) => `- ${l}`).join("\n")}\nReturn the whole answer again, corrected, in the same JSON shape.`;
}

/** The free token count, as the pipeline uses it: the request's input tokens, or null when it fails. */
const defaultCount = ({ key, body, signal }) => countTokens({ key, body, signal });

/** The shared client's call, as the pipeline uses it; tests pass their own. */
async function defaultSend({ key, body, signal, onText, onRetry }) {
  const started = performance.now();
  const { message } = await withRetry(() => streamMessage({ key, body, signal, hooks: { onText } }), { signal, onRetry });
  return { message, ms: Math.round(performance.now() - started) };
}

/**
 * One agent's step. agent: reader, merges, ideator, writer or brief (AGENT_TOKENS names its max_tokens);
 * content: the user turn's blocks; check(answer, { attempt }): { refusals: [text], audit: [{ where, tokens, unknownFacts }] } from the
 * step's guards; pdfTokens: the PDFs' input tokens at Anthropic's rule's high end, which the cap takes when
 * the free count fails. Every attempt's input is counted first (count, free; tests pass their own). onEvent
 * gets { type: counting | request | text | retry | answer | repair, … }. Returns { answer, unchecked (paths
 * the fact audit refused twice), repaired, ms, maxTokens }. Throws BudgetStop, StepFailed, an ApiError or an
 * AbortError.
 */
export async function runStep({ agent, key, settings, system, content, schema, check = () => ({ refusals: [], audit: [] }), meter, signal, pdfTokens = 0, onEvent = () => {}, send = defaultSend, count = defaultCount }) {
  const limits = AGENT_TOKENS[agent];
  if (!limits) throw new Error(`No output limits for the agent "${agent}"`);
  let history = [];
  let totalMs = 0;
  let maxTokensUsed = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const probe = requestOf({ settings, system, content, schema, maxTokens: limits.max, history });
    onEvent({ type: "counting", agent, attempt, pdf: pdfTokens > 0 });
    const counted = await count({ key, body: probe, signal });
    if (signal?.aborted) throw abortError();
    const countedOk = Number.isFinite(counted) && counted > 0;
    const inputTokens = checkedInputTokens(probe, counted, { pdfTokens });
    const reserved = () => (meter.reservedEur ? meter.reservedEur() : meter.spentEur());
    const fit = fitToCap({ model: settings.model, inputTokens, limits, spentEur: reserved(), capEur: meter.capEur, longTier: longTierOf(settings.model, inputTokens, counted) });
    // A stop on the cautious count says the count didn't answer, so Try again may count it (review C5).
    if (fit.maxTokens === null) throw new BudgetStop(agent, { spentEur: meter.spentEur(), capEur: meter.capEur, needEur: fit.worstEur, uncounted: !countedOk });
    // The free count of a request that goes out, so a saved run sets it beside that request's billed input
    // (review D4: a request the cap stopped added its count before).
    meter.counted?.(agent, counted);
    const body = { ...probe, max_tokens: fit.maxTokens };
    maxTokensUsed = fit.maxTokens;
    onEvent({ type: "request", agent, attempt, maxTokens: fit.maxTokens, inputTokens, counted: countedOk, worstEur: fit.worstEur, repair: attempt > 1 });
    let chars = 0;
    const { message, ms } = await send({
      key, body, signal,
      onText: (_i, text) => { if (text.length - chars >= 200) { chars = text.length; onEvent({ type: "text", agent, chars }); } },
      onRetry: ({ attempt: n, waitMs, error }) => {
        // A stream that broke off may have been billed up to its worst case: the cap holds that, and the
        // request goes again only if its worst case still fits beside it (review A15).
        if (error?.midStream && meter.hold) {
          meter.hold(fit.worstEur);
          if (reserved() + fit.worstEur > meter.capEur + 1e-12) throw new BudgetStop(agent, { spentEur: meter.spentEur(), capEur: meter.capEur, needEur: fit.worstEur, uncounted: !countedOk });
        }
        onEvent({ type: "retry", agent, attempt: n, waitMs, status: error?.status ?? 0, errorType: error?.type || "" });
      }
    });
    totalMs += ms;
    meter.add(message.usage, agent, settings.model);
    onEvent({ type: "answer", agent, attempt, usage: message.usage, ms, stop: message.stop_reason, cost: meter.snapshot() });
    const read = answerOf(message);
    const schemaErrors = read.answer ? validate(read.answer, schema).errors : [];
    const found = read.answer && !schemaErrors.length ? check(read.answer, { attempt }) : { refusals: [], audit: [] };
    const refusals = found.refusals || [];
    const audit = found.audit || [];
    const structural = read.error || schemaErrors.length || refusals.length;
    if (!structural && !audit.length) return { answer: read.answer, unchecked: [], repaired: attempt > 1, ms: totalMs, maxTokens: maxTokensUsed };
    if (attempt === 2) {
      // The fact audit's second refusal shows the text with an Unchecked tag; anything else stops the step.
      if (!structural) return { answer: read.answer, unchecked: audit.map((a) => a.where), repaired: true, ms: totalMs, maxTokens: maxTokensUsed };
      const problems = [read.error ? `read: ${read.error}` : null, ...describeErrors(schemaErrors).split("\n").filter(Boolean), ...refusals].filter(Boolean);
      throw new StepFailed(agent, problems, { reason: read.error === "refusal" ? "refusal" : read.error === "cut" ? "cut" : "checks" });
    }
    if (read.error === "refusal") throw new StepFailed(agent, ["the model declined to answer"], { reason: "refusal" });
    const note = repairText({ read: read.error, schemaErrors, refusals, audit });
    onEvent({ type: "repair", agent, problems: note.split("\n").filter((l) => l.startsWith("- ")).length });
    history = [
      { role: "assistant", content: [{ type: "text", text: read.text || "{}" }] },
      { role: "user", content: [{ type: "text", text: note }] }
    ];
  }
  throw new Error("unreachable");
}
