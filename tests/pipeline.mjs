// The live pipeline in Node, against the scripted stand-in (tests/lib/fake-claude.mjs) through a stubbed
// fetch: no request leaves the machine. What it proves:
//   settings   each preset sends its model, effort and thinking; Advanced's model and effort win; Fast on
//              Sonnet 5.5 leaves thinking out, since Sonnet refuses "disabled" (AC-08)
//   repair     a failing answer goes back exactly once with its problems listed; a second failure stops the
//              step; a text the fact audit refuses twice comes back marked unchecked (AC-08, AC-19)
//   cap        a request whose worst case passes the cap drops to its step's smallest max_tokens; when even
//              that passes the cap, no request is sent and the run stops naming the step (AC-09); every
//              request's input is counted for free first, and taken at a cautious ratio when the count
//              fails, so a large file or another script never takes a run past its cap (review A1)
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
import { createFakeClaude, KEY, standInTokens } from "./lib/fake-claude.mjs";

const imp = (p) => import(path.join(APP_ROOT, p));
const { settingsOf, runStep, createMeter, fitToCap, worstCaseEur, longTierOf, cautiousTokensOf, requestOf, inputTokensOf, checkedInputTokens, BudgetStop, StepFailed } = await imp("js/pipeline.js");
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
    // calls: the Messages requests only; the free counts are in fake.counts.
    if (!String(url).includes("/v1/messages/count_tokens")) calls.push({ url: String(url), at: Date.now() });
    if (holdMs) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, holdMs);
        init.signal?.addEventListener("abort", () => { clearTimeout(t); reject(Object.assign(new Error("aborted"), { name: "AbortError" })); }, { once: true });
      });
    }
    if (init.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const out = String(url).includes("/v1/messages/count_tokens") ? fake.count(init.body, headers) : fake.handle(init.body, headers);
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
// The check hears which answer it reads, so a step can treat a repaired answer as the last word.
{
  const bad = { headline: "", looked_at: "x", found: "y", needed: "z" };
  const fake = createFakeClaude([{ answer: bad }, { answer: writerAnswer }]);
  stub(fake);
  const seen = [];
  await step(fake, { check: (a, ctx) => { seen.push(ctx?.attempt); return writerCheck(a); } });
  r.check(seen.join() === "1,2", `the step's check hears which answer it reads: the first, then the repair (${seen.join(", ")})`);
}
// Too many ideas go back once; if the repair still has too many, code keeps the first ones the Ideator
// listed (strongest first) and refuses the rest, so the run goes on (brief §6.1, 0.3.2).
{
  const { ideasStep } = await imp("js/live_agents.js");
  const { recordedRun } = await imp("js/simulation.js");
  const { scenarioById } = await imp("js/scenarios.js");
  const sc = scenarioById("s1");
  const run = recordedRun(sc, "en");
  const wire = sc.answers.en.ideas.ideas;
  const four = { ideas: wire.slice(0, 4) };
  const ctx = { run, form: { count: 3 }, runLang: "en", key: KEY, settings: settingsOf({ preset: "fast" }), meter: createMeter("claude-haiku-5-5", 0.5) };
  {
    const fake = createFakeClaude([{ answer: four }, { answer: four }]);
    stub(fake);
    const out = await ideasStep(ctx);
    const note = fake.requests[1]?.req.messages.at(-1)?.content?.[0]?.text || "";
    r.check(fake.requests.length === 2 && /4 ideas, but at most 3 were asked for: keep the 3 strongest and drop the rest/.test(note) && out.ideas.ideas.length === 3 && out.ideas.ideas.map((i) => i.name).join() === wire.slice(0, 3).map((i) => i.name).join() && out.trimmed?.from === 4 && out.trimmed?.to === 3 && out.repaired,
      `four ideas twice for three asked: the first goes back with what to do, the second keeps the first three and says so (${out.ideas?.ideas?.length}, ${JSON.stringify(out.trimmed)})`);
  }
  {
    const fake = createFakeClaude([{ answer: four }, { answer: { ideas: wire.slice(0, 3) } }]);
    stub(fake);
    const out = await ideasStep(ctx);
    r.check(out.ideas.ideas.length === 3 && out.trimmed === null && out.repaired, "a repair with the number asked for keeps all its ideas and trims nothing");
  }
  {
    const { ideaProblems } = await imp("js/guards.js");
    r.control(ideaProblems(structuredClone(four), { count: 3, issues: run.issues }).refusals.some((x) => /4 ideas, but at most 3/.test(x)), "the guard itself refuses four ideas for three, so the trim above is the step's own doing");
  }
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
  const input = checkedInputTokens(probe, standInTokens(probe));
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
  r.check(err instanceof BudgetStop && err.agent === "writer" && calls.length === 0 && none.counts.length === 1, `with the cap under the smallest worst case, nothing is sent but the free count and the run stops before the Writer (${err?.name})`);
  // Spend so far counts (review A19): the same request fits an empty meter at this cap, and a meter that has
  // spent all but less than its smallest worst case stops it before anything is sent.
  const cap = atMin * 1.2;
  const empty = fitToCap({ model: settings.model, inputTokens: input, limits: AGENT_TOKENS.writer, spentEur: 0, capEur: cap });
  const spent = createMeter(settings.model, cap);
  spent.add({ input_tokens: Math.round(((cap - atMin * 0.5) / FX_USD_EUR) / (MODELS.find((m) => m.id === settings.model).price.input / 1e6)), output_tokens: 0 });
  const late = createFakeClaude([{ answer: writerAnswer }]);
  const lateCalls = stub(late);
  let lateErr = null;
  try { await runStep({ agent: "writer", key: KEY, settings, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), check: writerCheck, meter: spent }); } catch (e) { lateErr = e; }
  r.check(empty.maxTokens !== null && lateErr instanceof BudgetStop && lateCalls.length === 0, `the spend so far counts: at a cap of €${cap.toFixed(4)} the request fits an empty meter (max_tokens ${empty.maxTokens}), but after €${spent.spentEur().toFixed(4)} spent it stops before anything is sent (${lateErr?.name})`);
}

