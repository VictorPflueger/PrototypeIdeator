// Runs every check in order and prints a summary. The app itself needs none of this.
// Usage: node tests/run-all.mjs                  (all suites)
//        node tests/run-all.mjs engine probe     (only the named suites)
//        node tests/run-all.mjs --require-vici   (fail, rather than skip, without a ViciDesign checkout)
// Adapted from the Sovereignty Assessment 2.0.0's tests/run-all.mjs: this tool's suites.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";

const SUITES = [
  { id: "tokens", what: "colour system on Vici's tokens, light and dark: contrast and colour-blind separation", file: "tests/tokens.mjs", browser: false },
  { id: "page-icon", what: "page icon: favicon, header and loading screen, as on the website's card", file: "tests/page-icon.mjs", browser: false },
  { id: "i18n", what: "both languages: the same keys, no empty value, the same placeholders, every key used, no typed sentence", file: "tests/i18n.mjs", browser: false },
  { id: "policy", what: "the security policy, the client and the token count the only request modules, one host, nothing inline, the storage rule in the code", file: "tests/policy.mjs", browser: false },
  { id: "unit", what: "the shared client against a stand-in, cost, formats, the key store, the session held in memory", file: "tests/unit.mjs", browser: false },
  { id: "engine", what: "golden cases PI1 to PI3 in both languages: scores, rankings and tie-breaks, stability, estimates to the cent", file: "tests/engine.mjs", browser: false },
  { id: "handoff", what: "golden case PI4: a challenger's file read without a request, and every refusal", file: "tests/handoff.mjs", browser: false },
  { id: "facts", what: "the placeholders and the fact audit: what passes, what is refused, Unchecked after two refusals", file: "tests/facts.mjs", browser: false },
  { id: "schemas", what: "every contract, both JSON files equal their modules, the output schemas inside the API's limits", file: "tests/schemas.mjs", browser: false },
  { id: "scenarios", what: "the three scenarios: the checker on S1 to S3, planted defects caught, stand-ins marked, the S3 PDF's quotes on their pages", file: "tests/scenarios.mjs", browser: false },
  { id: "simulation", what: "the simulation model: frozen figures in both languages, and another path that agrees with the engine", file: "tests/simulation.mjs", browser: false },
  { id: "kpis", what: "the shared KPI library: sectors, ids, names in both languages, no benchmark value", file: "tests/kpis.mjs", browser: false },
  { id: "guards", what: "the agents' guards: every refusal, the fact audit and the notes on a broken copy of a good answer", file: "tests/guards.mjs", browser: false },
  { id: "prompts", what: "the Ideator's prompt and input: rules, rubric, criteria, the cap, about 700 tokens", file: "tests/prompts.mjs", browser: false },
  { id: "probe", what: "the Ideator probe against a scripted stand-in: requests, checks, ranking, cost, errors, the key", file: "tests/probe.mjs", browser: false },
  { id: "pipeline", what: "the live pipeline against the stand-in: settings, one repair, the budget cap, the meter to 1e-9, retries, Stop, every error's message", file: "tests/pipeline.mjs", browser: false },
  { id: "privacy", what: "what looks private: e-mail addresses, phone numbers, IBANs and keywords found, clean text left alone", file: "tests/privacy.mjs", browser: false },
  { id: "parity", what: "the shared parts equal every sibling's copy that exists", file: "tests/parity.mjs", browser: false },
  { id: "hygiene", what: "no client, prospect, contact or meeting named in any published file", file: "tests/hygiene.mjs", browser: false },
  { id: "docs", what: "the documents: sections, version, every path they name, the probe line, the prices", file: "tests/docs.mjs", browser: false },
  { id: "vici", what: "Vici's own checks on the page served and rendered in both languages, the texts, the docs; vici/ byte for byte", file: "tests/vici.mjs", browser: true },
  { id: "hexagon", what: "nothing round: the app's files, and the rendered page in both themes", file: "tests/hexagon.mjs", browser: true },
  { id: "presenter", what: "the simulation played in Chromium: scenarios, key figures, choices, weights, Play, ideas and the guide", file: "tests/presenter.mjs", browser: true },
  { id: "intake", what: "the live run's intake: what the drop zone reads, refuses and limits, with no request", file: "tests/intake.mjs", browser: true },
  { id: "live", what: "a live run in Chromium against the stand-in: the dialog, presets, the flow, repairs, guards, Stop, the cap, cost, errors, storage, Save run", file: "tests/live.mjs", browser: true },
  { id: "report", what: "the report in Chromium: its sections, the PDF's footer on every page, its tables and the challengers' print format, a stopped run's notice, the HTML and ideas files, the downloads and the build brief", file: "tests/report.mjs", browser: true },
  { id: "page", what: "the page in Chromium: languages, key figures, storage, the comb of 1 to 10 ideas on screen and paper, the chart's labels, layout from 1920 x 1080 to 1280 x 720, the probe line", file: "tests/page.mjs", browser: true },
  { id: "access", what: "accessibility in Chromium: a scenario and a live run by keyboard alone, the focus seen at every stop, reduced motion, every control named", file: "tests/access.mjs", browser: true }
];

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const chosen = SUITES.filter((s) => !only.length || only.includes(s.id));
const summary = [];
// In GitHub Actions a failed suite also becomes an annotation with its FAIL lines, readable in the
// run's summary and through the API without the full log.
const CI = process.env.GITHUB_ACTIONS === "true";
const annotate = (s, out) => {
  const lines = out.split("\n").filter((l) => l.trim());
  const picked = lines.filter((l) => /^(FAIL|Error|TypeError|SyntaxError)|failed/i.test(l.trim())).map((l) => l.trim());
  const text = (picked.length ? picked : lines.slice(-12).map((l) => l.trim())).join(" ⏎ ").slice(0, 6000);
  console.log(`::error title=${s.id} suite failed::${text}`);
};
for (const s of chosen) {
  console.log(`\n=== ${s.id}: ${s.what} ===`);
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(APP_ROOT, s.file), ...(["vici", "prompts", "kpis", "report"].includes(s.id) ? flags : [])], { cwd: APP_ROOT, stdio: CI ? ["inherit", "pipe", "pipe"] : "inherit", env: process.env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (CI) {
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) annotate(s, `${r.stdout || ""}\n${r.stderr || ""}`);
  }
  summary.push({ ...s, ok: r.status === 0, code: r.status, seconds: Math.round((Date.now() - started) / 1000) });
  if (r.status === 2 && s.browser) {
    console.log("Playwright is missing; browser suites are skipped. See tests/README.md.");
    break;
  }
}

console.log("\n=== Summary ===");
for (const s of summary) console.log(`${s.ok ? "PASS" : "FAIL"}  ${s.id.padEnd(10)} ${String(s.seconds).padStart(4)} s  ${s.what}`);
const skipped = chosen.length - summary.length;
if (skipped) console.log(`(${skipped} suite${skipped === 1 ? "" : "s"} not run)`);
const allPassed = summary.length === chosen.length && summary.every((s) => s.ok);
// The success line names a run of every suite, none skipped.
if (allPassed && !only.length) console.log(`ALL SUITES PASSED (${summary.length} of ${SUITES.length})`);
process.exit(allPassed ? 0 : 1);
