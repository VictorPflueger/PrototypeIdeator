// Central configuration. Every value here is documented and verified in TECH_NOTES.md; the words that go
// with these values live in js/i18n/en.js and js/i18n/de.js. Adapted from the Sovereignty Assessment
// 2.0.0 (35c0dea): its structure, with the Prototype Ideator's app id, presets, limits, budget and storage.

export const APP = {
  id: "pi",
  name: "Prototype Ideator",
  version: "1.0.0",
  url: "https://victorpflueger.github.io/PrototypeIdeator/"
};

// The page's content security policy, exactly as index.html's meta tag carries it (brief §5.1, TECH_NOTES
// §4); tests/policy.mjs compares the two. api.anthropic.com is the only outside host the page may reach.
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src https://api.anthropic.com; object-src 'none'; base-uri 'none'; form-action 'none'";

export const ANTHROPIC = {
  messagesUrl: "https://api.anthropic.com/v1/messages",
  modelsUrl: "https://api.anthropic.com/v1/models?limit=100",
  countTokensUrl: "https://api.anthropic.com/v1/messages/count_tokens",
  // The sister prototypes' version; 2026-10-21 is the newest, and the switch happens in all prototypes
  // together (brief §5.4, TECH_NOTES §2).
  apiVersion: "2023-06-01",
  // Without this header the browser blocks the call (CORS; probed on 23 November 2026, TECH_NOTES §2).
  browserHeader: "anthropic-dangerous-direct-browser-access",
  // The shared client keeps the sisters' web-search probe; version 1.0 of this tool runs no web research
  // (cut C4 of PLAN.md), so nothing here calls it. The fee is the one the cost meter adds per search.
  webSearchTool: { type: "web_search_20250305", name: "web_search", max_uses: 5 },
  webSearchUsdPer1000: 10,
  // Spend limits are set per workspace, so the key note advises a workspace with a monthly spend limit.
  consoleKeysUrl: "https://platform.claude.com/settings/keys",
  consoleWorkspacesUrl: "https://platform.claude.com/settings/workspaces"
};

// Prices in US dollars per million tokens, read on 23 November 2026 at
// https://platform.claude.com/docs/en/about-claude/pricing (TECH_NOTES §1). The order is the sisters', so
// the shared client and cost meter behave alike in every tool; the default model is DEFAULT_MODEL below.
// Model names are product names and stay as they are in both languages; the hints are i18n keys.
export const MODELS = [
  {
    id: "claude-sonnet-5-5", label: "Sonnet 5.5", hintKey: "model.hint.sonnet",
    effort: "medium", maxTokens: 8000,
    price: { input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.1 }
  },
  {
    id: "claude-haiku-5-5", label: "Haiku 5.5", hintKey: "model.hint.haiku",
    effort: "medium", maxTokens: 8000,
    price: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01,
      longPrompt: { thresholdTokens: 100000, input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 } }
  },
  {
    id: "claude-opus-5-5", label: "Opus 5.5", hintKey: "model.hint.opus",
    effort: "medium", maxTokens: 8000,
    price: { input: 4.0, output: 20.0, cacheWrite: 5.0, cacheRead: 0.2 }
  }
];
export const DEFAULT_MODEL = "claude-haiku-5-5";

// The three settings of the live-run dialog (brief §5.4). `thinking: null` leaves the field out, which
// means adaptive thinking; Sonnet 5.5 refuses { type: "disabled" }, so Thorough never sends it.
export const PRESETS = [
  { id: "fast", model: "claude-haiku-5-5", effort: "low", thinking: { type: "disabled" } },
  { id: "balanced", model: "claude-haiku-5-5", effort: "medium", thinking: null },
  { id: "thorough", model: "claude-sonnet-5-5", effort: "medium", thinking: null }
];
export const DEFAULT_PRESET = "balanced";
export const EFFORTS = ["low", "medium", "high"];

// Each agent's output budget to start with (brief §5.4: 8,000 a step until Victor's first live runs are
// measured; PLAN.md §8.1). The minimum is what the budget cap may cut a request down to.
export const AGENT_TOKENS = {
  reader: { max: 8000, min: 3000 },
  merges: { max: 2000, min: 1000 },
  ideator: { max: 8000, min: 4000 },
  writer: { max: 2000, min: 1000 },
  brief: { max: 6000, min: 3000 }
};

