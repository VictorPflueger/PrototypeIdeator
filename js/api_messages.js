// What went wrong in a live run, in plain words (brief §5.8, AC-10): each of the API's answers and the
// pipeline's own stops becomes an i18n key with its placeholders and the one thing to do next. The API's
// own message stays in English and fills a placeholder only where no plain sentence fits. Adapted from
// the Sovereignty Assessment 2.0.0 (35c0dea), with the credit, model, browser and stop cases of this tool.
// The keys stand here in full, so tests/i18n.mjs finds every one of them in use.

const BUDGET = { reader: "live.budget.reader", merges: "live.budget.merges", ideator: "live.budget.ideator", writer: "live.budget.writer", brief: "live.budget.brief" };
const FAILED = { reader: "live.failed.reader", merges: "live.failed.merges", ideator: "live.failed.ideator", writer: "live.failed.writer", brief: "live.failed.brief" };
const DECLINED = { reader: "live.declined.reader", merges: "live.declined.merges", ideator: "live.declined.ideator", writer: "live.declined.writer", brief: "live.declined.brief" };
const CUT = { reader: "live.cut.reader", merges: "live.cut.merges", ideator: "live.cut.ideator", writer: "live.cut.writer", brief: "live.cut.brief" };

/** True when a 400, 402 or 429 says the account has no credit left. */
export function isCreditError(e) {
  const message = String(e?.message || e?.error?.message || "");
  const type = e?.type || e?.error?.type || "";
  return e?.status === 402 || type === "billing_error" || /credit balance|purchase credits/i.test(message);
}

/** True when a 400 or 429 says a spend limit the organisation or workspace set is reached. */
export function isSpendLimit(e) {
  const message = String(e?.message || e?.error?.message || "");
  const details = e?.details || e?.error?.details || null;
  return details?.error_code === "enforced_spend_limit_reached" || /spend limit|usage limits?/i.test(message);
}

/**
 * The message for a failed step or key check. e: an ApiError, a BudgetStop, a StepFailed, an AbortError,
 * or { status, error: { type, message } } from checkKey. ctx: { model } names the model in words.
 * Returns { key, vars, next, problems } where next is retry, settings or key: the stopped turn bar's one
 * primary action (Try again, Change settings, Enter the key again).
 */
export function messageOf(e, { model = "" } = {}) {
  if (!e) return { key: "api.unknown", vars: { status: "", message: "" }, next: "retry", problems: [] };
  if (e.name === "AbortError") return { key: "live.stopped", vars: null, next: "retry", problems: [] };
  // On the cautious count, since the free count didn't answer, Try again comes first: it may count (review C5).
  if (e.name === "BudgetStop") return { key: BUDGET[e.agent] || BUDGET.ideator, vars: { agent: e.agent, uncounted: e.uncounted === true }, next: e.uncounted ? "retry" : "settings", problems: [] };
  if (e.name === "StepFailed") {
    const map = e.reason === "refusal" ? DECLINED : e.reason === "cut" ? CUT : FAILED;
    // A failed check or a refusal may pass on a second try; an answer cut off twice needs other settings.
    return { key: map[e.agent] || map.ideator, vars: null, next: e.reason === "cut" ? "settings" : "retry", problems: [...(e.problems || [])] };
  }
  const status = Number(e.status ?? 0) || 0;
  const type = e.type || e.error?.type || "";
  const message = String(e.message || e.error?.message || "").trim();
  const out = (key, vars, next) => ({ key, vars, next, problems: [] });
  if (!status) {
    if (type === "timeout_error" || /timed out/i.test(message)) return out("api.timeout", null, "retry");
    return out("api.network", null, "retry");
  }
  // An organisation may forbid requests from a browser: a 401 that is no fault of the key (errors page,
  // read on 24 November 2026).
  if (status === 401 && /^CORS requests are not allowed/i.test(message)) return out("api.cors", null, "key");
  if (status === 401 || type === "authentication_error") return out("api.unauthorized", null, "key");
  if (isCreditError(e)) return out("api.credit", null, "retry");
  if ((status === 400 || status === 429) && isSpendLimit(e)) return out("api.spendLimit", null, "retry");
  if (status === 403 || type === "permission_error") return out("api.forbidden", { model }, "settings");
  if (status === 404 || type === "not_found_error") return out("api.notFound", { model }, "settings");
  if (status === 429) return out("api.rateLimited", null, "retry");
  if (status === 413 || type === "request_too_large") return out("api.tooLarge", null, "retry");
  if (status === 529 || type === "overloaded_error") return out("api.overloaded", null, "retry");
  if (status >= 500) return out("api.server", { status }, "retry");
  if (status === 400) return out("api.badRequest", { message: message || type }, "settings");
  return out("api.unknown", { status, message: message || type }, "retry");
}
