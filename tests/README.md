# Tests

The app needs none of this: it is static files. The suites run on Node.js 22 without dependencies; the browser suites also need Playwright with Chromium, and the Vici suite a checkout of ViciDesign next to the repository (`../ViciDesign`, or the folder in `VICI_DIR`). No test calls the real API or spends money: the probe's and the live run's suites answer api.anthropic.com with a scripted stand-in (`tests/lib/fake-claude.mjs`, put on a browser context by `tests/lib/live-route.mjs`), and every other host is refused.

## What runs

`node tests/run-all.mjs` runs every suite in order and, when all twenty-six pass, ends with `ALL SUITES PASSED (26 of 26)`. `node tests/run-all.mjs engine probe` runs only the named ones, and `--require-vici` fails the suites that read ViciDesign without a checkout instead of skipping them, as GitHub Actions does. Each suite can also run on its own and prints its success line, such as `ENGINE OK`.

| Suite | Kind | What it checks |
|---|---|---|
| `tokens` | Node | Vici's colours in both themes: every pair the page draws at its contrast, and the colour-blind separation (the pairs sit in `lib/prototype.mjs`) |
| `page-icon` | Node | `favicon.svg`, the header and the loading screen show the sparkle in a lilac hexagon; with Victor's website next to the repository, its card has the same icon |
| `i18n` | Node | English and German: the same keys, no empty value, the same placeholders, every key used, no sentence typed into the page's scripts, the AI notice and the public-information notice in the brief's words (AC-03) |
| `policy` | Node | The security policy in `index.html` equals `js/config.js`; nothing loads from another host; only the shared client and the free token count call fetch; the page links only to Victor's sites and the Console's keys page; nothing inline; storage only in the language modules and Vici's theme script, with the three allowed keys; the key store and the session memory only |
| `unit` | Node | The shared client against a stand-in, its retries and errors, the cost maths, the formats in both languages, the key store and the session |
| `engine` | Node | The golden cases PI1 to PI3 exactly, in both languages: scores, rankings with their tie-breaks, the stability counts and the estimates to the cent (AC-16) |
| `handoff` | Node | The golden case PI4: a challenger's file read without a request, and the refusals of a wrong file |
| `facts` | Node | The placeholders and the fact audit: what passes, what is refused, and Unchecked after two refusals |
| `schemas` | Node | Every contract, both JSON schemas equal their module twins, and the output schemas inside the API's limits |
| `scenarios` | Node | The three scenarios through `tools/check-scenarios.mjs` with an empty sibling folder, and each kind of planted defect caught: a broken schema, a missing id, a missing language, placeholders that differ between languages, prose the fact audit refuses, a figure off its frozen reference, a fact missing from DATA_SOURCES.md, a key-shaped string and a thinking block; the stand-in handoff files valid and marked, and caught once a challenger's own export sits beside the repository; the S3 PDF built one page per section with every quote on its page (AC-06) |
| `simulation` | Node | The recorded run of S1, S2 and S3 in both languages against the frozen reference, at stake worked out apart from the engine; another path through each scenario whose tiles, ranking, stability sentence and summary agree with the engine (AC-05) |
| `kpis` | Node | The shared KPI library: thirteen sectors, the ids, names in both languages, no benchmark value (taken from the SWOT Challenger) |
| `guards` | Node | The Reader's, the merges agent's, the Ideator's and the Writer's guards, each on a good answer for Tidewell Lines and on copies with one rule broken each |
| `pipeline` | Node | The live pipeline against the stand-in through a stubbed fetch: each preset's model, effort and thinking; one repair, a second failure that stops, a text refused twice marked unchecked; the budget cap's drop to a step's minimum and its stop before a request; the meter to 1e-9; retries after 1.5 s and 4 s or retry-after; Stop; every error's message and what to do next (AC-08 to AC-10) |
| `privacy` | Node | What a live run warns about: e-mail addresses, phone numbers, valid IBANs and the keywords found and named by kind, never repeated, and clean text, dates, amounts and standards left alone (AC-11) |
| `prompts` | Node | The Ideator's prompt and input: the shared rules, the rubric, the criteria, the cap, about 700 tokens; the stock words equal Vici's list |
| `probe` | Node | The Ideator probe against a scripted stand-in: each preset's request, the checks, the ranking, the cost, the errors, and the key in no result |
| `parity` | Node | The shared parts equal every sibling's copy beside the repository (`SIBLINGS_DIR`, or `../BMC-challenger` and so on) |
| `hygiene` | Node | No private term and no e-mail address in any file the repository publishes (below) |
| `docs` | Node | The documents' sections and version, every path they name, the probe's console line and the prices in TECH_NOTES.md |
| `vici` | Chromium | Vici's own checks (`guideProblems`, `bylineProblems`, `writingProblems`, `aiNoticeProblems`, `recordIdProblems`, `policyProblems`, `storageProblems`, `storedKeyProblems`) on the page as served and as rendered in English and German, each first failing on a planted control; ViciDesign's `check-guide-render.mjs` over http; the writing rules on both string files, the KPI library and the docs; `vici/` equal to ViciDesign at the commit its README and the workflow name (AC-01) |
| `hexagon` | Chromium | Nothing round: the app's files, and the rendered page in both themes |
| `presenter` | Chromium | The simulation as a presenter plays it: S1 to S3 from Start to Report in both languages with no key and every other host refused (`scenarios`), the four tiles before anything runs and after a decision (`figures`), a parked issue, an undone merge, a weight and a shortlist against the engine (`choices`), weights moved with the keyboard (`weights`), Play, Space, the arrow keys and a deep link (`play`), the honeycomb and the idea's page (`ideas`), and the guide's figures and script (`guide`) (AC-04, AC-05, AC-07, AC-20) |
| `intake` | Chromium | The live run's intake: a challenger's report read into issues with no request (PI4 on screen), Word and PowerPoint refused with "Save it as PDF first", and the limits on files, bytes, pages, companies and challengers each in its own words (AC-18) |
| `live` | Chromium | A live run against the stand-in: Vici's live-run dialog check, the key checked first and shown masked, the box unticked at every opening, the frame refused (`dialog`); the private-data warning (`privacy`); each preset's requests (`presets`); S1 from the reports to the report in both languages (`flow`); one challenger's report with no request (`handoff-only`); Keep, Merge and Park clicked on the Reader's issues after a refused first answer, a second run after Start a new run showing its own issues, Undo, and the page's answers to an error, a hidden modal dialog and a layer over the page (`decide`); one repair and a stop after two (`repair`); each guard's repair, quotes checked or not, Unchecked (`guards`); at most the ideas asked for (`ideas-cap`); Stop and Try again (`abort`); the budget cap (`cap`); the meter on screen (`cost`); each API error with its retries (`errors`); storage and the key after a full run (`storage`); and Save run as simulation (`save-run`) (AC-02, AC-08 to AC-11, AC-17, AC-19) |
| `page` | Chromium | The page as a visitor meets it: English first under a German browser and the switch without a reload (`languages`), the four key figures waiting (`tiles`), the storage rule (`storage`), the layout of every step of S1 to S3, Score's three views, Play running and the live intake, the live-run dialog, a step at work, an error, a stopped step and the live report at 1920 × 1080 and 1280 × 720 in both themes and languages, with the rendered contrast of every text and icon there and in the drawer and the guide, and every target at least 40 px (`layout`), and the probe's console line under the page's policy (`probe`) |

