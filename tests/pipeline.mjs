// The live pipeline in Node, against the scripted stand-in (tests/lib/fake-claude.mjs) through a stubbed
// fetch: no request leaves the machine. What it proves:
//   settings   each preset sends its model, effort and thinking; Advanced's model and effort win; Fast on
//              Sonnet 5.5 leaves thinking out, since Sonnet refuses "disabled" (AC-08)
//   repair     a failing answer goes back exactly once with its problems listed; a second failure stops the
//              step; a text the fact audit refuses twice comes back marked unchecked (AC-08, AC-19)
//   cap        a request whose worst case passes the cap drops to its step's smallest max_tokens; when even
//              that passes the cap, no request is sent and the run stops naming the step (AC-09)
//   meter      the meter equals usage times price plus $0.01 a search at 0.894, to within 1e-9, Haiku's
//              long-prompt prices included (AC-09)
//   retries    529 and 429 are retried after 1.5 s and 4 s or after retry-after; a credit error and a 401
//              are not; three failures give up (AC-10, brief §5.8)
//   abort      Stop ends the request and sends nothing more
//   messages   every error becomes its plain message in both languages and what to do next (AC-10), a
//              browser-forbidding organisation's 401 apart from a rejected key
// Prints PIPELINE OK.
// Usage: node tests/pipeline.mjs
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";
import { createReport } from "./lib/report.mjs";
import { createFakeClaude, KEY } from "./lib/fake-claude.mjs";

const imp = (p) => import(path.join(APP_ROOT, p));
const { settingsOf, runStep, createMeter, fitToCap, worstCaseEur, requestOf, inputTokensOf, BudgetStop, StepFailed } = await imp("js/pipeline.js");
const { messageOf } = await imp("js/api_messages.js");
const { usageCostUsd } = await imp("js/cost.js");
const { AGENT_TOKENS, FX_USD_EUR, MODELS } = await imp("js/config.js");
const { recommendationSchema } = await imp("js/schemas.js");
const { writerProblems } = await imp("js/guards.js");
const EN = (await imp("js/i18n/en.js")).default;
const DE = (await imp("js/i18n/de.js")).default;
const r = createReport("pipeline");

/** Routes fetch to the stand-in for the time of one case; a hold(ms) delays each answer. */
function stub(fake, { holdMs = 0 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), at: Date.now() });
    if (holdMs) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, holdMs);
        init.signal?.addEventListener("abort", () => { clearTimeout(t); reject(Object.assign(new Error("aborted"), { name: "AbortError" })); }, { once: true });
      });
    }
    if (init.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    const out = fake.handle(init.body, Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v])));
    return new Response(out.body, { status: out.status, headers: out.headers });
  };
  return calls;
}

const writerAnswer = { headline: "Eight prototypes answer the issues that put {{fact:at_stake}} at stake.", looked_at: "Three challenger reports on the company.", found: "{{fact:issues.covered}} kept issues have an idea.", needed: "Rank a top three and say who will be in the room." };
const facts = ["at_stake", "issues.covered", "issues.kept"];
const writerCheck = (a) => writerProblems(a, { facts, evidence: {} });
const step = (fake, extra = {}) => runStep({ agent: "writer", key: KEY, settings: settingsOf({ preset: "balanced" }), system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), check: writerCheck, meter: createMeter("claude-haiku-5-5", 0.5), ...extra });

// ---- settings ----------------------------------------------------------------------------------------------
const sets = {
  fast: settingsOf({ preset: "fast" }),
  balanced: settingsOf({ preset: "balanced" }),
  thorough: settingsOf({ preset: "thorough" }),
  fastSonnet: settingsOf({ preset: "fast", model: "claude-sonnet-5-5" }),
  balancedHigh: settingsOf({ preset: "balanced", effort: "high" }),
  junk: settingsOf({ preset: "nope", model: "gpt", effort: "max" })
};
r.check(JSON.stringify(sets.fast) === JSON.stringify({ preset: "fast", model: "claude-haiku-5-5", effort: "low", thinking: { type: "disabled" } }), "Fast: Haiku 5.5, low effort, thinking disabled");
r.check(JSON.stringify(sets.balanced) === JSON.stringify({ preset: "balanced", model: "claude-haiku-5-5", effort: "medium", thinking: null }), "Balanced: Haiku 5.5, medium effort, thinking left out (adaptive)");
r.check(JSON.stringify(sets.thorough) === JSON.stringify({ preset: "thorough", model: "claude-sonnet-5-5", effort: "medium", thinking: null }), "Thorough: Sonnet 5.5, medium effort, thinking left out");
r.check(sets.fastSonnet.model === "claude-sonnet-5-5" && sets.fastSonnet.thinking === null && sets.fastSonnet.effort === "low", "Fast with Sonnet 5.5 from Advanced leaves thinking out, since Sonnet refuses \"disabled\"");
r.check(sets.balancedHigh.effort === "high" && sets.balancedHigh.model === "claude-haiku-5-5", "Advanced's effort wins over the preset's");
r.check(sets.junk.preset === "balanced" && sets.junk.model === "claude-haiku-5-5" && sets.junk.effort === "medium", "an unknown preset, model or effort falls back to Balanced");

