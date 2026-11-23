# Technical notes

Version 0.1.0 (M1 Foundations), 23 November 2026. These notes record what was checked at source, with the date, and the decisions the code rests on. PLAN.md is the plan Victor approved on 23 November 2026. Where the code says "brief §6.4", it means section 6.4 of Victor's build brief, which is not part of this repository.

## 1. Models and prices

Read on 23 November 2026 at https://platform.claude.com/docs/en/about-claude/pricing and https://platform.claude.com/docs/en/about-claude/models/overview. US dollars per million tokens; `js/config.js` holds the same values and `tests/docs.mjs` compares them with this table.

| Model | API id | Input | Output | Cache write (5 min) | Cache read |
|---|---|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | $0.125 | $0.01 |
| Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 | $2.50 | $0.10 |
| Opus 5.5 | `claude-opus-5-5` | $4 | $20 | $5 | $0.20 |

Haiku 5.5 prompts over 100,000 tokens cost $0.50 input, $2.50 output, $0.625 cache write and $0.05 cache read, so no request may come near that size. Web search costs $10 per 1,000 searches plus its tokens; token counting is free. The three models share a context of one million tokens, 128,000 output tokens and a reliable knowledge cutoff of June 2026 (models overview, read again on 23 November 2026). Euros at 1 USD = 0.894 EUR, the sister prototypes' fixed rate.

## 2. The API from the browser

Probed on 23 November 2026; PLAN.md, section 4, holds the full table with its sources.

- The `anthropic-dangerous-direct-browser-access: true` header makes the API's answers readable in the page; without it the browser blocks them. The preflight allows exactly the four headers the client sends.
- A keyless request answers 401 with a body the page can read, so the free key check (`GET /v1/models`) works from the page.
- Structured outputs go in `output_config.format` as `{ "type": "json_schema", "schema": … }`, with no beta header: every object closed, at most 24 optional and 16 union-typed parameters a request, `minItems` only 0 or 1, no `maxItems`, `minimum` or `maxLength`. Section 5 says how the schemas keep to it.
- Effort goes in `output_config.effort`. Haiku 5.5 takes `thinking: { "type": "disabled" }` up to high effort; Sonnet 5.5 refuses it; Opus 5.5 always thinks. Thinking counts towards `max_tokens`.
- Every request sends `anthropic-version: 2023-06-01`, as every sister prototype does.

Version 0.1.0 sends no request from the page. The only code that calls the API is the Ideator probe (section 8), which Victor runs by hand.

## 3. The policy and what the browser keeps

The policy is the brief's, in one meta element of `index.html` and as `CSP` in `js/config.js`; `tests/policy.mjs` holds the two equal, checks that nothing loads from another host and nothing is inline, and Vici's `policyProblems` agrees (`tests/vici.mjs`). Under the policy a same-origin JSON module is blocked by `connect-src`, so each schema in `schemas/` has a module twin beside it.

The theme comes from Vici's `vici/dist/vici-theme.js`, a plain script in the head that applies the remembered choice before the first paint; `data-vc-theme-default="light"` on `<html>` keeps the page light until the visitor chooses dark, because the room is usually lit.

