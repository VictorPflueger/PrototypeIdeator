// The Ideator probe (js/probe.js), against a scripted stand-in for the Claude API: fetch is replaced, so
// no request leaves this machine. Each preset sends the real request (the preset's model, effort and
// thinking, the Ideator's output schema for eight ideas, its prompt and the state of Tidewell Lines, the
// stream flag and both headers); a good answer reads, passes the guards and the fact audit, is ranked
// by the engine and priced from its usage; a refused key, an eleventh idea and an answer cut off at
// max_tokens each show in the table without a crash; and the key is in no row and not in the record kept
// in memory. Prints PROBE OK.
// Usage: node tests/probe.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";
import { MOCK_KEY } from "./lib/harness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = await import(path.join(ROOT, "js", "probe.js"));
const S = await import(path.join(ROOT, "js", "schemas.js"));
const M = await import(path.join(ROOT, "js", "prompts.js"));
const C = await import(path.join(ROOT, "js", "config.js"));
const E = await import(path.join(ROOT, "js", "engine.js"));
const r = createReport("probe");

const GOOD = readFileSync(path.join(ROOT, "tests", "fixtures", "ideator-s1-answer.json"), "utf8");
const sse = (events) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
/** A streamed answer: the text in chunks, then the stop reason and the usage. */
function streamed(text, { stop = "end_turn", input = 3200, output = 5400, thinking = false } = {}) {
  const events = [{ type: "message_start", message: { id: "msg_stand_in", model: "stand-in", role: "assistant", content: [], usage: { input_tokens: input, output_tokens: 1 } } }];
  let i = 0;
  if (thinking) {
    events.push({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } });
    events.push({ type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "sig" } });
    events.push({ type: "content_block_stop", index: 0 });
    i = 1;
  }
  events.push({ type: "content_block_start", index: i, content_block: { type: "text", text: "" } });
  for (let k = 0; k < text.length; k += 700) events.push({ type: "content_block_delta", index: i, delta: { type: "text_delta", text: text.slice(k, k + 700) } });
  events.push({ type: "content_block_stop", index: i });
  events.push({ type: "message_delta", delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: output } });
  events.push({ type: "message_stop" });
  const bytes = new TextEncoder().encode(sse(events));
  return new Response(new ReadableStream({ start(c) { for (let k = 0; k < bytes.length; k += 4096) c.enqueue(bytes.slice(k, k + 4096)); c.close(); } }), { status: 200, headers: { "content-type": "text/event-stream", "request-id": "req_stand_in" } });
}
const refused = () => new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" }, request_id: "req_401" }), { status: 401, headers: { "content-type": "application/json" } });

const sent = [];
let script = [];
globalThis.fetch = async (url, init = {}) => {
  sent.push({ url: String(url), headers: { ...init.headers }, body: init.body ? JSON.parse(init.body) : null });
  const next = script.shift();
  if (!next) throw new Error("the stand-in has no answer left");
  return next();
};
let clock = 0;
const now = () => (clock += 1500);