for (const [name, settings] of Object.entries({ fast: sets.fast, balanced: sets.balanced, thorough: sets.thorough })) {
  const fake = createFakeClaude([{ answer: writerAnswer }], { expectSetting: settings });
  stub(fake);
  const out = await runStep({ agent: "writer", key: KEY, settings, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), check: writerCheck, meter: createMeter(settings.model, 3) });
  const req = fake.requests[0]?.req;
  r.check(!fake.violations.length && out.answer.headline === writerAnswer.headline && req.output_config.format.schema.required.includes("headline") && req.max_tokens === AGENT_TOKENS.writer.max, `${name}: one request with its model, effort, thinking, both headers and the Writer's output schema${fake.violations.length ? `: ${fake.violations.join("; ")}` : ""}`);
}

// ---- repair ------------------------------------------------------------------------------------------------
{
  const fake = createFakeClaude([{ answer: { headline: "", looked_at: "x", found: "y", needed: "z" } }, { answer: writerAnswer }]);
  stub(fake);
  const events = [];
  const out = await step(fake, { onEvent: (e) => events.push(e.type) });
  const second = fake.requests[1]?.req;
  const turns = second?.messages.map((m) => m.role).join(",");
  const note = second?.messages.at(-1)?.content?.[0]?.text || "";
  r.check(fake.requests.length === 2 && out.repaired && turns === "user,assistant,user" && /headline is empty/.test(note) && events.includes("repair"), `a failing answer goes back once, as user, assistant, user, its problem listed ("${note.split("\n")[1] || ""}")`);
}
{
  const bad = { headline: "", looked_at: "x", found: "y", needed: "z" };
  const fake = createFakeClaude([{ answer: bad }, { answer: bad }, { answer: writerAnswer }]);
  stub(fake);
  let err = null;
  try { await step(fake); } catch (e) { err = e; }
  r.check(err instanceof StepFailed && fake.requests.length === 2 && fake.remaining() === 1 && err.agent === "writer", `a second failure stops the step after exactly two requests (${err?.name}: ${err?.problems?.[0]})`);
}
{
  const numbers = { ...writerAnswer, found: "Seven of eight issues, worth 12.9 million euros, have an idea." };
  const fake = createFakeClaude([{ answer: numbers }, { answer: numbers }]);
  stub(fake);
  const out = await step(fake);
  r.check(fake.requests.length === 2 && out.unchecked.join() === "found" && out.answer.found === numbers.found, `a text the fact audit refuses twice comes back marked unchecked (${out.unchecked.join(", ")}), not stopped`);
}
{
  const fake = createFakeClaude([{ text: '{"headline": "Cut off', stop: "max_tokens" }, { answer: writerAnswer }]);
  stub(fake);
  const out = await step(fake);
  const note = fake.requests[1]?.req.messages.at(-1)?.content?.[0]?.text || "";
  r.check(out.repaired && /cut off at the output limit/.test(note), "an answer cut off at max_tokens goes back once, asking for a shorter one");
}
{
  const fake = createFakeClaude([{ text: "I can't help with that.", stop: "refusal" }]);
  stub(fake);
  let err = null;
  try { await step(fake); } catch (e) { err = e; }
  r.check(err instanceof StepFailed && err.reason === "refusal" && fake.requests.length === 1, "a refusal stops the step without a repair");
}
// Control: the repair check can fail, since a good first answer sends one request only.
{
  const fake = createFakeClaude([{ answer: writerAnswer }, { answer: writerAnswer }]);
  stub(fake);
  const out = await step(fake);
  r.control(fake.requests.length === 1 && !out.repaired, "a good first answer is not sent back");
}