// What a person may give the tool and ask of it (brief §6.1 and §6.7).
export const LIMITS = {
  files: 5,
  totalBytes: 20 * 1024 * 1024,
  pdfPages: 100,
  ideasMin: 1,
  ideasMax: 10,
  ideasDefault: 5,
  quoteMaxChars: 150,
  whatItDoesMaxWords: 25,
  roomStepsMin: 3,
  roomStepsMax: 5,
  keyFiguresMin: 2,
  keyFiguresMax: 3,
  risksMax: 3,
  ratingMin: 1,
  ratingMax: 5
};

// The budget cap a person sets for one live run, in euros (brief §5.3 and D4).
export const BUDGET = { minEur: 0.05, maxEur: 3.0, defaultEur: 0.5, stepEur: 0.05 };

// The estimate's assumptions, stated in the guide (brief §5.6, PLAN.md §9.4): about 2.7 characters a token,
// a thinking allowance per step, and Anthropic's rule for the tokens of a PDF page. Anthropic's glossary
// (read 25 November 2026): a token is about 3.5 English characters on earlier models, and Claude 4.7 and
// later produce about 30 percent more tokens for the same text; 3.5 / 1.3 is about 2.7.
export const ESTIMATE = {
  charsPerToken: 2.7,
  thinkingTokens: { fast: 0, balanced: 1500, thorough: 1500 },
  pdfPage: { textLow: 1500, textHigh: 3000, image: 1568 },
  // A live run's estimate before it starts takes the answers' sizes from the three recorded scenarios;
  // the Reader is assumed to map four to twelve issues from documents. Time: a few seconds a request plus
  // the output at an assumed rate, until Victor's first live runs measure both (TECH_NOTES §8).
  readerIssues: [4, 12],
  // The Brief writer's answer: the idea's own part of a build brief, about 400 to 1,100 words of JSON.
  briefOutput: [600, 1500],
  requestSeconds: [3, 8],
  outputTokensPerSecond: { "claude-haiku-5-5": [60, 150], "claude-sonnet-5-5": [30, 80], "claude-opus-5-5": [20, 50] }
};

// The budget cap's input before every request (brief §5.5): the free token count of the system prompt and
// the messages, plus a margin, since Anthropic calls the count an estimate that may differ "by a small
// amount" (token counting page, read 25 November 2026), plus the output schema at the cautious ratio, since
// structured outputs add a system prompt about the format that the count may leave out. When the count
// fails, the whole request is taken at the cautious ratio: two characters a token for plain ASCII text,
// below the glossary's 2.7, every other character at its UTF-8 bytes, and each PDF at Anthropic's rule's
// high end; and within fallbackTierMargin of Haiku's step at 100,000 tokens, the request is priced at the
// long-prompt tier (review C5).
export const CAP_INPUT = { countMargin: 0.02, countMarginTokens: 64, asciiCharsPerToken: 2, messageTokens: 16, fallbackTierMargin: 1.5 };

// The models the live dialog's Advanced offers (cut C5 of PLAN.md: Opus 5.5 is not needed here).
export const LIVE_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"];

// Victor's rule for the cost of one live run of a proposed prototype (brief §6.4, golden case PI3).
export const IDEA_RUN = { inputTokens: 2000, cacheReadTokens: 15000, outputTokens: 600, usdPerSearch: 0.01 };

// The sister prototypes' fixed rate: a stable cost meter (brief §5.5).
export const FX_USD_EUR = 0.894;

// Every browser storage key this tool writes, under its own prefix: GitHub Pages serves all of an
// account's project sites from one origin, so no sister may share a key with it. The brief allows three
// entries and no more (§5.9): Vici's theme choice, this tool's language choice and Vici's note, in the
// tab's session storage, that the guide has opened. Nothing a person enters, uploads or produces, and
// never the key, is stored.
const P = `${APP.id}.`;
export const STORAGE = {
  lang: `${P}lang`                      // localStorage: the language choice
};
export const THEME_KEY = "vc-theme";    // Vici's own key, shared by all of Victor's pages
export const GUIDE_NOTE_PREFIX = "vc-guide:"; // Vici's own sessionStorage note, set by vici.js and js/lang.js

// The three challengers whose reports this tool reads (brief §4.1).
export const CHALLENGERS = [
  { id: "bmc-challenger", type: "bmc", url: "https://victorpflueger.github.io/BMC-challenger/" },
  { id: "swot-challenger", type: "swot", url: "https://victorpflueger.github.io/SWOT-challenger/" },
  { id: "pestel-challenger", type: "pestel", url: "https://victorpflueger.github.io/PESTEL-challenger/" }
];
