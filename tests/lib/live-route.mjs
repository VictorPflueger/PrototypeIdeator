// The scripted stand-in on a browser context: api.anthropic.com's free model list, free token count and
// Messages API answered by tests/lib/fake-claude.mjs, every other outside host refused. Shared by the live
// suite and the page suite's layout of the live screens, so both drive the page the same way.
import { CORS } from "./harness.mjs";
import { modelsFor, standInTokens } from "./fake-claude.mjs";

const HEADERS = { ...CORS, "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

/**
 * Routes a Playwright context. fake: createFakeClaude(...); models(key): the model list's answer; count: a
 * PDF's tokens in the free token count, which answers the stand-in's count of the request's texts plus that
 * for each document (or a function (req) giving the whole answer, or null for a count that fails);
 * hold(n): ms to hold the n-th Messages answer; fail(n): true to fail the n-th request at the network.
 * Returns net: every outside request but the browser's preflights, in order.
 */
export async function routeStandIn(context, fake, { models = null, count = 9000, hold = null, fail = null } = {}) {
  const net = [];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const req = route.request();
    const url = req.url();
    if (req.method() !== "OPTIONS") net.push({ method: req.method(), url, at: Date.now() });
    if (!url.startsWith("https://api.anthropic.com/")) return route.abort("blockedbyclient");
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: HEADERS });
    if (url.includes("/v1/models")) {
      const m = (models || modelsFor)(req.headers()["x-api-key"]);
      return route.fulfill({ status: m.status, headers: { ...HEADERS, "content-type": "application/json" }, body: JSON.stringify(m.body) });
    }
    if (url.includes("/v1/messages/count_tokens")) {
      const body = JSON.parse(req.postData() || "{}");
      const n = typeof count === "function" ? count(body) : count === null ? null : standInTokens(body, { docTokens: count });
      if (n === null) return route.fulfill({ status: 500, headers: { ...HEADERS, "content-type": "application/json" }, body: JSON.stringify({ type: "error", error: { type: "api_error", message: "count failed" } }) });
      return route.fulfill({ status: 200, headers: { ...HEADERS, "content-type": "application/json" }, body: JSON.stringify({ input_tokens: n }) });
    }
    if (url.includes("/v1/messages")) {
      const n = fake.requests.length + 1;
      if (fail && fail(n)) { fake.requests.push({ req: JSON.parse(req.postData()), headers: req.headers(), failed: true }); return route.abort("failed"); }
      const o = fake.handle(req.postData(), req.headers());
      const ms = typeof hold === "function" ? hold(n) : hold;
      if (ms) await new Promise((r) => setTimeout(r, ms));
      try { await route.fulfill({ status: o.status, headers: { ...HEADERS, ...o.headers }, body: o.body }); } catch { /* the page stopped the request, or the test ended */ }
      return;
    }
    return route.abort("blockedbyclient");
  });
  return net;
}
