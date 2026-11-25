// Units in Node: the key store holds the key in memory and touches no browser storage; the session forgets
// everything on Clear everything and warns before leaving only while a result isn't downloaded; the
// configuration says what the brief and the verified prices say; the copied client streams a structured
// answer with both headers, retries a busy API and checks a key for free; the cost meter, the SSE reader
// and the money formats give their known results. Prints UNIT OK.
// Usage: node tests/unit.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReport, same } from "./lib/report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => readFileSync(path.join(ROOT, f), "utf8");
const r = createReport("unit");

// Browser storage stand-ins that count every write: none may happen in this suite.
const writes = [];
const fakeStorage = (name) => ({ getItem: () => null, setItem: (k) => writes.push(`${name}.setItem(${k})`), removeItem: (k) => writes.push(`${name}.removeItem(${k})`), clear: () => writes.push(`${name}.clear()`) });
globalThis.localStorage = fakeStorage("localStorage");
globalThis.sessionStorage = fakeStorage("sessionStorage");
globalThis.indexedDB = { open: () => { writes.push("indexedDB.open"); return {}; } };
globalThis.caches = { open: async () => { writes.push("caches.open"); return {}; } };

const K = await import(path.join(ROOT, "js", "keystore.js"));
const S = await import(path.join(ROOT, "js", "session.js"));
const C = await import(path.join(ROOT, "js", "config.js"));
const COST = await import(path.join(ROOT, "js", "cost.js"));
const F = await import(path.join(ROOT, "js", "format.js"));
const { readSse } = await import(path.join(ROOT, "js", "sse.js"));
const A = await import(path.join(ROOT, "js", "anthropic.js"));
const KEY = "sk-ant-api03-TESTKEY-abcdefghijklmnopqrstuvwxyz0123456789-9fQx";
const STORAGE_API = /\b(localStorage|sessionStorage|indexedDB|caches|document\.cookie|cookieStore)\b/;

// ---- the checks can fail ----------------------------------------------------------------------------------
r.control(STORAGE_API.test("try { sessionStorage.setItem(STORAGE.apiKey, key); } catch {}"), "the storage scan finds a session-storage write, as the sisters' key store has");
r.control(STORAGE_API.test(src("js/i18n/index.js")), "the storage scan finds the language choice where it is stored, so it reads real files");

// ---- the key store ----------------------------------------------------------------------------------------
r.check(!STORAGE_API.test(src("js/keystore.js").replace(/^\/\/.*$/gm, "")), "js/keystore.js names no browser storage in its code");
r.check(K.getKey() === null && !K.hasKey(), "no key at start");
K.setKey(`  ${KEY}  `);
r.check(K.getKey() === KEY && K.hasKey(), "the key is held, trimmed");
r.check(K.maskKey() === "sk-ant-…9fQx", `it shows masked: ${K.maskKey()}`);
r.check(K.looksLikeKey(KEY) && !K.looksLikeKey("sk-ant-short") && !K.looksLikeKey("my key"), "a key-shaped value looks like a key; others don't");
r.check(K.redactSecrets(`failed for ${KEY} today`) === "failed for sk-ant-[REDACTED] today", "a key in a text is redacted");
K.forgetKey();
r.check(K.getKey() === null, "Forget key clears it");
K.setKey("   ");
r.check(K.getKey() === null, "an empty value holds no key");