// ---- three presets, one good answer each ----------------------------------------------------------------------
script = [() => streamed(GOOD), () => streamed(GOOD, { thinking: true, output: 7900 }), () => streamed(GOOD, { thinking: true, output: 8100 })];
const res = await P.run(MOCK_KEY, ["fast", "balanced", "thorough"], { now });
r.check(sent.length === 3 && sent.every((s) => s.url === "https://api.anthropic.com/v1/messages"), "each preset sends one request, to api.anthropic.com only");
r.check(sent.every((s) => s.headers["x-api-key"] === MOCK_KEY && s.headers["anthropic-version"] === "2023-06-01" && s.headers["anthropic-dangerous-direct-browser-access"] === "true" && s.headers["content-type"] === "application/json"), "every request carries the key header, anthropic-version 2023-06-01 and the browser header");
const [fast, balanced, thorough] = sent.map((s) => s.body);
r.check(fast.model === "claude-haiku-5-5" && fast.output_config.effort === "low" && same(fast.thinking, { type: "disabled" }), "Fast sends Haiku 5.5, effort low and thinking disabled");
r.check(balanced.model === "claude-haiku-5-5" && balanced.output_config.effort === "medium" && !("thinking" in balanced), "Balanced sends Haiku 5.5, effort medium and no thinking field");
r.check(thorough.model === "claude-sonnet-5-5" && thorough.output_config.effort === "medium" && !("thinking" in thorough), "Thorough sends Sonnet 5.5, effort medium and no thinking field");
const schema8 = S.ideasSchema(8);
r.check(sent.every((s) => s.body.stream === true && s.body.max_tokens === 16000 && s.body.output_config.format.type === "json_schema" && same(s.body.output_config.format.schema, schema8)), "every request streams, allows 16,000 output tokens to measure the need, and sets the Ideator's schema for eight ideas");
r.check(/\{maxItems: 8\}/.test(schema8.properties.ideas.description) && !JSON.stringify(schema8).includes('"maxItems"'), "the schema states the cap in its description, not as the keyword structured outputs refuse");
r.check(sent.every((s) => s.body.system === M.ideatorPrompt({ lang: "en", count: 8 }) && s.body.messages.length === 1 && s.body.messages[0].role === "user" && s.body.messages[0].content[0].text === P.probeState({ count: 8 }).input), "every request carries the Ideator's real prompt and the state of Tidewell Lines as its one user turn");
r.check(sent.every((s) => !JSON.stringify(s.body).includes(MOCK_KEY)), "the key is in a header only, never in a request body");

r.check(res.runs.length === 3 && res.runs.every((x) => x.readable === "yes" && x.ideas === 8 && x.asked === 8 && x.refusals === 0 && x.audit === 0 && x.notes === 0), "each answer reads, passes the schema, the guards and the fact audit, with eight ideas of eight asked");
r.check(same(res.runs.map((x) => x.thinking), ["disabled", "adaptive", "adaptive"]) && same(res.runs.map((x) => x.model), ["Haiku 5.5", "Haiku 5.5", "Sonnet 5.5"]) && res.runs.every((x) => x.seconds === 1.5 && x.stop === "end_turn"), "the table names each setting's model and thinking, its time and its stop reason");
const eur = (model, input, output) => Math.round(((input * C.MODELS.find((m) => m.id === model).price.input + output * C.MODELS.find((m) => m.id === model).price.output) / 1e6) * C.FX_USD_EUR * 10000) / 10000;
r.check(same(res.runs.map((x) => x.cost_eur), [eur("claude-haiku-5-5", 3200, 5400), eur("claude-haiku-5-5", 3200, 7900), eur("claude-sonnet-5-5", 3200, 8100)]) && same(res.runs.map((x) => [x.input_tokens, x.output_tokens]), [[3200, 5400], [3200, 7900], [3200, 8100]]), `each run is priced from its usage at the verified prices and 0.894 euros a dollar (${res.runs.map((x) => x.cost_eur).join(", ")})`);
r.check(res.runs.every((x) => x.issues_covered === "8 of 8" && x.top === "Allowance Gap Agent 4.70"), "the table shows the issues covered and the engine's top idea with its score");
const ranked = E.rankIdeas(JSON.parse(GOOD).ideas.map((x, i) => ({ id: `P${i + 1}`, ...x })), E.DEFAULT_WEIGHTS);
r.check(res.ideas.length === 24 && same(res.ideas.slice(0, 8).map((x) => x.name), ranked.map((x) => x.name)) && same(res.ideas.slice(0, 8).map((x) => x.rank), [1, 2, 3, 4, 5, 6, 7, 8]), "the idea rows follow the engine's ranking, eight per setting");
const gap = res.ideas.find((x) => x.name === "Allowance Gap Agent");
const st = E.stability(JSON.parse(GOOD).ideas.map((x, i) => ({ id: `P${i + 1}`, ...x })), E.DEFAULT_WEIGHTS);
r.check(gap.firsts === `${st.counts.P1.firsts} of ${st.of}` && gap.firsts === "8 of 9" && gap.ratings === "5 4 5 4 5 5 4" && gap.issues === "bmc-I1 pestel-I3", `each idea row carries its stability count, its issues and its ratings (${gap.firsts}; ${gap.ratings})`);
const index = res.ideas.find((x) => x.name === "Rate Index Watch");
r.check(/Average freight rate: \$4,176 per 40 ft container on 19 November 2026 \(Drewry World Container Index\)/.test(index.key_figures) && /Vessel utilisation: not public/.test(index.key_figures), "key figures show today's value with its source, or not public");

