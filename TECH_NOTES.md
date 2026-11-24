# Technical notes

Version 0.3.0 (M3 Live), 24 November 2026; first written for 0.1.0 (M1 Foundations) on 23 November 2026 and extended for 0.2.0 (M2 Simulation) on 24 November 2026. These notes record what was checked at source, with the date, and the decisions the code rests on. PLAN.md is the plan Victor approved on 23 November 2026. Where the code says "brief §6.4", it means section 6.4 of Victor's build brief, which is not part of this repository.

## 1. Models and prices

Read on 23 November 2026 at https://platform.claude.com/docs/en/about-claude/pricing and https://platform.claude.com/docs/en/about-claude/models/overview, and read again on 24 November 2026, before the live run relied on them: unchanged. US dollars per million tokens; `js/config.js` holds the same values and `tests/docs.mjs` compares them with this table.

| Model | API id | Input | Output | Cache write (5 min) | Cache read |
|---|---|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 | $0.125 | $0.01 |
| Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $10 | $2.50 | $0.10 |
| Opus 5.5 | `claude-opus-5-5` | $4 | $20 | $5 | $0.20 |

Haiku 5.5 prompts over 100,000 tokens cost $0.50 input, $2.50 output, $0.625 cache write and $0.05 cache read, so no request may come near that size; the page prices each request on its own, as the pricing page says, so only a request above the step pays it. Web search costs $10 per 1,000 searches plus its tokens; token counting is free (token-counting page, read on 24 November 2026: free, with its own limit of 5,000 requests a minute at the lowest tier). The three models share a context of one million tokens, 128,000 output tokens and a reliable knowledge cutoff of June 2026 (models overview, read again on 24 November 2026), which a live run's Report step states, since this version runs no web research (cut C4). Euros at 1 USD = 0.894 EUR, the sister prototypes' fixed rate.

A paid Claude plan doesn't pay for the API: it is billed on its own, and Max, Ultra and Team plans include monthly API credits (support.claude.com, article 9876003, read again on 24 November 2026). The live-run dialog says so under the key.

## 2. The API from the browser

Probed on 23 November 2026; PLAN.md, section 4, holds the full table with its sources.

- The `anthropic-dangerous-direct-browser-access: true` header makes the API's answers readable in the page; without it the browser blocks them. The preflight allows exactly the four headers the client sends.
- A keyless request answers 401 with a body the page can read, so the free key check (`GET /v1/models`) works from the page.
- Structured outputs go in `output_config.format` as `{ "type": "json_schema", "schema": … }`, with no beta header: every object closed, at most 24 optional and 16 union-typed parameters a request, `minItems` only 0 or 1, no `maxItems`, `minimum` or `maxLength`. Section 5 says how the schemas keep to it.
- Effort goes in `output_config.effort`. Haiku 5.5 takes `thinking: { "type": "disabled" }` up to high effort; Sonnet 5.5 refuses it; Opus 5.5 always thinks. Thinking counts towards `max_tokens`.
- Every request sends `anthropic-version: 2023-06-01`, as every sister prototype does.

Read again on 24 November 2026, for the live run of 0.3.0 (the errors and token-counting pages):

- A 401 whose message begins "CORS requests are not allowed for this Organization" is no fault of the key: the organisation refuses requests from a browser. The page names it apart from a rejected key (`api.cors`) and asks for a key from another organisation.
- A 400 `invalid_request_error` is also what a spend limit the organisation or workspace set returns; a 429 at a tier's spend cap or a workspace's limit has no `retry-after` and keeps failing. Neither is retried; the page says to raise the limit in the Console. A credit balance that is too low comes as a 400 with that message, or a 402 `billing_error`.
- 500, 502, 503, 504, 529 and network failures are retried twice, after 1.5 and 4 seconds, and a 429 after its `retry-after` (at most 20 seconds), as the brief's 5.8 says; the SDKs do the same.
- `POST /v1/messages/count_tokens` takes base64 PDFs as the Messages API reads them. The page sends it the system prompt and the messages without the output schema, whose tokens it adds itself at four characters a token.

Since 0.3.0 the page calls the API in a live run: `GET /v1/models` to check the key (free), `POST /v1/messages/count_tokens` before a request that carries a PDF (free), and one `POST /v1/messages` a step. A challenger's report from one challenger is still read with no request. The Ideator probe (section 8) stays as Victor's console line.

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

