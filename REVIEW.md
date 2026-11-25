# Review

Part 1 lists every file taken from a sister prototype or a sibling tool. Part 2 is the independent review
of the release by fresh agents that did not build the tool, and part 3 the design review and Vici's
partner review on the running tool.

## Part 1. Files taken from other tools

Every file this repository took from a sister prototype or a sibling tool, as of version 0.1.0 and with the files added since, with what changed and why. "Copied" means byte for byte. The sources, as read on 23 November 2026: the Sovereignty Assessment 2.0.0 (35c0dea), the Data Quality Agent 2.2.0 (831f050), the Timetable Translator (through the Sovereignty Assessment), the SWOT Challenger 0.1.0 (a52fd6f, merged as 617b122) and Vici (6580c06); for 1.0.0, the PESTEL Challenger 1.0.0.

### Shared with the sibling tools

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `data/kpis.js` | SWOT Challenger | Copied | The KPI library of the set of four; the first tool to merge it is its source |
| `schemas/strategy-challenge-1.json` | SWOT Challenger | Copied | The handoff file's schema, the same file in all four tools |
| `schemas/strategy-challenge-1.js` | SWOT Challenger | Copied | Its module twin, since the policy blocks JSON modules |
| `js/risk.js` | SWOT Challenger | Copied | The Ideator imports its money format, so the four tools write money alike |
| `tools/schema-module.mjs` | SWOT Challenger | Copied | Writes the twin above, so every tool writes the same bytes |
| `tests/kpis.mjs` | SWOT Challenger | Copied | Checks the shared library the same way in every tool |

### Live client, key and session

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `js/anthropic.js` | Sovereignty Assessment | Adapted | Two lines: it imports `APP` and its stream-hook log names the app from `config.js`, so the file can be the same in all four tools |
| `js/sse.js` | Sovereignty Assessment | Copied | The SSE reader |
| `js/cost.js` | Sovereignty Assessment | Copied | Usage times price, Haiku's tier above 100,000 tokens, $0.01 a search, 0.894 euros a dollar |
| `js/schema.js` | Sovereignty Assessment | Copied | The JSON Schema validator the brief names |
| `js/keystore.js` | Sovereignty Assessment (the same file in the Data Quality Agent) | Adapted | One module variable instead of session storage: the brief keeps the key in memory only. `looksLikeKey`, `maskKey` and `redactSecrets` stay |
| `js/session.js` | none | New | The tab's session record, held in memory: the run's events and whether a result is unsaved, for the leave-page warning. Clear everything, on the live Start step, empties it with the presenter's run and the key |
| `js/live_dialog.js` | Data Quality Agent | Adapted | Its key check with the free model list and its refusal inside a frame; Vici's live-run dialog with this tool's presets, Advanced, budget cap, warning and estimate; the key in memory only |
| `js/api_messages.js` | Sovereignty Assessment | Adapted | Each API answer and each stop of a step as a plain message with the one thing to do next, with this tool's credit, model, browser and budget cases |
| `js/watch.js` | none | New | A problem on screen until closed, once per message; a hidden modal dialog closed by the next press; a press caught by a layer the page didn't draw, named |
| `js/pipeline.js`, `js/live_agents.js`, `js/live_run.js`, `js/count.js`, `js/privacy.js` | none | New | One structured request a step under the budget cap with one repair; the four agents' requests and checks; a live run in the scenarios' format and Save run as simulation; the free token count; what looks private |