The browser keeps `vc-theme` (Vici's theme) and `pi.lang` (the language) in local storage, Vici's `vc-guide:` notes in session storage, and nothing else. In this tool's code only `js/lang.js` and `js/i18n/index.js` touch storage. `js/keystore.js` holds the API key in one module variable and `js/session.js` holds everything else in memory. `tests/policy.mjs` checks this in the source and Vici's `storageProblems` agrees; `tests/page.mjs` and Vici's `storedKeyProblems` check in Chromium that local storage, session storage, IndexedDB, the Cache API and cookies hold nothing more after a visit.

## 4. The engine

`js/engine.js` holds pure functions: no DOM, no clock, no randomness. The rules are the brief's 6.4 and PLAN.md, section 9.

| Part | Rule |
|---|---|
| Weighted score | The sum of rating × weight over the sum of the weights. Weights are whole percentages, so scores compare exactly by cross-multiplying; shown to two decimals |
| Ties | Business value, relevance, buildable, agentic fit, demo impact, evidence and low risk, then the name as the language sorts it |
| Stability | Nine rankings: the weights in use, equal weights and seven with one criterion at zero; a set with every weight at zero is skipped |
| Live-run estimate | Model calls × (2,000 new input, 15,000 cache-read input and 600 output tokens) at the model's prices, plus $0.01 a search, at 0.894 euros a dollar |
| At stake a year | The expected euros of the kept issues that state them; a merged issue counts once, at its largest member's value (D15) |

`tests/engine.mjs` reproduces the golden cases PI1 to PI3 exactly, in both languages; `tests/handoff.mjs` reproduces PI4 with no request.

## 5. Contracts and output schemas

`js/schemas.js` holds the contracts of brief §10 and each agent's output schema. The contracts use every keyword `js/schema.js` knows; the output schemas stay within the API's limits: every property required, so no optional parameter; union types only in the Reader's schema (four, where a value may be missing); no `minimum`, `maximum`, `minLength`, `maxLength` or `maxItems`; `minItems` only 0 or 1. The cap on ideas stands in the array's description, "At most N ideas ({maxItems: N})", as Anthropic's SDK writes it, in the prompt, and in code (`js/guards.js`). `tests/schemas.mjs` counts the optional and union-typed parameters and fails on any keyword the API refuses.

`schemas/prototype-ideas-1.json` is this tool's own file, the JSON download of M4; `tools/sync-schemas.mjs` writes its module twin. The shared handoff schema and its twin come from the SWOT Challenger (section 6).

## 6. Shared parts and the sibling tools

The SWOT Challenger merged its M1 first, on 23 November 2026 at 21:35 (commit a52fd6f, merged as 617b122). By the brief's rule the first tool to merge a shared file is its source, so these come from it unchanged: `data/kpis.js` (115 KPIs in thirteen sectors) with its test, `tests/kpis.mjs`; `schemas/strategy-challenge-1.json` with its module twin and `tools/schema-module.mjs`, which writes the twin; and `js/risk.js`. The Ideator's money at stake takes the format of `js/risk.js`: millions with one decimal ("€2.8m", "2,8 Mio. €"), so PI4's range shows as €2.0m–€6.0m where the brief writes "€2m–€6m" (section 9).

No sibling had the live client or the key store yet, so this tool sets them for the others to copy: `js/anthropic.js`, `js/sse.js` and `js/cost.js` from the Sovereignty Assessment 2.0.0 (35c0dea), with the app's name read from `config.js` so the file can be byte-identical in all four tools, and `js/keystore.js`, held in memory only.

`tests/parity.mjs` compares every shared part with every sibling checkout that has it, and CI clones the three challengers for it. On 23 November 2026 the canvas challenger's unmerged `m1` branch carried its own versions of the KPI library, the handoff schema and `js/risk.js`; they differ from the SWOT Challenger's and will need to be replaced by them before that branch merges.

## 7. The fact audit

`js/facts.js` builds on the Sovereignty Assessment's: the model's prose carries figures only as `{{fact:key}}` placeholders with keys the engine returned in the run, and code fills them in the run's language. The audit passes years from 1900 to 2099, ISO and written dates, counts in words up to twelve, quotations that appear word for word in the run's evidence, a source's address, and names with digits as the documents write them ("EN ISO 14083"). It refuses every other number, percent signs and words, fractions in words and counts in words above twelve. A refused text goes back once with its tokens; refused twice, it shows with an "Unchecked" tag.

## 8. The prompts and the Ideator probe

`js/prompts.js` holds the shared rules and the Ideator's prompt: about 730 tokens at the estimate's four characters a token, for 1 to 10 ideas in either language (`tests/prompts.mjs` holds it under 760). The input goes as compact JSON: the kept issues, a merged issue at its largest member's value with its fact key, the sector's KPIs with those for any company, the default constraints and only the facts the Ideator may cite. The Reader, the Writer and the Brief writer follow in 0.3.0.

`js/guards.js` checks what the schema can't hold. A refusal sends the answer back once: more ideas than asked for or more than ten, an issue that doesn't exist or isn't kept, fewer than two or more than three key figures, a key figure marked public without its value or source, a rating outside 1 to 5 or without its reason, more than 25 words for what it does, a name of more than three words, a repeated name, fewer than three or more than five steps the room sees, more than three risks, an empty agent step and build effort or live-run inputs that make no sense. Prose that fails the fact audit goes back with its tokens. Notes are reported and never sent back: a dash as punctuation, a stock word, fewer ideas than asked for and the spread rule (every kept issue leads an idea before any leads two). Victor's runs decide in 0.3.0 which notes become refusals.

The probe, `js/probe.js`, tries the riskiest part before the screens are built on it: the quality of Haiku 5.5's ideas. It sends the Ideator's real request on each preset with the stand-in issues of Tidewell Lines (eight kept issues from the three challengers, after the emissions merge), with 16,000 output tokens so that it measures what the Ideator needs instead of cutting it off, then checks the answer with the schema validator, the guards and the fact audit, and ranks the ideas with the engine. Run it on the live site, once 0.1.0 is merged, from the browser console:

```js
(async()=>{const m=await import(new URL("js/probe.js",document.baseURI));const r=await m.run(prompt("Claude API key, kept in this tab only"),["fast","balanced","thorough"]);console.table(r.runs);console.table(r.ideas)})()
```

It asks for the key in a dialog, so the key is never typed into the console, and sends three requests: Fast and Balanced on Haiku 5.5, Thorough on Sonnet 5.5. At the prices of section 1 that is under €0.15 for all three, most of it Sonnet's. It prints two tables, the runs and the ideas; `copy(piProbe)` copies everything the model wrote, without the key. `tests/probe.mjs` runs it against a scripted stand-in, and `tests/page.mjs` runs this exact line in the page under its security policy. Not yet run with a key; its results go here, with the date, when Victor has run it.

## 9. Decisions and deviations

Defaults used, as the brief allows: D13 (the cut list C1 to C7 of PLAN.md, section 2) as approved with the plan; D15, a merged issue counts once at its largest member's expected euros. D14, S3's story line, waits for 0.2.0.

| Deviation | From | Why |
|---|---|---|
| The session-only data rule is not added to ViciDesign by this tool | PLAN.md, section 13 | The PESTEL Challenger added it first (ViciDesign PR 24, with `storageProblems` and `storedKeyProblems`), with the strict-policy starter and `dist/vici-theme.js` (PR 25). This tool uses them from `eaebdca` |
| The page's own theme script is gone | PLAN.md, section 7.1 | Vici's `vici/dist/vici-theme.js` does the same and is Vici's own |
| PI4's display strings | `tests/fixtures/pi4-handoff.json` as first written | The values stay the brief's; their display follows the shared money format of `js/risk.js` |
| The KPI library, the handoff schema and their tests | PLAN.md, section 6.3, where this tool would build them | The SWOT Challenger merged them first (section 6) |
| The guides' last button reads "Start" | Dispatch Lab's "Let's go" | ViciDesign's `check-guide-render.mjs` asks for it |
| The start step says what 0.1.0 holds, and Run it live shows a note | PLAN.md, section 10.1 | The scenarios arrive in 0.2.0 and the live run in 0.3.0; the step bar's controls stay disabled until then |
| The Data Quality Agent's vici-files suite is not taken | PLAN.md, section 7.3 | `tests/vici.mjs` compares `vici/` with ViciDesign byte for byte |
| GATES.md stays outside the repository | The /unlazy skill | The milestone's gates are a working file, and their checks name local paths |

## 10. Tests

`node tests/run-all.mjs` runs every suite; `tests/README.md` says what each proves and how to install Playwright. The private term list of the hygiene check is the `HYGIENE_TERMS` secret. It is not set yet, so CI runs the generic checks and says "HYGIENE GENERIC OK", and every commit is first checked locally against a list kept outside the repository.