// ---- the session ------------------------------------------------------------------------------------------
r.check(!STORAGE_API.test(src("js/session.js").replace(/^\/\/.*$/gm, "").replace(/\/\/.*$/gm, "")), "js/session.js names no browser storage in its code");
{
  K.setKey(KEY);
  S.addDocument({ id: "d1", name: "report.pdf", kind: "pdf", bytes: 1200, pages: 3, stand_in: false, fictional: false, from: "upload" }, "JVBERi0xLjQ=");
  S.updateSession({ mode: "live", ideas: [{ id: "P1" }] });
  r.check(S.session().documents.length === 1 && S.contentOf("d1") === "JVBERi0xLjQ=" && S.session().mode === "live", "a document and its content are held, with the run's state");
  let calls = 0;
  const stop = S.onSessionChange(() => { calls += 1; });
  S.markResult();
  r.check(S.hasUnsavedResult(), "a result that isn't downloaded counts as unsaved");
  const target = { listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, removeEventListener(type) { delete this.listeners[type]; } };
  const remove = S.installLeaveWarning(target);
  const ev = () => ({ prevented: false, returnValue: undefined, preventDefault() { this.prevented = true; } });
  const e1 = ev(); target.listeners.beforeunload(e1);
  r.check(e1.prevented && e1.returnValue === "", "leaving then asks first: the browser's own warning");
  S.markDownloaded();
  const e2 = ev(); target.listeners.beforeunload(e2);
  r.check(!e2.prevented, "after the download it doesn't ask");
  remove();
  r.check(!target.listeners.beforeunload, "the warning can be removed");
  S.clearEverything();
  r.check(S.session().documents.length === 0 && S.contentOf("d1") === undefined && S.session().ideas.length === 0 && S.session().mode === "simulation" && K.getKey() === null && !S.hasUnsavedResult(), "Clear everything empties the session and forgets the key");
  r.check(calls >= 3, "every change tells the listeners");
  stop();
}
r.check(!writes.length, `nothing was written to browser storage (${writes.join(", ") || "no writes"})`);

// ---- the configuration ------------------------------------------------------------------------------------
r.check(C.CSP === "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'", "the policy is the brief's, word for word");
r.check(same(C.PRESETS, [
  { id: "fast", model: "claude-haiku-5-5", effort: "low", thinking: { type: "disabled" } },
  { id: "balanced", model: "claude-haiku-5-5", effort: "medium", thinking: null },
  { id: "thorough", model: "claude-sonnet-5-5", effort: "medium", thinking: null }
]) && C.DEFAULT_PRESET === "balanced" && C.DEFAULT_MODEL === "claude-haiku-5-5", "the three settings of the brief's 5.4, Balanced on Haiku 5.5 by default");
const price = (id) => C.MODELS.find((m) => m.id === id).price;
r.check(same(price("claude-haiku-5-5"), { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01, longPrompt: { thresholdTokens: 100000, input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 } }), "Haiku 5.5's prices, with its step above 100,000 prompt tokens");
r.check(same(price("claude-sonnet-5-5"), { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 }) && same(price("claude-opus-5-5"), { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 }), "Sonnet 5.5's and Opus 5.5's prices as read on 23 November 2026");
r.check(C.FX_USD_EUR === 0.894 && C.ANTHROPIC.webSearchUsdPer1000 === 10 && C.ANTHROPIC.apiVersion === "2023-06-01", "0.894 euros a dollar, $10 per 1,000 searches, API version 2023-06-01");
r.check(same(C.BUDGET, { minEur: 0.05, maxEur: 3, defaultEur: 0.5, stepEur: 0.05 }), "the budget cap runs from €0.05 to €3.00, €0.50 by default");
r.check(C.LIMITS.files === 5 && C.LIMITS.totalBytes === 20 * 1024 * 1024 && C.LIMITS.pdfPages === 100 && C.LIMITS.ideasMin === 1 && C.LIMITS.ideasMax === 10 && C.LIMITS.ideasDefault === 5, "five files, 20 MB, 100 pages, one to ten ideas with five by default");
r.check(same(C.STORAGE, { lang: "pi.lang" }) && C.THEME_KEY === "vc-theme" && C.GUIDE_NOTE_PREFIX === "vc-guide:", "the only storage keys: pi.lang, vc-theme and Vici's vc-guide: note");
r.check(Object.values(C.AGENT_TOKENS).every((a) => a.max <= 8000 && a.min < a.max), "every agent starts at 8,000 output tokens or fewer");