The simulation (`js/simulation.js`) builds every screen from the scenario's recorded answers and the person's choices through these functions: an issue parked or merged, a weight and a shortlist change the run, never a stored figure. Each scenario freezes its figures in `reference` (at stake, kept and covered issues, the ranking, the top score, how often each idea comes first, the shortlist's share and the cost of one run on each setting, to the cent); `tools/check-scenarios.mjs` and `tests/simulation.mjs` hold the run to them, the latter with at stake worked out apart from the engine.

The cost of a replay is the estimate of what the same run would cost live (`js/estimate.js`): the Reader, the merge proposals, the Ideator and the Writer on the setting's model, with about four characters a token, 1,500 thinking tokens a step on Balanced and Thorough, and 1,500 to 3,000 text tokens plus 1,568 image tokens a PDF page. The tile shows the Balanced setting; the guide names Thorough's figure.

## 5. Contracts and output schemas

`js/schemas.js` holds the contracts of brief §10 and each agent's output schema. The contracts use every keyword `js/schema.js` knows; the output schemas stay within the API's limits: every property required, so no optional parameter; union types only in the Reader's schema (four, where a value may be missing); no `minimum`, `maximum`, `minLength`, `maxLength` or `maxItems`; `minItems` only 0 or 1. The cap on ideas stands in the array's description, "At most N ideas ({maxItems: N})", as Anthropic's SDK writes it, in the prompt, and in code (`js/guards.js`). `tests/schemas.mjs` counts the optional and union-typed parameters and fails on any keyword the API refuses.

`schemas/prototype-ideas-1.json` is this tool's own file, the JSON download of M4; `tools/sync-schemas.mjs` writes its module twin. The shared handoff schema and its twin come from the SWOT Challenger (section 6).

## 6. Shared parts and the sibling tools

The SWOT Challenger merged its M1 first, on 23 November 2026 at 21:35 (commit a52fd6f, merged as 617b122). By the brief's rule the first tool to merge a shared file is its source, so these come from it unchanged: `data/kpis.js` (115 KPIs in thirteen sectors) with its test, `tests/kpis.mjs`; `schemas/strategy-challenge-1.json` with its module twin and `tools/schema-module.mjs`, which writes the twin; and `js/risk.js`. The Ideator's money at stake takes the format of `js/risk.js`: millions with one decimal ("€2.8m", "2,8 Mio. €"), so PI4's range shows as €2.0m–€6.0m where the brief writes "€2m–€6m" (section 9).

No sibling had the live client or the key store yet, so this tool sets them for the others to copy: `js/anthropic.js` and `js/sse.js` from the Sovereignty Assessment 2.0.0 (35c0dea), with the app's name read from `config.js` so the file can be byte-identical in all four tools, and `js/keystore.js`, held in memory only. `js/cost.js` is the SWOT Challenger's since 0.3.0 (main at b0aab33, fetched on 24 November 2026): the same pricing, but a model with no price is refused rather than priced as Haiku, and the running tracker is gone, since each tool's meter keeps its own totals (here `createMeter` in `js/pipeline.js`).

The drop zone is this tool's pattern in Vici (ViciDesign PR 32, merged on 24 November 2026 as 2759b7a, "From Prototype Ideator 0.2.0"): a real file input behind a label, the public-information notice, one cancelable `vc:files` event, and file rows with a refused or warning state in words, with its docs on the Forms page and `dropzoneProblems` as its check.

The live-run dialog is the SWOT Challenger's pattern in Vici (ViciDesign PR 36, merged on 24 November 2026 as bf11426): the key, the setting, Advanced, the budget cap, the acknowledgement, the warning, the estimate and the start button with the AI notice, in that order, checked by `liveDialogProblems`. This tool is the first to build it into a page, in `js/live_dialog.js` and `index.html`, with `tests/live.mjs` running Vici's check on the rendered dialog; the challengers can take the file with their own settings. Four fixes this tool found went into Vici on 24 November 2026: a callout now gives its content every text and surface token in its own ink (PR 35, ead182e), tables set tabular figures in number cells only (PR 37, a855df3), a callout's actions keep to its ink too, so a secondary button such as the busy bar's Stop stays readable in the dark theme (PR 38, 8940e41), and the live-run dialog fits 1280 × 720, so the box and the estimate show without scrolling until a warning appears (PR 39, ca9c552, with `scripts/check-live-fit.mjs`). `vici/` holds main at ca9c552.

`tests/parity.mjs` compares every shared part with every sibling checkout that has it, and CI clones the three challengers for it. The Business Model Canvas Challenger merged its M1 later the same day (849e6ee) with the same bytes, so on 23 November 2026 three of the four tools hold one KPI library, one handoff schema and one `js/risk.js`; the PESTEL Challenger had not merged its M1 yet.

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

**The live run (0.3.0).** `js/prompts.js` holds the four prompts a live run sends: the Reader's (the documents, the company's fields and the challengers' issue titles in, an issue map out), the Reader's merges-only request for several challengers' reports, the Ideator's and the Writer's. Each step is one structured request (`js/pipeline.js`, `js/live_agents.js`): the step's prompt, the run's state as JSON and its output schema, with the setting's model, effort and thinking. The answer is validated, checked by the step's guards (`readerProblems`, `mergesProblems`, `ideaProblems`, `writerProblems`) and the fact audit, and sent back once with its problems listed. A second failure stops the step and keeps what is done; a text the fact audit refuses twice comes through marked Unchecked. Before every request the budget check works out its worst case: the input at four characters a token, a PDF's tokens counted by the free endpoint (Anthropic's rule's high end if the count fails), plus max_tokens at the output price. When the spend so far and the worst case pass the cap, max_tokens drops to the step's minimum; when that still doesn't fit, nothing is sent and the bar says before which step the run stopped. The meter prices each answer's usage at the model that gave it, so a run that goes on after Change settings on another model keeps its spend.

| Step | max_tokens | Minimum under the cap |
|---|---|---|
| Reader | 8,000 | 3,000 |
| Reader, merges only | 2,000 | 1,000 |
| Ideator | 8,000 | 4,000 |
| Writer | 2,000 | 1,000 |
| Brief writer (0.4.0) | 6,000 | 3,000 |

These start values are the brief's 8,000 a step and PLAN.md's smaller ones for the short answers. They are still to be measured: Victor's first live run on each preset sets each step's value, and its date and the measured use go here. Save run as simulation writes each step's requests, tokens and largest answer into the file (`run.usage`), so the measurement is the saved file itself; each max_tokens becomes about one and a half times the largest answer seen across the three presets, rounded up to the next 500 and never below the minimum. Not yet measured on 24 November 2026.

The estimate before a live run (`estimateLive` in `js/estimate.js`) builds the reading request from the real files (a PDF by Anthropic's rule per page, a text file by its size), takes the Ideator's and the Writer's sizes from the three recorded scenarios for the number of ideas asked for, assumes the Reader maps four to twelve issues, and adds 1,500 thinking tokens a step on Balanced and Thorough. Time: three to eight seconds a request plus the output at an assumed 60 to 150 tokens a second on Haiku 5.5 and 30 to 80 on Sonnet 5.5. These are assumptions until Victor's runs measure them; after a run the dialog also shows the tab's last measured cost and time.

## 9. Decisions and deviations

Defaults used, as the brief allows: D13 (the cut list C1 to C7 of PLAN.md, section 2) as approved with the plan; D15, a merged issue counts once at its largest member's expected euros; D14, S3's story line, follows the municipal heat plan due by the end of 2026, which runs through most of Auental Energie's issues.

| Deviation | From | Why |
|---|---|---|
| The session-only data rule is not added to ViciDesign by this tool | PLAN.md, section 13 | The PESTEL Challenger added it first (ViciDesign PR 24, with `storageProblems` and `storedKeyProblems`), with the strict-policy starter and `dist/vici-theme.js` (PR 25). This tool uses them from main at `6580c06` |
| The page's own theme script is gone | PLAN.md, section 7.1 | Vici's `vici/dist/vici-theme.js` does the same and is Vici's own |
| PI4's display strings | `tests/fixtures/pi4-handoff.json` as first written | The values stay the brief's; their display follows the shared money format of `js/risk.js` |
| The KPI library, the handoff schema and their tests | PLAN.md, section 6.3, where this tool would build them | The SWOT Challenger merged them first (section 6) |
| The guides' last button reads "Start" | Dispatch Lab's "Let's go" | ViciDesign's `check-guide-render.mjs` asks for it |
| The start step says what 0.1.0 holds, and Run it live shows a note | PLAN.md, section 10.1 | The scenarios arrive in 0.2.0 and the live run in 0.3.0; the step bar's controls stay disabled until then |
| The Data Quality Agent's vici-files suite is not taken | PLAN.md, section 7.3 | `tests/vici.mjs` compares `vici/` with ViciDesign byte for byte |
| GATES.md stays outside the repository | The /unlazy skill | The milestone's gates are a working file, and their checks name local paths |
| The stability check is the third view of the Score step's evidence, beside the chart and the table, rather than a dialog | PLAN.md, section 10.3 | Still one click away, Vici's segmented control switches the view, and the weights get the room they need at 1280 × 720 |
| The live Start step shows the run's settings on the right, not the four figures | PLAN.md, section 10.3 | The drop zone and its files take the left; the guide's How it works chapter explains the figures, and each tile says what it waits for |
| The at-stake tile shows the amount alone; its note says on how many kept issues | PLAN.md, section 10.4 ("€6.1m on 7 of 9 issues" as the value) | The whole line does not fit a tile at 1280 px; the report and the guide keep it in one line |
| Every step past Start names the company and "Fictional company, illustrative figures" above its title | PLAN.md, section 10.1 (the words in the intro strip only) | A room that joins late still knows which company it sees, and that it is invented |
| German uses Behalten, Bündeln and Parken for keep, merge and park | The first German strings | "Zusammenführen" and "Zurückstellen" did not fit the decision buttons or a step title at 1280 px |
| The guide has six chapters: "What the scores mean" stands apart from "How ideas are scored" | PLAN.md, section 10.5 (five chapters) | Vici's guide rule allows one table or list a chapter |
| Tabular figures only in number cells | Vici's tables before 24 November 2026, which set them on every cell | Inter's tabular figures also widen the hyphen, so "person-days" read "person - days". Fixed in Vici (PR 37, from this tool); the app's own override is gone since 0.3.0 |
| In the dark theme the chart tells the shortlist from the other ideas by fill as well as colour | The dataviz palette's checks | Light uses merlot-700 and lilac-600, which pass every check. Dark uses merlot-600 and lilac-500: they pass contrast and colour-blind separation on the dark surface but, like all of Vici's dark steps, fall below the validator's chroma floor, so filled and outlined hexagons, the place numbers and the labels carry the difference |
| Inside the Your turn bar the app uses only the tokens Vici's callout sets for itself | Vici's callout before 24 November 2026, which kept its pastel in the dark theme but left `--vc-bg-subtle` and `--vc-on-accent-soft` to the page | Play's note, the reason under a disabled action and the Next bar's hexagon vanished in the dark theme; they take `--vc-text-muted` and `--vc-bg-sunken`, and the layout check measures rendered contrast. Vici's callout now sets every token in its own ink (PR 35, from this tool), so the app's choice and Vici's agree |
| The live-run dialog opens when a model is first needed | The brief's 5.3, where Start the agents opens it | One challenger's report reads with no request at all (AC-18), so its button reads "Read the files" and the dialog opens at Find prototype ideas; reading that calls a model opens it from Start the agents, as the brief says |
| The free token count lives in `js/count.js`, beside the shared client | The brief's 4.1, which shares the live client | `js/anthropic.js` stays the same file in the four tools; `tests/policy.mjs` allows fetch in these two modules only |
| Advanced holds the model (Haiku 5.5 or Sonnet 5.5) and the effort; the dialog has no language field | The brief's 5.3 | Cuts C5 and C7, approved with the plan: the analysis follows the interface's language when the run starts |
| Save run as simulation is the live Report step's one action in 0.3.0 | PLAN.md, section 2, fix 4 (a quiet link under the downloads) | The downloads come in 0.4.0, which moves it under them |
| Each mode keeps its own run | 0.2.0, where Back to the simulation started the scenario over | A live run costs money: switching to the simulation and back keeps both runs, and Start a new run sets a live run aside with Undo |
| A step that failed twice lists what the checks found in English | The brief's 5.11 | The guards write their findings for the model, in English; the German page says "(auf Englisch)" beside the list |
| The saved run has its own contract, `SavedRun` | The Scenario contract | A saved run is one language, marked "live", with the setting and cost it ran on; Victor curates it into a scenario, adds the second language and marks it "recorded" |
| S3's annual-report excerpt comes as two PDFs, one a language | PLAN.md, section 5 | A German audience reads the German excerpt; both are built from `tools/s3-annual-report.html` and every quote is checked on its page in each |

## 10. Tests

`node tests/run-all.mjs` runs every suite; `tests/README.md` says what each proves and how to install Playwright. The private term list of the hygiene check is the `HYGIENE_TERMS` secret. It is not set yet, so CI runs the generic checks and says "HYGIENE GENERIC OK", and every commit is first checked locally against a list kept outside the repository.