### Page, languages and settings

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `index.html` | Vici's blank starter, laid out as the Data Quality Agent's | Adapted | This tool's header, key figures, intro and byline, step bar, start step and two guides; no inline script or style |
| `css/app.css` | Data Quality Agent and Sovereignty Assessment | Adapted | Their frame and step bar; this page's start step, turn bar and breakpoints for 1280 × 720 and 1920 × 1080 |
| `js/lang.js` | Sovereignty Assessment | Adapted | The storage key is `pi.lang` |
| `js/i18n/index.js` | Sovereignty Assessment | Adapted | It imports `APP`, its listener log names the app, and a comment names the storage key through `config.js` |
| `js/i18n/en.js`, `js/i18n/de.js` | Sovereignty Assessment | Replaced | This tool's own texts, with the same structure and checks |
| `js/dom.js` | Data Quality Agent | Copied | Helpers that write text, never markup |
| `js/config.js` | Sovereignty Assessment | Adapted | Its structure with this tool's id, presets, limits, budget, storage key and policy |
| `js/main.js` | Sovereignty Assessment | Adapted | Boot with the language and the leave-page warning |
| `js/presenter.js` | Data Quality Agent's `app.js`, with the Sovereignty Assessment's language switch | Adapted | The six steps, Play, the key figures and the language switch; from 0.3.0 the live run through the same views, with its busy and stopped bars |
| `js/format.js` | Sovereignty Assessment | Adapted | Scores with two decimals; money at stake through `js/risk.js` |
| `js/facts.js` | Sovereignty Assessment | Adapted | Placeholders and the audit stay; years, dates, counts in words up to twelve and names with digits as the documents write them pass; block ids, lever ids and legal references go |
| `favicon.svg` | none | New | Vici's sparkle in a lilac hexagon, as on the portfolio card |
| `js/report_doc.js`, `js/exports.js` | none, on Vici's report pattern (ViciDesign `64044bd`) | New | The report built from a run as Vici's report pattern sets it out, printed in the SWOT and PESTEL Challengers' format (9.5 pt, heads in sentence case, the model and setting on the cover); the file names, Save as PDF and Ctrl+P under the report's file name, the HTML file through `Vici.report.html` and the ideas file `prototype-ideas/1`, checked against its schema |
| `js/brief.js` | none | New | The build brief's template in English and German, the idea's part composed from its page, the two blocks, and the checks on the Brief writer's answer |

### Tests and tools

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `tests/lib/harness.mjs` | Sovereignty Assessment | Adapted | This tool's storage keys, output folder and browser settings |
| `tests/lib/prototype.mjs` | Sovereignty Assessment | Adapted | This page's name, colour pairs, hexagon tour and page icon |
| `tests/lib/fake-claude.mjs` | Sovereignty Assessment | Adapted | Single structured requests instead of a tool loop: it streams each answer, plays errors with retry-after, and checks every request's model, effort, thinking, format and headers |
| `tests/report.mjs` | none, after the PESTEL Challenger's report suite | New | The report, its PDF, its tables on screen and paper, the challengers' print format, its HTML and ideas files, a stopped run's notice, the downloads and the build brief, with Vici's report rule and PDF reader |
| `tests/access.mjs` | PESTEL Challenger 1.0.0 | Adapted | Its Tab rounds, its pixel test of the focus and its motion sampler, for this tool's six steps, its drawers and a live run against the stand-in that starts at the drop zone's file chooser (AC-14) |
| `tests/lib/live-route.mjs`, `tests/live.mjs`, `tests/pipeline.mjs`, `tests/privacy.mjs` | none | New | The stand-in on a browser context; the live run in Chromium; the pipeline in Node; the private-data scan |
| `tests/hygiene.mjs` | Sovereignty Assessment (from the Timetable Translator) | Copied | The private term list comes from `HYGIENE_TERMS` |
| `tests/hexagon.mjs`, `tests/page-icon.mjs` | Sovereignty Assessment | Copied | The page's values sit in `tests/lib/prototype.mjs` |
| `tests/tokens.mjs` | Data Quality Agent | Copied | The page's colour pairs sit in `tests/lib/prototype.mjs` |
| `tests/policy.mjs` | Data Quality Agent | Adapted | This tool's host, allowed storage modules and keys, and Vici's theme script |
| `tests/vici.mjs`, `tests/run-all.mjs`, `tests/live_site.mjs` | Sovereignty Assessment | Adapted | This page, its ids, its documents and its suites; `tests/vici.mjs` also compares `vici/` with ViciDesign byte for byte |
| `.github/workflows/tests.yml`, `live-site.yml` | Sovereignty Assessment, with the Data Quality Agent's step for Victor's website | Adapted | Also clones the three challengers for the parity suite |
| `tools/update-vici.mjs` | none | New | Copies the files this page uses from a ViciDesign checkout, `dist/vici-theme.js` included, and names the commit in `vici/README.md` and the workflow |

### Not taken