// ---- the cost meter -----------------------------------------------------------------------------------------
{
  const u = { input_tokens: 10000, output_tokens: 12000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const haiku = COST.usageCostUsd("claude-haiku-5-5", u);
  r.check(Math.abs(haiku - (10000 * 0.1 + 12000 * 0.5) / 1e6) < 1e-12, `Haiku 5.5: 10,000 in and 12,000 out cost $${haiku.toFixed(6)}`);
  const long = COST.usageCostUsd("claude-haiku-5-5", { input_tokens: 120000, output_tokens: 1000 });
  r.check(Math.abs(long - (120000 * 0.5 + 1000 * 2.5) / 1e6) < 1e-12, "above 100,000 prompt tokens Haiku 5.5 costs $0.50 and $2.50 per million");
  const search = COST.usageCostUsd("claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } });
  r.check(Math.abs(search - 0.03) < 1e-12, "three web searches add $0.03");
  const tracker = COST.createCostTracker("claude-sonnet-5-5");
  tracker.add(u); const snap = tracker.add(u);
  r.check(snap.requests === 2 && Math.abs(snap.eur - snap.usd * 0.894) < 1e-12 && Math.abs(snap.usd - 2 * (10000 * 2 + 12000 * 10) / 1e6) < 1e-12, "the meter adds up two requests and converts at 0.894");
}

// ---- the SSE reader ---------------------------------------------------------------------------------------
{
  const chunks = ["event: a\r", "\ndata: {\"x\":1}\r\n\r\n", "data: two\ndata: lines\n\n: a comment\n\nevent: b\ndata: end"];
  const body = new ReadableStream({ start(c) { for (const s of chunks) c.enqueue(new TextEncoder().encode(s)); c.close(); } });
  const got = [];
  await readSse(body, (rec) => got.push(rec));
  r.check(same(got, [{ event: "a", data: "{\"x\":1}" }, { event: "message", data: "two\nlines" }, { event: "b", data: "end" }]), "records split across chunks and CR LF endings read whole");
}

// ---- the client against a scripted API ---------------------------------------------------------------------
const sse = (events) => new ReadableStream({ start(c) { for (const e of events) c.enqueue(new TextEncoder().encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)); c.close(); } });
function answer(text) {
  return [
    { type: "message_start", message: { id: "msg_1", model: "claude-haiku-5-5", usage: { input_tokens: 900, output_tokens: 1 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    ...[text.slice(0, 9), text.slice(9)].map((part) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: part } })),
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 42 } },
    { type: "message_stop" }
  ];
}
{
  const sent = [];
  let busy = 2;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    if (busy > 0) { busy -= 1; return new Response(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }), { status: 529, headers: { "retry-after": "0.01" } }); }
    return new Response(sse(answer('{"ideas":[]}')), { status: 200, headers: { "content-type": "text/event-stream", "request-id": "req_1" } });
  };
  const body = { model: "claude-haiku-5-5", max_tokens: 8000, output_config: { effort: "medium", format: { type: "json_schema", schema: { type: "object" } } }, messages: [{ role: "user", content: "x" }] };
  const retries = [];
  const out = await A.withRetry(() => A.streamMessage({ key: KEY, body }), { onRetry: (x) => retries.push(x.attempt) });
  r.check(out.message.content[0].text === '{"ideas":[]}' && out.message.stop_reason === "end_turn" && out.message.usage.output_tokens === 42, "a streamed answer is rebuilt whole, with its usage");
  r.check(same(retries, [1, 2]) && sent.length === 3, `a busy API (529) is asked again twice, then answers (${sent.length} requests)`);
  const h = sent[0].headers;
  r.check(sent.every((s) => s.url === "https://api.anthropic.com/v1/messages") && h["x-api-key"] === KEY && h["anthropic-version"] === "2023-06-01" && h["anthropic-dangerous-direct-browser-access"] === "true", "every request goes to api.anthropic.com with the key, the version and the browser header");
  r.check(sent[2].body.stream === true && same(sent[2].body.output_config, body.output_config), "it streams and sends the output format unchanged");
}
{
  globalThis.fetch = async () => new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), { status: 401 });
  let tries = 0;
  const err = await A.withRetry(() => { tries += 1; return A.streamMessage({ key: KEY, body: { model: "claude-haiku-5-5", max_tokens: 10, messages: [] } }); }).catch((e) => e);
  r.check(err instanceof A.ApiError && err.status === 401 && tries === 1, "a rejected key (401) is not asked again");
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ id: "claude-haiku-5-5" }, { id: "claude-sonnet-5-5" }, { id: "claude-opus-5-5" }] }), { status: 200 });
  const chk = await A.checkKey(KEY);
  r.check(chk.ok && chk.missing.length === 0, "the free key check lists the models the key may use");
}

