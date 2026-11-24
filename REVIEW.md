# Review: files taken from other tools

Every file this repository took from a sister prototype or a sibling tool, as of version 0.1.0, with what changed and why. "Copied" means byte for byte. The sources, as read on 23 November 2026: the Sovereignty Assessment 2.0.0 (35c0dea), the Data Quality Agent 2.2.0 (831f050), the Timetable Translator (through the Sovereignty Assessment), the SWOT Challenger 0.1.0 (a52fd6f, merged as 617b122) and Vici (6580c06).

## Shared with the sibling tools

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `data/kpis.js` | SWOT Challenger | Copied | The KPI library of the set of four; the first tool to merge it is its source |
| `schemas/strategy-challenge-1.json` | SWOT Challenger | Copied | The handoff file's schema, the same file in all four tools |
| `schemas/strategy-challenge-1.js` | SWOT Challenger | Copied | Its module twin, since the policy blocks JSON modules |
| `js/risk.js` | SWOT Challenger | Copied | The Ideator imports its money format, so the four tools write money alike |
| `tools/schema-module.mjs` | SWOT Challenger | Copied | Writes the twin above, so every tool writes the same bytes |
| `tests/kpis.mjs` | SWOT Challenger | Copied | Checks the shared library the same way in every tool |

## Live client, key and session

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `js/anthropic.js` | Sovereignty Assessment | Adapted | Two lines: it imports `APP` and its stream-hook log names the app from `config.js`, so the file can be the same in all four tools |
| `js/sse.js` | Sovereignty Assessment | Copied | The SSE reader |
| `js/cost.js` | Sovereignty Assessment | Copied | Usage times price, Haiku's tier above 100,000 tokens, $0.01 a search, 0.894 euros a dollar |
| `js/schema.js` | Sovereignty Assessment | Copied | The JSON Schema validator the brief names |
| `js/keystore.js` | Sovereignty Assessment (the same file in the Data Quality Agent) | Adapted | One module variable instead of session storage: the brief keeps the key in memory only. `looksLikeKey`, `maskKey` and `redactSecrets` stay |
| `js/session.js` | none | New | Everything a person enters and a run makes, held in memory, with Clear everything and the leave-page warning |
| `js/live_dialog.js` | Data Quality Agent | Adapted | Its key check with the free model list and its refusal inside a frame; Vici's live-run dialog with this tool's presets, Advanced, budget cap, warning and estimate; the key in memory only |
| `js/api_messages.js` | Sovereignty Assessment | Adapted | Each API answer and each stop of a step as a plain message with the one thing to do next, with this tool's credit, model, browser and budget cases |
| `js/pipeline.js`, `js/live_agents.js`, `js/live_run.js`, `js/count.js`, `js/privacy.js` | none | New | One structured request a step under the budget cap with one repair; the four agents' requests and checks; a live run in the scenarios' format and Save run as simulation; the free token count; what looks private |

## Page, languages and settings

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

## Tests and tools

| File | From | Verdict | What changed and why |
|---|---|---|---|
| `tests/lib/harness.mjs` | Sovereignty Assessment | Adapted | This tool's storage keys, output folder and browser settings |
| `tests/lib/prototype.mjs` | Sovereignty Assessment | Adapted | This page's name, colour pairs, hexagon tour and page icon |
| `tests/lib/fake-claude.mjs` | Sovereignty Assessment | Adapted | Single structured requests instead of a tool loop: it streams each answer, plays errors with retry-after, and checks every request's model, effort, thinking, format and headers |
| `tests/lib/live-route.mjs`, `tests/live.mjs`, `tests/pipeline.mjs`, `tests/privacy.mjs` | none | New | The stand-in on a browser context; the live run in Chromium; the pipeline in Node; the private-data scan |
| `tests/hygiene.mjs` | Sovereignty Assessment (from the Timetable Translator) | Copied | The private term list comes from `HYGIENE_TERMS` |
| `tests/hexagon.mjs`, `tests/page-icon.mjs` | Sovereignty Assessment | Copied | The page's values sit in `tests/lib/prototype.mjs` |
| `tests/tokens.mjs` | Data Quality Agent | Copied | The page's colour pairs sit in `tests/lib/prototype.mjs` |
| `tests/policy.mjs` | Data Quality Agent | Adapted | This tool's host, allowed storage modules and keys, and Vici's theme script |
| `tests/vici.mjs`, `tests/run-all.mjs`, `tests/live_site.mjs` | Sovereignty Assessment | Adapted | This page, its ids, its documents and its suites; `tests/vici.mjs` also compares `vici/` with ViciDesign byte for byte |
| `.github/workflows/tests.yml`, `live-site.yml` | Sovereignty Assessment, with the Data Quality Agent's step for Victor's website | Adapted | Also clones the three challengers for the parity suite |
| `tools/update-vici.mjs` | none | New | Copies the files this page uses from a ViciDesign checkout, `dist/vici-theme.js` included, and names the commit in `vici/README.md` and the workflow |

## Not taken

The sisters' agent loops, tools, simulations and domain modules are not taken (PLAN.md, section 7.2): the Ideator sends single structured requests. The page's own theme script went once Vici published `vici/dist/vici-theme.js`, and the Data Quality Agent's vici-files suite is folded into `tests/vici.mjs`.