// ---- the cap's input ---------------------------------------------------------------------------------------
// Review A1: the check took every text at four characters a token, a third less than Anthropic's glossary
// gives for the 5.5 models, so a large file could take a run past its cap. Now every request is counted for
// free first, and taken at a cautious ratio when the count fails. The stand-in bills each request at its own
// tokenizer (2.7 characters a token for ASCII, a token for every other character, the format prompt on top)
// and answers at the request's full max_tokens: the run's spend may never pass its cap.
{
  const para = "Customers wait two days for a quote because the desk checks every surcharge by hand, and the margin on spot freight falls while the board asks for growth. ";
  const big = para.repeat(Math.ceil(650000 / para.length)).slice(0, 650000);
  const mixed = `${"Die Kunden warten zwei Tage auf ein Angebot, weil der Vertrieb jeden Zuschlag prüft. Größere Häfen zahlen höhere Gebühren. ".repeat(900)}${"\u6E2F\u53E3\u8CBB\u7528\u4E0A\u5347".repeat(4000)}`;
  const worstUsage = (req) => ({ answer: writerAnswer, usage: { input_tokens: standInTokens(req, { withFormat: true }), output_tokens: req.max_tokens } });
  for (const [label, text, preset, cap] of [["a 650,000-character report on Thorough at €0.40", big, "thorough", 0.4], ["German and Chinese text on Balanced at €0.05", mixed, "balanced", 0.05]]) {
    for (const countFails of [false, true]) {
      const settings = sets[preset];
      const fake = createFakeClaude((n, req) => worstUsage(req), { countFails });
      stub(fake);
      const meter = createMeter(settings.model, cap);
      const events = [];
      let err = null;
      try { await runStep({ agent: "writer", key: KEY, settings, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text }], schema: recommendationSchema(), check: writerCheck, meter, onEvent: (e) => events.push(e) }); } catch (e) { err = e; }
      const sent = events.filter((e) => e.type === "request");
      const billed = fake.requests.map((q) => q.billedInput);
      const covered = sent.every((e, k) => billed[k] === undefined || e.inputTokens >= billed[k]);
      const how = countFails ? "the count failing, the cautious ratio" : "the free count";
      r.check((err === null || err instanceof BudgetStop) && covered && meter.spentEur() <= cap + 1e-9 && fake.counts.length >= 1 && sent.every((e) => e.counted === !countFails),
        `${label}, ${how}: ${sent.length ? `the check reckons with ${sent.map((e) => e.inputTokens.toLocaleString("en")).join(", ")} input tokens against ${billed.map((b) => b.toLocaleString("en")).join(", ")} billed, and the run spends €${meter.spentEur().toFixed(4)} of €${cap.toFixed(2)}` : `the run stops at the cap before the request, having spent €${meter.spentEur().toFixed(4)}`}`);
    }
  }
  // Control: the old rule saw a third less than the stand-in bills, so the check above can fail.
  const probe = requestOf({ settings: sets.thorough, system: "You are the Writer of Prototype Ideator. Test.", content: [{ type: "text", text: big }], schema: recommendationSchema(), maxTokens: AGENT_TOKENS.writer.max });
  const old = Math.ceil((probe.system.length + JSON.stringify(probe.output_config.format.schema).length + big.length) / 4);
  r.control(old < standInTokens(probe, { withFormat: true }) * 0.75, `the old rule of four characters a token saw ${old.toLocaleString("en")} input tokens where the stand-in bills ${standInTokens(probe, { withFormat: true }).toLocaleString("en")}`);
  // Control: with the old rule, the 650,000 characters on Thorough fit €0.40 at full output and passed it when billed.
  const oldFit = fitToCap({ model: sets.thorough.model, inputTokens: old, limits: AGENT_TOKENS.writer, spentEur: 0, capEur: 0.4 });
  const billedEur = worstCaseEur(sets.thorough.model, standInTokens(probe, { withFormat: true }), oldFit.maxTokens ?? AGENT_TOKENS.writer.min);
  r.control(oldFit.maxTokens !== null && billedEur > 0.4, `under the old rule the request went out (max_tokens ${oldFit.maxTokens}) and would have cost €${billedEur.toFixed(4)}, past €0.40`);
}