const rec = globalThis.piProbe;
r.check(rec && rec.runs.length === 3 && rec.runs.every((x) => x.answer && x.request && x.ranking.length === 8 && x.stability.of === 9), "the full record stays in this tab's memory in piProbe: request, answer, ranking and stability");
r.check(!JSON.stringify(res).includes(MOCK_KEY) && !JSON.stringify(rec).includes(MOCK_KEY) && !/sk-ant-/.test(JSON.stringify(res) + JSON.stringify(rec)), "the key is in no row and not in the record kept in memory");

// ---- what goes wrong shows in the table ----------------------------------------------------------------------
sent.length = 0;
const eleven = JSON.parse(GOOD);
for (let k = 8; k < 9; k += 1) eleven.ideas.push({ ...structuredClone(eleven.ideas[0]), name: `Extra ${k}` });
script = [refused, () => streamed(JSON.stringify(eleven)), () => streamed(GOOD.slice(0, 5000), { stop: "max_tokens", output: 16000 })];
const bad = await P.run(MOCK_KEY, ["fast", "balanced", "thorough"], { now });
r.check(/^no: HTTP 401 authentication_error: invalid x-api-key/.test(bad.runs[0].readable) && sent.length === 3, "a refused key shows its status and message, is not retried, and the next setting still runs");
r.check(bad.runs[1].readable === "yes" && bad.runs[1].ideas === 9 && bad.runs[1].refusals >= 1 && globalThis.piProbe.runs[1].refusals.some((x) => /9 ideas, but at most 8/.test(x)), "an idea beyond the number asked for is refused");
r.check(bad.runs[2].stop === "max_tokens" && /^no: not JSON/.test(bad.runs[2].readable) && bad.runs[2].ideas === 0, "an answer cut off at max_tokens shows as unreadable, with its stop reason");
r.check(!JSON.stringify(bad).includes(MOCK_KEY) && !JSON.stringify(globalThis.piProbe).includes(MOCK_KEY), "no key in the table or the record when a request fails");

// ---- a German run and the arguments ----------------------------------------------------------------------------
sent.length = 0;
script = [() => streamed(GOOD)];
await P.run(`  ${MOCK_KEY}  `, "fast", { now, lang: "de", count: 5 });
r.check(sent[0].headers["x-api-key"] === MOCK_KEY && sent[0].body.system === M.ideatorPrompt({ lang: "de", count: 5 }) && same(sent[0].body.output_config.format.schema, S.ideasSchema(5)) && JSON.parse(sent[0].body.messages[0].content[0].text).ideas_wanted === 5, "a German run of five ideas sends the German prompt and the schema for five; a key pasted with spaces is trimmed");
let threw = null;
try { await P.run(null); } catch (e) { threw = e.message; }
r.check(/No key given/.test(threw || ""), "without a key the probe stops before any request");
threw = null;
try { P.presetById("cheap"); } catch (e) { threw = e.message; }
r.check(/No preset "cheap"/.test(threw || ""), "an unknown setting is named in the error");
r.control(P.checkAnswer({ preset: "fast", message: { content: [{ type: "text", text: "{}" }], usage: {}, stop_reason: "end_turn" } }).row.readable !== "yes", "an answer without ideas does not read as a good one");

r.finish("PROBE OK");