// ---- a choice on the issue map ----------------------------------------------------------------------------
{
  const ISSUES = await import(path.join(ROOT, "js", "issues.js"));
  const issues = ["doc-I1", "doc-I2", "doc-I3"].map((id) => ({ id, title: id, status: "kept" }));
  let d = ISSUES.decide(null, "doc-I2", "park", { reason: "Out of scope" });
  d = ISSUES.decide(d, "doc-I3", "merge", { into: "doc-I1" });
  const run = ISSUES.applyDecisions(issues, d);
  const at = (id) => run.find((i) => i.id === id);
  r.check(ISSUES.choiceTook(at("doc-I2"), "park") && ISSUES.choiceTook(at("doc-I3"), "merge") && ISSUES.choiceTook(at("doc-I1"), "keep"), "each choice shows on its issue: parked, merged and kept");
  r.check(!ISSUES.choiceTook(at("doc-I1"), "park") && !ISSUES.choiceTook(undefined, "keep") && !ISSUES.choiceTook(at("doc-I1"), "drop"), "a choice that didn't take, a missing issue and an unknown action are told apart");
}

// ---- money and dates in both languages --------------------------------------------------------------------
// Money at stake in the format of the shared js/risk.js: millions with one decimal, thousands whole.
const CASES = [
  [9450000, "€9.5m", "9,5 Mio. €"],
  [950000, "€950k", "950 Tsd. €"],
  [999500, "€1.0m", "1,0 Mio. €"],
  [2000000, "€2.0m", "2,0 Mio. €"],
  [14200000, "€14.2m", "14,2 Mio. €"],
  [800, "€800", "800 €"]
];
for (const [v, en, de] of CASES) r.check(F.fmtEurCompact(v, "en") === en && F.fmtEurCompact(v, "de") === de, `${v} euros: ${en} and ${JSON.stringify(de)}`);
r.check(F.fmtEurRange(600000, 1200000, "en") === "€600k–€1.2m" && F.fmtEurRange(600000, 1200000, "de") === "600 Tsd. € – 1,2 Mio. €", "a range across scales repeats each unit");
r.check(F.fmtScore(null, "en") === "no figure" && F.fmtScore(null, "de") === "keine Angabe" && F.fmtEurCompact(null, "en") === "no figure", "a missing value says so, never 0");
r.check(F.fmtDate("2026-11-19", "en") === "19 November 2026" && F.fmtDate("2026-11-19", "de") === "19. November 2026", "dates with the month written out");
r.check(F.fmtShare(0.74, "en") === "74\u00a0%" && F.fmtShare(0.74, "de") === "74\u00a0%", "shares as whole percentages, a no-break space before the sign in both languages (Vici's writing rule)");
r.check(F.fmtEurRun(0.0044, "en") === "€0.004" && F.fmtEurRun(0.02485, "en") === "€0.025" && F.fmtEurRun(0.02485, "de") === "0,025\u00a0€" && F.fmtEurRun(0.12, "en") === "€0.12" && F.fmtEurRun(0.0003, "en") === "under €0.001" && F.runShown(0.02485) === 0.025, "one live run: a tenth of a cent below €0.10, then cents, never €0.00");

// The quote check (review A18): a quote found in its text file proves where it stands only when it is long
// enough; a few words could stand anywhere.
{
  const I = await import(path.join(ROOT, "js", "issues.js"));
  const file = { file: "notes.md", kind: () => "markdown", content: () => "# Notes\n\nCustomers wait two days for a quote because the desk checks every surcharge by hand." };
  r.check(I.checkQuote("Customers wait two days for a quote", file) === "word-for-word" && I.checkQuote("two days", file) === "not-checked" && I.checkQuote("Customers wait three days", file) === "failed", `a quote of ${I.QUOTE_MIN_CHARS} characters or more is checked word for word; "two days" is found but too short to prove it; a quote not in the file fails`);
}
r.finish("UNIT OK");