// Review C5: with the count failing, the cautious ratio took every character past ASCII as one token, which
// no source says holds for every script, and Haiku's price steps up fivefold past 100,000 tokens. Now such a
// character counts at its UTF-8 bytes, and a cautious count within 1.5 times of the step is priced at the
// long-prompt tier; a stop on it says the count didn't answer, with Try again first. The case: 90,000
// Chinese characters at an assumed 1.43 tokens a character (no source gives the 5.5 models' figure).
{
  const sys = "You are the Writer of Prototype Ideator. Test.";
  const zh = "\u6E2F\u53E3\u8CBB\u7528\u4E0A\u5347".repeat(15000);
  const ratio = 1.43;
  const settings = sets.balanced;
  const fake = createFakeClaude((n, req) => ({ answer: writerAnswer, usage: { input_tokens: standInTokens(req, { withFormat: true, otherTokens: ratio }), output_tokens: req.max_tokens } }), { countFails: true });
  stub(fake);
  const meter = createMeter(settings.model, 0.05);
  let err = null;
  try { await runStep({ agent: "writer", key: KEY, settings, system: sys, content: [{ type: "text", text: zh }], schema: recommendationSchema(), check: writerCheck, meter }); } catch (e) { err = e; }
  const msg = messageOf(err);
  r.check(meter.spentEur() <= 0.05 + 1e-9 && err instanceof BudgetStop && err.uncounted === true && msg.vars?.uncounted === true && msg.next === "retry" && fake.requests.length === 0,
    `90,000 Chinese characters at ${ratio} tokens each, the count failing, Balanced at €0.05: the run spends €${meter.spentEur().toFixed(4)} and stops before the request (${err?.name}), saying the count didn't answer, with Try again first (${msg.next})`);
  // Control: the old cautious count saw fewer tokens than the step, let the request out, and its bill passed the cap.
  const probe = requestOf({ settings, system: sys, content: [{ type: "text", text: zh }], schema: recommendationSchema(), maxTokens: AGENT_TOKENS.writer.max });
  const oldTok = (text) => { let a = 0; for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) < 0x80) a += 1; return Math.ceil(a / 2 + (text.length - a)); };
  const oldInput = oldTok(probe.system) + oldTok(JSON.stringify(probe.output_config.format.schema)) + 16 + oldTok(zh);
  const oldFit = fitToCap({ model: settings.model, inputTokens: oldInput, limits: AGENT_TOKENS.writer, spentEur: 0, capEur: 0.05 });
  const billed = worstCaseEur(settings.model, standInTokens(probe, { withFormat: true, otherTokens: ratio }), oldFit.maxTokens ?? AGENT_TOKENS.writer.min);
  r.control(oldFit.maxTokens !== null && oldInput < 100000 && billed > 0.05, `the old cautious count saw ${oldInput.toLocaleString("en")} tokens, under the step, let the request out (max_tokens ${oldFit.maxTokens}), and its bill would have been €${billed.toFixed(4)}`);
  // The bytes: an accented letter 2, a Chinese character 3, an emoji 4, plain ASCII two characters a token.
  r.check(cautiousTokensOf("ab") === 1 && cautiousTokensOf("\u00e4") === 2 && cautiousTokensOf("\u6E2F") === 3 && cautiousTokensOf("\u{1F600}") === 4 && cautiousTokensOf("Gr\u00f6\u00dfe") === 6,
    `the cautious count takes plain ASCII at two characters a token and every other character at its UTF-8 bytes ("ab" ${cautiousTokensOf("ab")}, "\u00e4" ${cautiousTokensOf("\u00e4")}, "\u6E2F" ${cautiousTokensOf("\u6E2F")}, an emoji ${cautiousTokensOf("\u{1F600}")}, "Gr\u00f6\u00dfe" ${cautiousTokensOf("Gr\u00f6\u00dfe")})`);
  // The tier: Haiku's long-prompt prices within 1.5 times of the step on the cautious count only; Sonnet has no step.
  const haiku = "claude-haiku-5-5";
  r.check(longTierOf(haiku, 70000, null) && !longTierOf(haiku, 60000, null) && !longTierOf(haiku, 70000, 70000) && !longTierOf("claude-sonnet-5-5", 99000, null)
    && worstCaseEur(haiku, 70000, 2000, { longTier: true }) > worstCaseEur(haiku, 70000, 2000) * 4.9,
    `the cap takes Haiku's long-prompt prices for a cautious count of 70,000 tokens (€${worstCaseEur(haiku, 70000, 2000, { longTier: true }).toFixed(4)} against €${worstCaseEur(haiku, 70000, 2000).toFixed(4)}), not for 60,000, not for a count that answered, and never for Sonnet`);
  const long = MODELS.find((m) => m.id === haiku).price.longPrompt;
  r.check(Math.abs(worstCaseEur(haiku, 70000, 2000, { longTier: true }) - ((70000 * long.input + 2000 * long.output) / 1e6) * FX_USD_EUR) < 1e-12 && usageCostUsd(haiku, { input_tokens: 70000, output_tokens: 2000 }) * FX_USD_EUR === worstCaseEur(haiku, 70000, 2000),
    "the long-prompt worst case is Haiku's long-prompt prices on input and output, and a bill below the step is still priced at the base tier: the cautious tier is the cap's alone");
}