// ---- cap ---------------------------------------------------------------------------------------------------
{
  const settings = sets.thorough;
  const probe = requestOf({ settings, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), maxTokens: AGENT_TOKENS.writer.max });
  const input = inputTokensOf(probe);
  const atMax = worstCaseEur(settings.model, input, AGENT_TOKENS.writer.max);
  const atMin = worstCaseEur(settings.model, input, AGENT_TOKENS.writer.min);
  // A cap between the two: the request drops to the step's smallest max_tokens.
  const fake = createFakeClaude([{ answer: writerAnswer }]);
  stub(fake);
  const meter = createMeter(settings.model, (atMax + atMin) / 2);
  const events = [];
  await runStep({ agent: "writer", key: KEY, settings, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), check: writerCheck, meter, onEvent: (e) => events.push(e) });
  r.check(fake.requests[0]?.req.max_tokens === AGENT_TOKENS.writer.min && events.find((e) => e.type === "request").worstEur <= meter.capEur, `with the cap between both worst cases (€${atMin.toFixed(4)} and €${atMax.toFixed(4)}) the request goes out with max_tokens ${AGENT_TOKENS.writer.min}`);
  // A cap under even that: no request at all.
  const none = createFakeClaude([{ answer: writerAnswer }]);
  const calls = stub(none);
  let err = null;
  try { await runStep({ agent: "writer", key: KEY, settings, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), check: writerCheck, meter: createMeter(settings.model, atMin * 0.9) }); } catch (e) { err = e; }
  r.check(err instanceof BudgetStop && err.agent === "writer" && calls.length === 0, `with the cap under the smallest worst case, nothing is sent and the run stops before the Writer (${err?.name})`);
  // Spend so far counts: a meter already near its cap stops the next request.
  const spent = createMeter(settings.model, 0.5);
  spent.add({ input_tokens: 200000, output_tokens: 1000 });
  const fit = fitToCap({ model: settings.model, inputTokens: input, limits: AGENT_TOKENS.writer, spentEur: spent.spentEur(), capEur: spent.capEur });
  r.check(spent.spentEur() > 0.35 && (fit.maxTokens === null || spent.spentEur() + fit.worstEur <= 0.5), `the spend so far (€${spent.spentEur().toFixed(4)}) counts against the cap`);
}

// ---- meter -------------------------------------------------------------------------------------------------
{
  let worst = 0;
  const cases = [
    ["claude-haiku-5-5", { input_tokens: 12000, output_tokens: 3400 }],
    ["claude-haiku-5-5", { input_tokens: 99000, output_tokens: 8000, cache_read_input_tokens: 2000 }],
    ["claude-haiku-5-5", { input_tokens: 150000, output_tokens: 8000 }],
    ["claude-sonnet-5-5", { input_tokens: 9000, output_tokens: 2100, cache_creation_input_tokens: 1000, server_tool_use: { web_search_requests: 3 } }],
    ["claude-opus-5-5", { input_tokens: 5000, output_tokens: 700 }]
  ];
  for (const [model, usage] of cases) {
    const m = createMeter(model, 3);
    m.add(usage);
    const p = MODELS.find((x) => x.id === model).price;
    const prompt = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
    const q = p.longPrompt && prompt > p.longPrompt.thresholdTokens ? p.longPrompt : p;
    const usd = ((usage.input_tokens || 0) * q.input + (usage.output_tokens || 0) * q.output + (usage.cache_read_input_tokens || 0) * q.cacheRead + (usage.cache_creation_input_tokens || 0) * q.cacheWrite) / 1e6 + (usage.server_tool_use?.web_search_requests || 0) * 0.01;
    worst = Math.max(worst, Math.abs(m.spentEur() - usd * FX_USD_EUR), Math.abs(usageCostUsd(model, usage) - usd));
  }
  r.check(worst < 1e-9, `the meter equals usage times price plus $0.01 a search at 0.894 on five cases, Haiku's long-prompt prices included (largest difference ${worst.toExponential(1)})`);
}

