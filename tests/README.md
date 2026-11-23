# Tests

The app needs none of this: it is static files. The suites run on Node.js 22 without dependencies; the browser suites also need Playwright with Chromium, and the Vici suite a checkout of ViciDesign next to the repository (`../ViciDesign`, or the folder in `VICI_DIR`). No test calls the real API or spends money: the probe's suites answer api.anthropic.com with a scripted stand-in, and every other host is refused.

## What runs

`node tests/run-all.mjs` runs every suite in order and, when all nineteen pass, ends with `ALL SUITES PASSED (19 of 19)`. `node tests/run-all.mjs engine probe` runs only the named ones, and `--require-vici` fails the suites that read ViciDesign without a checkout instead of skipping them, as GitHub Actions does. Each suite can also run on its own and prints its success line, such as `ENGINE OK`.

| Suite | Kind | What it checks |
|---|---|---|
| `tokens` | Node | Vici's colours in both themes: every pair the page draws at its contrast, and the colour-blind separation (the pairs sit in `lib/prototype.mjs`) |
| `page-icon` | Node | `favicon.svg`, the header and the loading screen show the sparkle in a lilac hexagon; with Victor's website next to the repository, its card has the same icon |
| `i18n` | Node | English and German: the same keys, no empty value, the same placeholders, every key used, no sentence typed into the page's scripts, the AI notice and the public-information notice in the brief's words (AC-03) |
| `policy` | Node | The security policy in `index.html` equals `js/config.js`; nothing loads from another host; only the shared client calls fetch; nothing inline; storage only in the language modules and Vici's theme script, with the three allowed keys; the key store and the session memory only |
| `unit` | Node | The shared client against a stand-in, its retries and errors, the cost maths, the formats in both languages, the key store and the session |
| `engine` | Node | The golden cases PI1 to PI3 exactly, in both languages: scores, rankings with their tie-breaks, the stability counts and the estimates to the cent (AC-16) |
| `handoff` | Node | The golden case PI4: a challenger's file read without a request, and the refusals of a wrong file |
| `facts` | Node | The placeholders and the fact audit: what passes, what is refused, and Unchecked after two refusals |
| `schemas` | Node | Every contract, both JSON schemas equal their module twins, and the output schemas inside the API's limits |
| `kpis` | Node | The shared KPI library: thirteen sectors, the ids, names in both languages, no benchmark value (taken from the SWOT Challenger) |
| `guards` | Node | The Ideator's guards on a good answer for Tidewell Lines and on copies with one rule broken each |
| `prompts` | Node | The Ideator's prompt and input: the shared rules, the rubric, the criteria, the cap, about 700 tokens; the stock words equal Vici's list |
| `probe` | Node | The Ideator probe against a scripted stand-in: each preset's request, the checks, the ranking, the cost, the errors, and the key in no result |
| `parity` | Node | The shared parts equal every sibling's copy beside the repository (`SIBLINGS_DIR`, or `../BMC-challenger` and so on) |
| `hygiene` | Node | No private term and no e-mail address in any file the repository publishes (below) |
| `docs` | Node | The documents' sections and version, every path they name, the probe's console line and the prices in TECH_NOTES.md |
| `vici` | Chromium | Vici's own checks (`guideProblems`, `bylineProblems`, `writingProblems`, `aiNoticeProblems`, `recordIdProblems`, `policyProblems`, `storageProblems`, `storedKeyProblems`) on the page as served and as rendered in English and German, each first failing on a planted control; ViciDesign's `check-guide-render.mjs` over http; the writing rules on both string files, the KPI library and the docs; `vici/` equal to ViciDesign at the commit its README and the workflow name (AC-01) |
| `hexagon` | Chromium | Nothing round: the app's files, and the rendered page in both themes |
| `page` | Chromium | The page as a visitor meets it: English first under a German browser and the switch without a reload (`languages`), the four key figures waiting (`tiles`), the storage rule (`storage`), the layout at 1920 × 1080 and 1280 × 720 in both themes and languages (`layout`), and the probe's console line under the page's policy (`probe`) |

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