// ---- a broken stream ---------------------------------------------------------------------------------------
// Review A15: a stream that breaks off may have been billed, and Anthropic's pages don't say. The cap holds its
// worst case as spent and sends the request again only if a second worst case still fits beside it.
{
  const settings = sets.balanced;
  const sys = "You are the Writer of Prototype Ideator. Test.";
  const probe = requestOf({ settings, system: sys, content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), maxTokens: AGENT_TOKENS.writer.max });
  const w = worstCaseEur(settings.model, checkedInputTokens(probe, standInTokens(probe)), AGENT_TOKENS.writer.max);
  const run = (cap) => {
    const fake = createFakeClaude([{ answer: writerAnswer, cutAfter: 1 }, { answer: writerAnswer }]);
    stub(fake);
    const meter = createMeter(settings.model, cap);
    return { fake, meter, go: runStep({ agent: "writer", key: KEY, settings, system: sys, content: [{ type: "text", text: "{}" }], schema: recommendationSchema(), check: writerCheck, meter }) };
  };
  const tight = run(w * 1.5);
  let err = null;
  try { await tight.go; } catch (e) { err = e; }
  r.check(err instanceof BudgetStop && tight.fake.requests.length === 1 && Math.abs(tight.meter.heldEur() - w) < 1e-12, `a stream that breaks off with the cap under two worst cases: its worst case (€${w.toFixed(4)}) is held, and the run stops instead of sending it again (${err?.name}, ${tight.fake.requests.length} request)`);
  const roomy = run(w * 2.5);
  const out = await roomy.go;
  r.check(out.answer && roomy.fake.requests.length === 2 && Math.abs(roomy.meter.heldEur() - w) < 1e-12 && roomy.meter.snapshot().eur < roomy.meter.reservedEur(), `with room for both, it goes again and the answer comes; the hold counts for the cap (€${roomy.meter.reservedEur().toFixed(4)}), the meter shows what was billed (€${roomy.meter.snapshot().eur.toFixed(4)})`);
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
