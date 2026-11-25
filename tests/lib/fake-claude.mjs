// A scripted stand-in for POST /v1/messages and its free neighbours, for the live run's tests: no test calls
// the real API or spends anything. It streams each structured answer as the API does (message_start, one
// text block in pieces, message_delta with the stop reason and the usage, message_stop), plays errors with
// their status, type, message and retry-after, and checks every request against the rules a live run must
// keep (brief §5.2 to §5.4, AC-08): both headers and the key, stream on, the model, the effort, the thinking
// field the setting asks for, the step's output_config.format, a system prompt and a user turn last.
// Adapted from the Sovereignty Assessment 2.0.0's tests/lib/fake-claude.mjs (35c0dea): single structured
// requests instead of a tool loop, so no tools, no pause_turn and no nudges.

export const KEY = "sk-ant-test-MOCKKEY-0123456789abcdefghijklmnopqrstuvwxyz0123456789";

/** The SSE of one message: its text block in pieces, then the stop reason and the usage. */
export function sseFor({ id = "msg_1", model, text, stop = "end_turn", usage = {}, cutAfter = null }) {
  const ev = [];
  const push = (event, data) => ev.push(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  push("message_start", { type: "message_start", message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, usage: { input_tokens: usage.input_tokens ?? 1800, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1 } } });
  push("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  const pieces = [];
  for (let i = 0; i < text.length; i += 97) pieces.push(text.slice(i, i + 97));
  for (const [k, piece] of pieces.entries()) {
    if (cutAfter !== null && k >= cutAfter) return ev.join("");
    push("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: piece } });
  }
  push("content_block_stop", { type: "content_block_stop", index: 0 });
  push("message_delta", { type: "message_delta", delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: usage.output_tokens ?? 900, server_tool_use: { web_search_requests: usage.web_search_requests ?? 0 } } });
  push("message_stop", { type: "message_stop" });
  return ev.join("");
}

/** The agent a request is for, from its system prompt. */
export function agentOf(req) {
  const s = String(req?.system || "");
  if (/^You are the Ideator/.test(s)) return "ideator";
  if (/^You are the Writer/.test(s)) return "writer";
  if (/^You are the Brief writer/.test(s)) return "brief";
  if (/^You are the Reader/.test(s)) return /Find the issues that name the same thing/.test(s) ? "merges" : "reader";
  return "unknown";
}

/**
 * script: a list of steps, or a function (n, req) giving the step for the n-th request (1-based). A step is
 * { answer } (an object, sent as JSON), { text } (sent as it is), with stop and usage, or { error: { status,
 * type, message, retryAfter } }; expect(req, check) adds its own checks. expectSetting: { model, effort,
 * thinking } the requests must carry (thinking null means the field left out).
 */
export function createFakeClaude(script, { expectSetting = null } = {}) {
  const violations = [];
  const requests = [];
  let i = 0;
  const check = (cond, msg) => { if (!cond) violations.push(`request ${requests.length} (${agentOf(requests[requests.length - 1]?.req)}): ${msg}`); };

  function validate(req, headers) {
    check(typeof headers["x-api-key"] === "string" && headers["x-api-key"].startsWith("sk-ant-"), "x-api-key missing");
    check(headers["anthropic-version"] === "2023-06-01", "anthropic-version is not 2023-06-01");
    check(headers["anthropic-dangerous-direct-browser-access"] === "true", "the direct-browser-access header is missing");
    check(/application\/json/.test(headers["content-type"] || ""), "content-type is not JSON");
    check(req.stream === true, "stream must be true");
    check(Number.isInteger(req.max_tokens) && req.max_tokens > 0, "max_tokens missing");
    check(req.output_config?.format?.type === "json_schema" && req.output_config.format.schema && typeof req.output_config.format.schema === "object", "output_config.format is not a json_schema");
    check(["low", "medium", "high"].includes(req.output_config?.effort), `effort "${req.output_config?.effort}" is not low, medium or high`);
    check(!("tools" in req) && !("tool_choice" in req), "a structured request sends no tools");
    check(typeof req.system === "string" && /^You are the (Reader|Ideator|Writer|Brief writer) of Prototype Ideator/.test(req.system), "the system prompt is not an agent's");
    const msgs = req.messages || [];
    check(msgs.length >= 1 && msgs[0].role === "user" && msgs[msgs.length - 1].role === "user", "the messages don't start and end with the user");
    if (req.thinking) check(!(req.thinking.type === "disabled" && req.model !== "claude-haiku-5-5"), `thinking "disabled" on ${req.model}, which refuses it`);
    if (expectSetting) {
      check(req.model === expectSetting.model, `model ${req.model}, the setting asks for ${expectSetting.model}`);
      check(req.output_config?.effort === expectSetting.effort, `effort ${req.output_config?.effort}, the setting asks for ${expectSetting.effort}`);
      check(JSON.stringify(req.thinking ?? null) === JSON.stringify(expectSetting.thinking ?? null), `thinking ${JSON.stringify(req.thinking ?? null)}, the setting asks for ${JSON.stringify(expectSetting.thinking ?? null)}`);
    }
  }

  return {
    violations, requests,
    remaining: () => (typeof script === "function" ? Infinity : script.length - i),
    agents: () => requests.map((r) => agentOf(r.req)),
    /** One request: (raw body, headers) to { status, headers, body }. */
    handle(raw, headers) {
      const req = JSON.parse(raw);
      const entry = { req, headers: { ...headers }, at: Date.now() };
      requests.push(entry);
      validate(req, headers);
      const step = typeof script === "function" ? script(requests.length, req) : script[i++];
      if (!step) {
        violations.push(`unexpected request ${requests.length} (${agentOf(req)}): the script has no more answers`);
        return { status: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "error", error: { type: "api_error", message: "script exhausted" } }) };
      }
      try { step.expect?.(req, check); } catch (e) { violations.push(`request ${requests.length}: expectation threw ${e.message}`); }
      if (step.error) {
        const h = { "content-type": "application/json" };
        if (step.error.retryAfter !== undefined) h["retry-after"] = String(step.error.retryAfter);
        return { status: step.error.status, headers: h, body: JSON.stringify({ type: "error", error: { type: step.error.type, message: step.error.message, ...(step.error.details ? { details: step.error.details } : {}) } }) };
      }
      const text = step.text !== undefined ? step.text : JSON.stringify(step.answer);
      return { status: 200, headers: { "content-type": "text/event-stream", "request-id": `req_${requests.length}` }, body: sseFor({ id: `msg_${requests.length}`, model: req.model, text, stop: step.stop || "end_turn", usage: step.usage || {}, cutAfter: step.cutAfter ?? null }) };
    }
  };
}

/** GET /v1/models for a key: the 5.5 models for the stand-in's key, 401 for any other. */
export function modelsFor(key, ids = ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"]) {
  if (key !== KEY) return { status: 401, body: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } } };
  return { status: 200, body: { data: ids.map((id) => ({ id, type: "model", display_name: id })), has_more: false } };
}