The sisters' agent loops, tools, simulations and domain modules are not taken (PLAN.md, section 7.2): the Ideator sends single structured requests. The page's own theme script went once Vici published `vici/dist/vici-theme.js`, and the Data Quality Agent's vici-files suite is folded into `tests/vici.mjs`.

## Part 2. Independent review

The release candidate `66b8743` was reviewed on 25 November 2026 against the brief and the project instructions, each look by a fresh agent that did not build the tool, in its own clone. In look 1 a fresh agent read the code and probed it with its own scripts; in look 2 another fresh agent used the running tool as a stranger and as a presenter, printed the reports and read every page. Both ended "not ready": look 1 with 2 high and 4 medium findings, look 2 with 1 high and 3 medium. Every high and medium finding is fixed, each with a check that fails on the old code; the lows are fixed or recorded with a reason in TECH_NOTES.md, section 9. In look 3 a third fresh agent checked the fixes (below).

### Look 1: the code

| ID | Severity | What | Where | State |
|---|---|---|---|---|
| A1 | high | The budget cap took every text at four characters a token, a third too few on the 5.5 models, so a large file could take a run past its cap | `js/pipeline.js`, `js/config.js` | Fixed: every request's input is counted with the free endpoint, with a margin; a cautious ratio when the count fails; the estimate assumes 2.7 characters a token. `tests/pipeline.mjs` (a stand-in tokenizer; a 650,000-character report and German and Chinese text, with the count and without; controls on the old rule) |
| A2 | high | A PDF whose page objects sit in compressed object streams read as no pages: no page limit, priced at nothing | `js/documents.js`, `js/live_agents.js` | Fixed: the intake inflates object streams; a PDF whose pages can't be counted is refused; the cap takes PDFs at the rule's high end when the count fails. `tests/intake.mjs` (object-stream PDFs made by `tests/lib/objstm-pdf.mjs`), `tests/live.mjs cap` |
| A3 | medium | A second live run showed the first run's figure struck through | `js/presenter.js` | Fixed: the live preview is keyed by the run's id and the caches clear on a new run. `tests/live.mjs decide` fails on the old key |
| A4 | medium | The private-data warning never ran when the run started from one challenger's report, or for fields edited later | `js/presenter.js` | Fixed: the first request of a run, whatever its step, and any request after the files or fields changed, opens the dialog with the warning. `tests/live.mjs privacy` |
| A5 | medium | No Clear everything control | `js/views/intake.js`, `js/presenter.js` | Fixed: on the live Start step, asked once in place (saying when a result isn't downloaded); it empties the run, the run set aside, the caches, the session record and the key. `tests/live.mjs storage` |
| A6 | medium | At stake mixed the Reader's AI estimates with stated amounts without saying so | `js/engine.js`, `js/kpis.js`, `js/facts.js` | Fixed: the tile, the fact in the report's text and the issue map's total say "partly AI estimates" in lilac; the guide says so |
| A7 | low | Every document source was tagged PDF | `js/views/read.js` | Fixed: tagged by the file's kind |
| A8 | low | The Ideator's person-days and the Reader's amounts and KPIs showed without the AI mark | `js/views/score.js`, `js/report_doc.js` | Fixed: the chart's axis, a lilac note under the table and in the report |
| A9 | low | Each idea's live-run cost is priced at Haiku 5.5's prices | `js/engine.js` | Recorded in TECH_NOTES.md, section 9 |
| A10 | low | The ideas file dropped the Unchecked marks | `js/exports.js` | Fixed within `prototype-ideas/1`: its disclaimer names the unchecked texts. `tests/live.mjs guards` |
| A11 | low | Counted PDF tokens were never shown with their price | `js/presenter.js` | Fixed: the busy bar shows each request's counted input and its worst case |
| A12 | low | Save as PDF cleared the leave-page warning even when cancelled; a paid reading set none | `js/exports.js`, `js/presenter.js` | Fixed |
| A13 | low | The saved-run test claimed no document text, though the Reader's quotes are in it | `tests/live.mjs`, `js/live_run.js` | Fixed: the claim says quotes of up to 150 characters, and the test checks their length |
| A14 | observation | No record of Victor's live run on each preset | TECH_NOTES.md, section 8 | Open: Victor's runs (AC-15) |
| A15 | observation | A retry after a broken stream wasn't checked against the cap | `js/pipeline.js` | Fixed: the cap holds the broken attempt's worst case and stops when a second doesn't fit. `tests/pipeline.mjs` |
| A16 | observation | A key checked after its dialog closed was still kept | `js/live_dialog.js` | Fixed |
| A17 | observation | Dates were UTC | `js/presenter.js`, `js/exports.js` | Fixed: the local date |
| A18 | observation | Any substring passed the quote check | `js/issues.js` | Fixed: under 20 characters is "not checked by code". `tests/unit.mjs` |
| A19 | observation | A cap check restated its own rule | `tests/pipeline.mjs` | Fixed: a concrete stop that fits an empty meter |

### Look 2: the running tool

| ID | Severity | What | Where | State |
|---|---|---|---|---|
| B1 | high | Start turned Play on, and Play moved on while the person worked the weights; the keyboard test failed 2 of 3 runs | `js/presenter.js` | Fixed: Play stops wherever the person acts in the story or its evidence, but for the step's own action. `tests/presenter.mjs play`; DEMO_SCRIPT says Start starts Play |
| B2 | medium | S3's heat-plan issue showed "not stated" while its merged member's €1.4m counted | `js/views/read.js`, `js/report_doc.js` | Fixed: a kept issue shows its group's value. `tests/presenter.mjs figures` checks every kept row in S1 to S3 against its fact |
| B3 | medium | One live run read €0.00 beside €0.09 for twenty | `js/format.js` | Fixed: a tenth of a cent below €0.10 ("€0.004"), and twenty runs multiply the figure shown. `tests/unit.mjs` |
| B4 | medium | Vici's slider script wrote the bare value into the weights' read-outs | `js/views/score.js`, `js/report_doc.js` | Fixed: the read-outs keep % and shares; the report shows the shares when the weights don't add up to 100 %. `tests/presenter.mjs weights` |
| B5 | low | The dialog's acknowledgement ran into the part below at 1280 × 720 | `css/app.css` | Fixed: the app's min-height let the grid shrink it. `tests/live.mjs privacy`, with the old rule as its control |
| B6 | low | The merge target's title was cut mid-word | `js/views/read.js` | Fixed: cut at a word, the whole title as the tooltip |
| B7 | low | Long words broke without a hyphen in the comb | `js/charts.js`, `css/app.css` | Fixed: the cell's name steps down for a long word |
| B8 | low | S1's issue map added up to €10.9m beside €10.8m | `js/report_doc.js` | Fixed: a total row, worked out from the unrounded amounts |
| B9 | low | The report didn't say its challenger reports are stand-ins | `js/report_doc.js` | Fixed: its sources say so |
| B10 | low | Titles can't be edited, as the brief's 6.2 allows | TECH_NOTES.md | Recorded in section 9 as a cut for 1.0.0 |
| B11 | low | The Reader's titles, descriptions and KPIs read as fact | `js/views/read.js`, `js/report_doc.js` | Fixed: a lilac note under the issue map, on screen and in the report |
| B12 | low | DEMO_SCRIPT's opening didn't match the page | DEMO_SCRIPT.md, .de.md | Fixed |
| B13 | low | English percentages had no space before % | `js/format.js` | Fixed: a no-break space, as Vici's writing rule asks |
| B14 | low | Three wording slips | report, German guide | Fixed |
| B15 | low | TECH_NOTES, section 8, and this file lagged the release | documents | Fixed here; section 8 waits for Victor's runs (A14) |
| B16 | observation | Two checks waited a fixed time | `tests/report.mjs` | Fixed: the copy check waits for the page's announcement |
| B17 | observation | The guide's figures stay on Tidewell Lines | guide | None needed: captioned "for Tidewell Lines" |
| B18 | observation | The report didn't carry the shortlist's share of the money at stake | `js/report_doc.js` | Fixed: a line under What we recommend |
| B19 | observation | The header grew when a tile's note wrapped | `css/app.css` | Declined: reserving two lines in every note took the 3 px the Start step needs at 1280 × 720 in German (`tests/page.mjs layout`) |
| B20 | observation | The build brief is written for Victor | brief | None needed: the brief's 6.6 asks for it |

## Part 3. Steve Jobs review and partner review

To be filled in as the reviews run.