`tests/live_site.mjs` checks the published site after a Pages build (the "live site" workflow): the files it serves equal this checkout, and the page boots in both languages.

## Setup for the browser suites

```
npm install -g playwright@1.56.0
npx playwright install chromium
git clone https://github.com/VictorPflueger/ViciDesign ../ViciDesign
NODE_PATH="$(npm root -g)" node tests/run-all.mjs
```

`CHROME_PATH` points the suites at another Chromium or Chrome and `CHROME_ARGS` passes it extra flags; `PI_TEST_OUT` sets the folder for screenshots (by default `prototype-ideator-tests` in the system's temporary folder).

## The private term list

`tests/hygiene.mjs` checks every published file against a private list of terms that must never appear in this public repository. The list never enters the repository. It is read from the `HYGIENE_TERMS` environment variable (a repository secret in CI), from the file `HYGIENE_TERMS_FILE` names, or from `../.hygiene-terms` next to the repository folder; one entry per line, "term<TAB>what it is". Without a list only the generic checks run and the suite says so: `HYGIENE GENERIC OK` instead of `HYGIENE OK`.

## The golden cases

`fixtures/` holds the brief's section 11 as JSON, committed before the code that computes them: `pi1-scores.json` to `pi4-handoff.json` and the brief's example handoff file. `ideator-s1-answer.json` is a well-formed answer of the Ideator for Tidewell Lines, which the guards, the probe and the page suites use.
