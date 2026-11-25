// The free token count (POST /v1/messages/count_tokens, brief §5.5 and §5.6) before every request of a live
// run: the budget cap needs the request's real input tokens before it goes out. A character ratio is only a
// guess, which Anthropic's glossary puts at about 2.7 characters a token for English on the 5.5 models and
// which other languages and scripts miss by more, and Anthropic's rule of 1,500 to 3,000 text tokens plus
// 1,568 image tokens a PDF page is only a range. It sits beside the shared client (js/anthropic.js), which
// stays the same file in all four tools; like it, it sends the key to api.anthropic.com and nowhere else,
// keeps nothing and logs nothing. tests/policy.mjs allows fetch in these two modules only.

import { ANTHROPIC } from "./config.js";

/**
 * The input tokens of a request's system prompt and messages, or null when the count fails (the cap then
 * takes the request at a cautious ratio and the PDFs at the rule's high end). The output schema is not
 * sent, so the count can't fail on a field it doesn't take: the caller adds the schema's tokens.
 */
export async function countTokens({ key, body, signal = null, timeoutMs = 20000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(ANTHROPIC.countTokensUrl, {
      method: "POST",
      headers: {
        "anthropic-version": ANTHROPIC.apiVersion,
        "content-type": "application/json",
        [ANTHROPIC.browserHeader]: "true",
        "x-api-key": key
      },
      body: JSON.stringify({ model: body.model, system: body.system, messages: body.messages }),
      signal: ctrl.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Number.isFinite(json?.input_tokens) ? json.input_tokens : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