// ---- retries -----------------------------------------------------------------------------------------------
{
  const fake = createFakeClaude([{ error: { status: 529, type: "overloaded_error", message: "Overloaded" } }, { error: { status: 529, type: "overloaded_error", message: "Overloaded" } }, { answer: writerAnswer }]);
  const calls = stub(fake);
  const t0 = Date.now();
  const out = await step(fake);
  const gaps = calls.slice(1).map((c, k) => c.at - calls[k].at);
  r.check(out.answer && calls.length === 3 && gaps[0] >= 1450 && gaps[1] >= 3950 && gaps[1] < 6000, `529 twice, then an answer: retried after ${gaps.map((g) => `${(g / 1000).toFixed(1)} s`).join(" and ")} (${((Date.now() - t0) / 1000).toFixed(1)} s in all)`);
}
{
  const fake = createFakeClaude([{ error: { status: 429, type: "rate_limit_error", message: "Rate limited", retryAfter: 2 } }, { answer: writerAnswer }]);
  const calls = stub(fake);
  await step(fake);
  const gap = calls[1].at - calls[0].at;
  r.check(calls.length === 2 && gap >= 1950 && gap < 3500, `429 with retry-after 2: retried after ${(gap / 1000).toFixed(1)} s`);
}
for (const [label, error] of [
  ["400 for credit", { status: 400, type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." }],
  ["401", { status: 401, type: "authentication_error", message: "invalid x-api-key" }],
  ["429 at the spend limit", { status: 429, type: "rate_limit_error", message: "You have reached your specified workspace API usage limits.", details: { error_code: "enforced_spend_limit_reached" } }]
]) {
  const fake = createFakeClaude([{ error }, { answer: writerAnswer }]);
  stub(fake);
  let err = null;
  try { await step(fake); } catch (e) { err = e; }
  r.check(err && err.status === error.status && fake.requests.length === 1, `${label}: not retried (${fake.requests.length} request)`);
}
{
  const err529 = { status: 529, type: "overloaded_error", message: "Overloaded" };
  const fake = createFakeClaude([{ error: err529 }, { error: err529 }, { error: err529 }, { answer: writerAnswer }]);
  stub(fake);
  let err = null;
  try { await step(fake); } catch (e) { err = e; }
  r.check(err?.status === 529 && fake.requests.length === 3, `three 529s in a row: the step gives up after three requests (${fake.requests.length})`);
}

// ---- abort -------------------------------------------------------------------------------------------------
{
  const fake = createFakeClaude([{ answer: writerAnswer }, { answer: writerAnswer }]);
  stub(fake, { holdMs: 600 });
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 150);
  let err = null;
  try { await step(fake, { signal: ctrl.signal }); } catch (e) { err = e; }
  await new Promise((res) => setTimeout(res, 700));
  r.check(err?.name === "AbortError" && fake.requests.length === 0, `Stop during a request ends it and sends nothing more (${err?.name})`);
}

// ---- messages ----------------------------------------------------------------------------------------------
{
  const cases = [
    [{ status: 401, type: "authentication_error", message: "invalid x-api-key" }, "api.unauthorized", "key"],
    [{ status: 401, type: "authentication_error", message: "CORS requests are not allowed for this Organization because of its CORS settings." }, "api.cors", "key"],
    [{ status: 403, type: "permission_error" }, "api.forbidden", "settings"],
    [{ status: 404, type: "not_found_error" }, "api.notFound", "settings"],
    [{ status: 400, type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." }, "api.credit", "retry"],
    [{ status: 402, type: "billing_error", message: "Payment required" }, "api.credit", "retry"],
    [{ status: 400, type: "invalid_request_error", message: "You have reached your specified API usage limits." }, "api.spendLimit", "retry"],
    [{ status: 429, type: "rate_limit_error", message: "Too many" }, "api.rateLimited", "retry"],
    [{ status: 429, type: "rate_limit_error", message: "usage limits", details: { error_code: "enforced_spend_limit_reached" } }, "api.spendLimit", "retry"],
    [{ status: 529, type: "overloaded_error" }, "api.overloaded", "retry"],
    [{ status: 503, type: "api_error" }, "api.server", "retry"],
    [{ status: 400, type: "invalid_request_error", message: "max_tokens: too large" }, "api.badRequest", "settings"],
    [{ status: 0, type: "network_error", message: "Blocked or unreachable" }, "api.network", "retry"],
    [{ status: 0, type: "timeout_error", message: "No response" }, "api.timeout", "retry"],
    [{ name: "AbortError" }, "live.stopped", "retry"],
    [new BudgetStop("reader", { spentEur: 0, capEur: 0.05, needEur: 0.2 }), "live.budget.reader", "settings"],
    [new BudgetStop("ideator", { spentEur: 0.4, capEur: 0.5, needEur: 0.2 }), "live.budget.ideator", "settings"],
    [new BudgetStop("writer", { spentEur: 0.45, capEur: 0.5, needEur: 0.1 }), "live.budget.writer", "settings"],
    [new StepFailed("ideator", ["idea 1: names no issue"]), "live.failed.ideator", "retry"],
    [new StepFailed("reader", ["read: refusal"], { reason: "refusal" }), "live.declined.reader", "retry"],
    [new StepFailed("ideator", ["read: cut"], { reason: "cut" }), "live.cut.ideator", "settings"]
  ];
  for (const [e, key, next] of cases) {
    const m = messageOf(e, { model: "Sonnet 5.5" });
    const words = [EN[m.key], DE[m.key]];
    r.check(m.key === key && m.next === next && words.every((w) => typeof w === "string" && w.length > 10) && EN[m.key] !== DE[m.key], `${e.status ?? e.name}${e.type ? ` ${e.type}` : ""}${e.agent ? ` (${e.agent})` : ""}: "${EN[m.key] || m.key}" and what to do next: ${m.next}`);
  }
}

r.finish("PIPELINE OK");
