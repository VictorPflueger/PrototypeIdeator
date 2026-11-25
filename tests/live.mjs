// The live run in Chromium against the scripted stand-in (tests/lib/fake-claude.mjs): no test calls the real
// API or spends anything. api.anthropic.com is answered by the stand-in (the free model list, the free token
// count and the Messages API), and every other host is refused and counted. Parts, run in this order, each
// printing its token:
//   dialog        (G10, AC-11) Vici's liveDialogProblems on the rendered dialog; Start the live run waits for a key
//                 that looks right and the box, unticked at every opening; the key is checked with GET /v1/models
//                 first, a rejected one is named in the dialog and nothing is sent; it shows masked and is
//                 forgotten on request; inside another page's frame the dialog refuses
//   privacy       (G10, AC-11) the warning names planted e-mail, phone, IBAN and keyword samples by file and field,
//                 says PDFs can't be searched, and stays away from clean files; it comes before a run's first
//                 request whatever its step, and again when a field changed since the last request
//   presets       (G7, AC-08) Fast, Balanced, Thorough and an Advanced choice each send their model, effort and
//                 thinking, the step's output format and both headers on every request
//   flow          (G14) S1's three reports through the merges request, keep, merge and park, the Ideator, the
//                 scores, the shortlist and the Writer in both languages, with LIVE, the AI notice, tiles that
//                 wait and then answer, the leave-page warning, and the cutoff note, cost and time on the Report
//   handoff-only  (G14, AC-18) one challenger's report reads with no request to any host; Find prototype ideas
//                 then asks for the key
//   repair        (G7, AC-08) one failing answer goes back exactly once and the run goes on; two failures stop the
//                 step with what failed, and what is done stays
//   guards        (G13, AC-19) each refusal of the brief's 6.7 gets one repair; a text file's quote is checked word
//                 for word and a PDF's says not checked by code; texts the fact audit refuses twice show Unchecked
//   ideas-cap     (G12, AC-17) the control offers 1 to 10; the request carries the number in its schema and prompt;
//                 more ideas than asked for go back once; a repair that still has too many keeps the first ones
//   abort         (G7, AC-08) Stop ends the running request, nothing more is sent and what is done stays; Try again
//                 goes on from there
//   cap           (G8, AC-09) under the cap a request drops to its step's minimum output; when even that can't fit,
//                 nothing is sent and the bar names the step; Change settings raises the cap and the run goes on;
//                 a PDF whose pages sit in an object stream is priced at its pages when the free count fails
//   cost          (G8, AC-09) the Session cost tile and the Report's line show the stand-in's usage times the prices
//                 at 0.894, with the cap
//   errors        (G9, AC-10) 401, 403, 404, 400 for credit, 429, 529 and a network failure each show their message
//                 with what to do next, and retries follow the brief's 5.8; a browser-refusing organisation's 401
//                 is named in the dialog
//   storage       (G11, AC-02) after a full run and Save run as simulation: only vc-theme, pi.lang and Vici's guide
//                 note in storage, no database, cache or cookie, and the key in no download, console line, page
//                 text or address; Clear everything asks once, then empties the files, fields, run and key
//   save-run      (G15) the saved run validates, plays back to the same figures and carries no key, no prompt and
//                 no document text beyond the challengers' files and the Reader's short quotes
// Prints LIVE DIALOG OK, LIVE PRIVACY OK, LIVE PRESETS OK, LIVE FLOW OK, LIVE HANDOFF OK, LIVE REPAIR OK, LIVE
// GUARDS OK, LIVE IDEAS CAP OK, LIVE ABORT OK, LIVE CAP OK, LIVE COST OK, LIVE ERRORS OK, LIVE STORAGE OK and
// LIVE SAVE RUN OK.
// Usage: node tests/live.mjs [dialog|privacy|presets|flow|handoff-only|decide|repair|guards|ideas-cap|abort|cap|cost|errors|storage|save-run]
import { writeFileSync, mkdtempSync, copyFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE, viciDir, REQUIRE_VICI, KEYS } from "./lib/harness.mjs";
import { createFakeClaude, KEY } from "./lib/fake-claude.mjs";
import { routeStandIn } from "./lib/live-route.mjs";
import { objectStreamPdf } from "./lib/objstm-pdf.mjs";

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const imp = (p) => import(path.join(APP_ROOT, p));
const EN = (await imp("js/i18n/en.js")).default;
const DE = (await imp("js/i18n/de.js")).default;
const DICT = { en: EN, de: DE };
const { scenarioById } = await imp("js/scenarios.js");
const { buildRun, referenceOf } = await imp("js/simulation.js");
const { validate } = await imp("js/schema.js");
const { REGISTRY } = await imp("js/schemas.js");
const { AGENT_TOKENS, FX_USD_EUR, MODELS, LIMITS, PRESETS } = await imp("js/config.js");
const { fmtEurSpend, fmtEur } = await imp("js/format.js");

const vici = viciDir();
const liveLib = vici ? await import(pathToFileURL(path.join(vici, "scripts", "lib", "live.mjs")).href) : null;

const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8550 + Math.floor(Math.random() * 300));
const tmp = mkdtempSync(path.join(os.tmpdir(), "pi-live-"));
let failed = 0;
const tokens = [];
const ORDER = ["dialog", "privacy", "presets", "flow", "handoff-only", "decide", "repair", "guards", "ideas-cap", "abort", "cap", "cost", "errors", "storage", "save-run"];

function report(name, results, token) {
  console.log(`\n== ${name} ==`);
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  const bad = results.filter(([ok]) => !ok).length;
  failed += bad;
  if (!bad && results.length) tokens.push(token);
  if (!results.length) failed += 1;
}

// ---- files and answers --------------------------------------------------------------------------------------

const s1 = scenarioById("s1");
const s3 = scenarioById("s3");
/** A scenario's handoff files written as a challenger exports them, in one language. */
function handoffFiles(sc, lang, ids = null) {
  const dir = mkdtempSync(path.join(tmp, `${sc.id}-${lang}-`));
  return sc.documents.filter((d) => d.kind === "handoff" && (!ids || ids.includes(d.id))).map((d) => {
    const p = path.join(dir, d.name[lang]);
    writeFileSync(p, JSON.stringify(sc.files[d.id][lang], null, 2));
    return p;
  });
}
/** S3's annual-report excerpt under the name its scenario gives it, so the Reader's sources match. */
function s3Pdf(lang) {
  const dir = mkdtempSync(path.join(tmp, `s3pdf-${lang}-`));
  const doc = s3.documents.find((d) => d.kind === "pdf");
  const p = path.join(dir, doc.name[lang]);
  copyFileSync(path.join(APP_ROOT, "data", "scenarios", `s3-annual-report-${lang}.pdf`), p);
  return p;
}
function textFile(name, body) {
  const dir = mkdtempSync(path.join(tmp, "txt-"));
  const p = path.join(dir, name);
  writeFileSync(p, body);
  return p;
}
const A = (sc, lang) => sc.answers[lang];
const clone = (x) => structuredClone(x);

// ---- the page -----------------------------------------------------------------------------------------------

/**
 * A context whose api.anthropic.com is the stand-in. script: the Messages API's answers; models(key): the
 * model list; count: the token count's answer; hold(n): ms to hold the n-th answer; fail(n): true to fail
 * the n-th request at the network.
 */
async function open({ lang = "en", width = 1280, height = 720, script = [], expectSetting = null, models = null, count = 9000, hold = null, fail = null, query = "" } = {}) {
  const fake = createFakeClaude(script, { expectSetting });
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const net = await routeStandIn(context, fake, { models, count, hold, fail });
  const page = await context.newPage();
  const errors = [];
  const logs = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { logs.push(m.text()); if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await page.goto(`${server.base}?guide=0&lang=${lang}${query}`);
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForTimeout(200);
  return { context, page, fake, net, errors, logs };
}

const messages = (net) => net.filter((x) => x.method === "POST" && /\/v1\/messages(\?|$)/.test(x.url));
const stepIs = (page, name) => page.waitForFunction((n) => !!document.querySelector(`.step[data-step="${n}"]`) && !document.querySelector("#turn[aria-busy]"), name, { timeout: 30000 });
const turn = (page) => page.evaluate(() => document.getElementById("turn")?.innerText.replace(/\s+/g, " ").trim() || "");
const turnKind = (page) => page.evaluate(() => [...(document.getElementById("turn")?.classList || [])].find((c) => /^turn-bar--/.test(c))?.slice(10) || "");
const tiles = (page) => page.evaluate(() => Object.fromEntries(["stake", "covered", "top", "cost"].map((k) => {
  const note = document.querySelector(`#kpi-${k} .kpi-note`);
  // The note's own words; At stake's lilac AI line apart.
  return [k, { value: document.querySelector(`#kpi-${k} .kpi-value`).textContent, note: note.firstChild?.nodeType === 3 ? note.firstChild.textContent : note.textContent, ai: note.querySelector(".kpi-ai")?.textContent || "" }];
})));
const waitStopped = (page) => page.waitForFunction(() => document.querySelector("#turn.turn-bar--stopped"), null, { timeout: 30000 });

/** Run it live, then the files in, and the number of ideas. */
async function intake(page, files, { count = null } = {}) {
  await page.click("#btn-live");
  await page.waitForSelector('.step[data-step="start"][data-mode="live"]');
  await page.setInputFiles("#intake-files", files);
  await page.waitForTimeout(300);
  if (count) { await page.selectOption("#intake-count", String(count)); await page.waitForTimeout(150); }
}

/** The dialog: a key, a preset, Advanced's model and effort, a cap, the box, and Start the live run. */
async function fillDialog(page, { key = KEY, preset = null, model = null, effort = null, cap = null, start = true } = {}) {
  await page.waitForSelector("#live-dialog[open]");
  if (key !== null) await page.fill("#live-key", key);
  if (preset) await page.click(`label:has(input[name="live-preset"][value="${preset}"])`);
  if (model || effort) {
    await page.evaluate(() => { document.querySelector("#live-dialog .vc-live__advanced").open = true; });
    if (model) await page.selectOption("#live-model", model);
    if (effort) await page.selectOption("#live-effort", effort);
  }
  if (cap !== null) await page.evaluate((v) => { const el = document.getElementById("live-cap"); el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, cap);
  await page.check("#live-ack");
  if (start) await page.click("#live-start");
}

/** Start the agents from the live Start step, through the dialog. */
async function startRun(page, opts = {}) {
  await page.click("#btn-cta");
  await fillDialog(page, opts);
}

/** From the Read step: Find prototype ideas, and wait for the Ideate step. */
async function findIdeas(page) {
  await page.click("#btn-cta");
  await stepIs(page, "ideate");
}

/** From Ideate to the shortlist, then Write the report, and wait for the Report step. */
async function toReport(page) {
  await page.click("#btn-cta");
  await stepIs(page, "score");
  await page.click("#btn-cta");
  await stepIs(page, "shortlist");
  await page.click("#btn-cta");
  await stepIs(page, "report");
}

const s1Script = (lang, { count = 8 } = {}) => [{ answer: A(s1, lang).merges }, { answer: { ideas: A(s1, lang).ideas.ideas.slice(0, count) } }, { answer: A(s1, lang).recommendation }];

try {
  // ---- dialog ---------------------------------------------------------------------------------------------
  if (want("dialog")) {
    const res = [];
    const { context, page, fake, net, errors } = await open({ script: s1Script("en") });
    await intake(page, handoffFiles(s1, "en"), { count: 8 });
    await page.click("#btn-cta");
    await page.waitForSelector("#live-dialog[open]");
    await page.waitForTimeout(200);
    const html = await page.evaluate(() => document.getElementById("live-dialog").outerHTML);
    if (liveLib) {
      const problems = liveLib.liveDialogProblems(html);
      res.push([!problems.length, `Vici's liveDialogProblems finds nothing in the rendered dialog${problems.length ? `: ${problems.join("; ")}` : ""}`]);
      const planted = liveLib.liveDialogProblems(html.replace(/<input type="checkbox" id="live-ack">/, '<input type="checkbox" id="live-ack" checked>').replace(' autocomplete="off"', ""));
      res.push([planted.length >= 2, `control: the same dialog with the box ticked and autocomplete on is caught (${planted.length} problems)`]);
    } else res.push([!REQUIRE_VICI, "Vici's liveDialogProblems would run here (no ViciDesign checkout)"]);
    const field = await page.evaluate(() => { const i = document.getElementById("live-key"); return { type: i.type, auto: i.getAttribute("autocomplete"), spell: i.getAttribute("spellcheck"), op: i.hasAttribute("data-1p-ignore"), lp: i.getAttribute("data-lpignore"), form: !!i.closest("form"), forms: document.querySelectorAll("form").length }; });
    res.push([field.type === "password" && field.auto === "off" && field.spell === "false" && field.op && field.lp === "true" && !field.form && field.forms === 0, "the key field is a password field in no form, with autocomplete off, no spellcheck and the password managers' ignore marks"]);
    const state = async () => page.evaluate(() => ({ start: document.getElementById("live-start").disabled, ack: document.getElementById("live-ack").checked, key: document.getElementById("live-key").value }));
    const s0 = await state();
    res.push([s0.start && !s0.ack && s0.key === "", "at opening: the field empty, the box unticked and Start the live run disabled"]);
    await page.check("#live-ack");
    res.push([(await state()).start, "the box alone doesn't enable it"]);
    await page.fill("#live-key", "sk-nope-123");
    res.push([(await state()).start, "a value that doesn't look like a key doesn't either"]);
    await page.uncheck("#live-ack");
    await page.fill("#live-key", KEY);
    res.push([(await state()).start, "a key that looks right without the box doesn't either"]);
    await page.check("#live-ack");
    res.push([!(await state()).start, "a key that looks right and the ticked box enable it"]);
    await page.click("#live-key-show");
    const shown = await page.evaluate(() => ({ type: document.getElementById("live-key").type, pressed: document.getElementById("live-key-show").getAttribute("aria-pressed") }));
    await page.click("#live-key-show");
    const hidden = await page.evaluate(() => document.getElementById("live-key").type);
    res.push([shown.type === "text" && shown.pressed === "true" && hidden === "password", "Show key shows it and says so (aria-pressed); a second press hides it"]);
    // Closed and opened again: the box is unticked and the field empty once more.
    await page.click("#live-dialog [data-vc-close]");
    await page.waitForTimeout(200);
    await page.click("#btn-cta");
    await page.waitForSelector("#live-dialog[open]");
    const s1st = await state();
    res.push([s1st.start && !s1st.ack && s1st.key === "", "closed and opened again: the box is unticked and the field empty"]);
    // A rejected key: the dialog names it, nothing is sent to the Messages API.
    await fillDialog(page, { key: "sk-ant-wrong-0123456789abcdefghijklmnopqrstuvwxyz" });
    await page.waitForFunction(() => document.getElementById("live-key-msg").dataset.tone === "error", null, { timeout: 10000 });
    const msg = await page.textContent("#live-key-msg");
    const first = net.find((x) => /\/v1\//.test(x.url));
    res.push([msg.includes(EN["api.unauthorized"]) && (await page.evaluate(() => document.getElementById("live-dialog").open)) && first && /\/v1\/models/.test(first.url) && !messages(net).length, `a key Anthropic rejects: GET /v1/models first, "${msg.slice(0, 50)}…" in the dialog, which stays open, and no request to the Messages API`]);
    // The right key: checked, held, the run starts.
    await page.fill("#live-key", KEY);
    await page.click("#live-start");
    await stepIs(page, "read");
    const models = net.filter((x) => /\/v1\/models/.test(x.url)).length;
    res.push([models === 2 && messages(net).length === 1 && fake.agents()[0] === "merges", `the key passes the free check (${models} calls to GET /v1/models), then the merges request goes out`]);
    await context.close();
    // Through a stop, Change settings opens the dialog with the key held: masked, and forgotten on request.
    const second = await open({ script: [{ answer: A(s1, "en").merges }, { error: { status: 529, type: "overloaded_error", message: "Overloaded" } }, { error: { status: 529, type: "overloaded_error", message: "Overloaded" } }, { error: { status: 529, type: "overloaded_error", message: "Overloaded" } }] });
    await intake(second.page, handoffFiles(s1, "en"), { count: 8 });
    await startRun(second.page);
    await stepIs(second.page, "read");
    await second.page.click("#btn-cta");
    await waitStopped(second.page);
    await second.page.click('[data-action="live-settings"]');
    await second.page.waitForSelector("#live-dialog[open]");
    const held = await second.page.evaluate(() => ({ shown: !document.getElementById("live-current").hidden, masked: document.getElementById("live-masked").textContent }));
    res.push([held.shown && /^sk-ant-…[A-Za-z0-9]{4}$/.test(held.masked) && held.masked === `sk-ant-…${KEY.slice(-4)}`, `a held key shows masked ("${held.masked}")`]);
    await second.page.click("#live-forget");
    const after = await second.page.evaluate(() => ({ shown: !document.getElementById("live-current").hidden, start: document.getElementById("live-start").disabled, msg: document.getElementById("live-key-msg").textContent }));
    res.push([!after.shown && after.start && after.msg === EN["ld.key.forgotten"], "Forget key forgets it: the masked key goes, Start waits for a new one, and the dialog says so"]);
    res.push([!errors.length && !second.errors.length, `no page error${errors.length || second.errors.length ? `: ${[...errors, ...second.errors].join("; ")}` : ""}`]);
    await second.context.close();
    // Inside another page's frame the dialog refuses.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort("blockedbyclient"));
    const host = await ctx.newPage();
    await host.setContent(`<iframe src="${server.base}?guide=0" style="width:1280px;height:720px;border:0"></iframe>`);
    const frame = await (await host.waitForSelector("iframe")).contentFrame();
    await frame.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await frame.click("#btn-live");
    await frame.setInputFiles("#intake-files", handoffFiles(s1, "en"));
    await frame.waitForTimeout(300);
    await frame.click("#btn-cta");
    await frame.waitForSelector("#live-dialog[open]");
    await frame.fill("#live-key", KEY).catch(() => {});
    const framed = await frame.evaluate(() => ({ alert: !document.getElementById("live-framed").hidden, start: document.getElementById("live-start").disabled, key: document.getElementById("live-key").disabled }));
    res.push([framed.alert && framed.start && framed.key, "inside another page's frame the dialog says so, and the key field and Start stay off"]);
    await ctx.close();
    report("dialog", res, "LIVE DIALOG OK");
  }

  // ---- privacy --------------------------------------------------------------------------------------------
  if (want("privacy")) {
    const res = [];
    // The address is put together here, so no file of the repository carries one (tests/hygiene.mjs).
    const address = ["anna.berg", "example.org"].join("@");
    const planted = textFile("notes.md", `# Notes\n\nCall +49 30 1234567 or write to ${address}.\nPay to DE89 3704 0044 0532 0130 00.\nThis note is confidential.\n`);
    const clean = textFile("public.md", "# Annual figures\n\nRevenue grew in 2025. The report is published on the company's website.\n");
    for (const lang of ["en", "de"]) {
      const d = DICT[lang];
      const { context, page, errors } = await open({ lang });
      await intake(page, [planted, clean, s3Pdf(lang)]);
      await page.click("#intake-more summary").catch(() => {});
      await page.evaluate(() => { document.querySelector(".intake-more").open = true; });
      await page.fill("#intake-company", "Internal Test GmbH");
      await page.click("#btn-cta");
      await page.waitForSelector("#live-dialog[open]");
      await page.waitForTimeout(200);
      const w = await page.evaluate(() => ({ hidden: document.getElementById("live-warning").hidden, items: [...document.querySelectorAll("#live-warning-list li")].map((li) => li.textContent), pdfs: !document.getElementById("live-pdfs").hidden }));
      const want4 = [d["ld.warning.email"].replace("{where}", "notes.md"), d["ld.warning.phone"].replace("{where}", "notes.md"), d["ld.warning.iban"].replace("{where}", "notes.md"), d["ld.warning.word"].replace("{word}", "confidential").replace("{where}", "notes.md")];
      res.push([!w.hidden && want4.every((x) => w.items.includes(x)), `${lang}: the warning names the e-mail address, the phone number, the IBAN and "confidential" in notes.md (${w.items.length} items)`]);
      res.push([w.items.some((x) => x.includes(d["intake.company"])) && !w.items.some((x) => x.includes("public.md")), `${lang}: it names the Company field for "Internal", and says nothing about the clean file`]);
      res.push([w.pdfs, `${lang}: with a PDF in, it says PDFs can't be searched here`]);
      // Review B5: at 1280 × 720 with the warning and Advanced open, the acknowledgement's two lines stay
      // clear of the part under it; the body scrolls instead. Control: the old min-height squeezed it.
      const overlap = () => page.evaluate(() => {
        const ack = document.querySelector("#live-dialog .vc-live__ack");
        const text = ack.querySelector("span:last-child") || ack;
        const next = ack.nextElementSibling && !ack.nextElementSibling.hidden ? ack.nextElementSibling : document.getElementById("live-estimate");
        return Math.round(text.getBoundingClientRect().bottom - next.getBoundingClientRect().top);
      });
      await page.evaluate(() => { document.querySelector("#live-dialog .vc-live__advanced").open = true; });
      await page.waitForTimeout(300);
      const clear = await overlap();
      await page.evaluate(() => { document.querySelector("#live-dialog .vc-live__ack").style.minHeight = "var(--vc-control-md)"; });
      await page.waitForTimeout(200);
      const squeezed = await overlap();
      res.push([clear <= 0 && squeezed > 0, `${lang}: with the warning and Advanced open at 1280 × 720 the acknowledgement keeps clear of the next part (${clear} px), where the old min-height ran ${squeezed} px into it`]);
      await fillDialog(page, { start: false });
      res.push([!(await page.isDisabled("#live-start")), `${lang}: with the key and the box, Start the live run is ready despite the warning`]);
      res.push([!errors.length, `${lang}: no page error${errors.length ? `: ${errors.join("; ")}` : ""}`]);
      await context.close();
    }
    // Review A4: one challenger's report reads with no request, so the run's first request is the Ideator's.
    // Its dialog warns about what the report and the fields hold; and a field changed after that request
    // opens the dialog again before the Writer's.
    {
      const d = DICT.en;
      const [file] = handoffFiles(s1, "en", ["d1"]);
      const json = JSON.parse(readFileSync(file, "utf8"));
      json.issues[0].description = `${json.issues[0].description} Confidential: ask ${address} or call +49 30 1234567.`;
      writeFileSync(file, JSON.stringify(json, null, 2));
      const ideas = A(s1, "en").ideas.ideas.filter((i) => i.issues.every((id) => id.startsWith("bmc-"))).slice(0, 3);
      const { context, page, fake, errors } = await open({ script: [{ answer: { ideas } }, { answer: A(s1, "en").recommendation }] });
      await intake(page, [file], { count: 3 });
      await page.evaluate(() => { document.querySelector(".intake-more").open = true; });
      await page.fill("#intake-focus", `quotes, ask ${address}`);
      await page.click("#btn-cta");
      await stepIs(page, "read");
      const noDialog = !(await page.$("#live-dialog[open]"));
      await page.click("#btn-cta");
      await page.waitForSelector("#live-dialog[open]");
      await page.waitForTimeout(200);
      const w = await page.evaluate(() => ({ hidden: document.getElementById("live-warning").hidden, items: [...document.querySelectorAll("#live-warning-list li")].map((li) => li.textContent) }));
      const name = path.basename(file);
      const wanted = [d["ld.warning.email"].replace("{where}", name), d["ld.warning.phone"].replace("{where}", name), d["ld.warning.email"].replace("{where}", d["intake.focus"])];
      res.push([noDialog && !w.hidden && wanted.every((x) => w.items.includes(x)) && w.items.some((x) => /confidential/i.test(x)), `one challenger's report reads with no dialog; before the Ideator's request the dialog warns: ${w.items.join("; ")}`]);
      await fillDialog(page);
      await page.waitForFunction(() => document.querySelector('.step[data-step="ideate"], .step[data-step="score"]'), null, { timeout: 15000 });
      // Back at Start, a new address in Constraints; Find the shortlist's Write the report asks again.
      await page.click("#steps .vc-step:first-child .vc-step__button");
      await page.evaluate(() => { document.querySelector(".intake-more").open = true; });
      const other = ["sales", "example.net"].join("@");
      await page.fill("#intake-constraints", `Reply to ${other}`);
      await page.click("#steps .vc-step:nth-child(5) .vc-step__button");
      await page.waitForSelector('.step[data-step="shortlist"]');
      await page.click("#btn-cta");
      await page.waitForSelector("#live-dialog[open]", { timeout: 5000 }).catch(() => {});
      const again = await page.evaluate(() => ({ open: !!document.querySelector("#live-dialog[open]"), items: [...document.querySelectorAll("#live-warning-list li")].map((li) => li.textContent) }));
      res.push([again.open && again.items.some((x) => x === d["ld.warning.email"].replace("{where}", d["intake.constraints"])) && fake.requests.length === 1 && !errors.length, `a field changed after a request opens the dialog before the next one, warning about it: ${again.items.join("; ")} (${fake.requests.length} request sent so far)`]);
      await context.close();
    }
    // Clean files only: no warning.
    const { context, page } = await open({});
    await intake(page, [clean, ...handoffFiles(s1, "en")]);
    await page.click("#btn-cta");
    await page.waitForSelector("#live-dialog[open]");
    const none = await page.evaluate(() => ({ hidden: document.getElementById("live-warning").hidden, pdfs: document.getElementById("live-pdfs").hidden }));
    res.push([none.hidden && none.pdfs, "clean text and the challengers' reports: no warning, and no PDF note"]);
    await context.close();
    report("privacy", res, "LIVE PRIVACY OK");
  }

  // ---- presets --------------------------------------------------------------------------------------------
  if (want("presets")) {
    const res = [];
    const cases = [
      ["Fast", { preset: "fast" }, { model: "claude-haiku-5-5", effort: "low", thinking: { type: "disabled" } }],
      ["Balanced", {}, { model: "claude-haiku-5-5", effort: "medium", thinking: null }],
      ["Thorough", { preset: "thorough" }, { model: "claude-sonnet-5-5", effort: "medium", thinking: null }],
      ["Fast with Sonnet 5.5 under Advanced", { preset: "fast", model: "claude-sonnet-5-5" }, { model: "claude-sonnet-5-5", effort: "low", thinking: null }],
      ["Balanced with high effort under Advanced", { effort: "high" }, { model: "claude-haiku-5-5", effort: "high", thinking: null }]
    ];
    for (const [label, opts, setting] of cases) {
      const { context, page, fake, errors } = await open({ script: s1Script("en"), expectSetting: setting });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page, { ...opts, cap: 3 });
      await stepIs(page, "read");
      await findIdeas(page);
      await toReport(page);
      const formats = fake.requests.map((r) => r.req.output_config?.format?.schema?.required?.join(","));
      const steps = fake.agents().join(", ");
      res.push([!fake.violations.length && fake.requests.length === 3 && formats[0] === "merges" && /ideas/.test(formats[1]) && /headline/.test(formats[2]) && !errors.length, `${label}: ${steps}, each with ${setting.model}, effort ${setting.effort}, thinking ${setting.thinking ? JSON.stringify(setting.thinking) : "left out"}, its own output format and both headers${fake.violations.length ? `: ${fake.violations.join("; ")}` : ""}${errors.length ? `; ${errors.join("; ")}` : ""}`]);
      await context.close();
    }
    report("presets", res, "LIVE PRESETS OK");
  }

  // ---- flow -----------------------------------------------------------------------------------------------
  if (want("flow")) {
    const res = [];
    for (const lang of ["en", "de"]) {
      const d = DICT[lang];
      const { context, page, fake, net, errors } = await open({ lang, script: s1Script(lang) });
      await intake(page, handoffFiles(s1, lang), { count: 8 });
      const mode = await page.textContent("#mode-text");
      const before = await tiles(page);
      res.push([mode === "LIVE" && Object.values(before).every((x) => x.value === "…"), `${lang}: LIVE in the header, and every tile waits ("…") before the run`]);
      const notice = await page.evaluate(() => document.querySelector(".vc-live__footer .vc-tag--feature")?.textContent || "");
      res.push([notice.includes(d["p.ai"]), `${lang}: the AI notice stands beside Start the live run`]);
      await startRun(page);
      await stepIs(page, "read");
      const read = await tiles(page);
      const agent = await page.textContent(".agent-line");
      res.push([read.stake.value !== "…" && read.covered.value === "…" && read.top.value === "…" && read.cost.note.includes(fmtEur(0.5, lang)), `${lang}: after reading, At stake answers (${read.stake.value}), Issues covered and Top score wait, and Session cost shows the spend with the cap (${read.cost.value}, ${read.cost.note})`]);
      res.push([agent.includes(d["read.agent.handoff.other"].split("{n}")[0].trim().split(".")[0]), `${lang}: the lilac line says the challengers' files were read and compared`]);
      // Keep, merge and park: a merged issue is kept apart, then parked (no recorded idea names it), so the
      // Ideator gets the issues as decided.
      const rows = await page.$$eval(".issue-row", (trs) => trs.map((tr) => ({ id: tr.dataset.issue, status: [...tr.classList].find((c) => /^issue-row--(kept|merged|parked)$/.test(c)) })));
      const target = rows.find((x) => x.status === "issue-row--merged")?.id;
      const statusOf = (id) => page.$eval(`tr[data-issue="${id}"]`, (tr) => [...tr.classList].find((c) => /^issue-row--(kept|merged|parked)$/.test(c)));
      await page.click(`tr[data-issue="${target}"] [data-action="decide-keep"]`);
      await page.waitForTimeout(200);
      const keptNow = await statusOf(target);
      await page.click(`tr[data-issue="${target}"] [data-action="decide-park"]`);
      await page.waitForTimeout(200);
      const parkedNow = await statusOf(target);
      res.push([keptNow === "issue-row--kept" && parkedNow === "issue-row--parked", `${lang}: on the live issue map a merged issue is kept apart, then parked`]);
      await page.click("#btn-cta");
      await stepIs(page, "ideate").catch(async (e) => { console.log(`  (turn: ${await turn(page)})`); throw e; });
      const ideaReq = fake.requests[1]?.req;
      const sent = JSON.parse(ideaReq.messages[0].content.at(-1).text);
      res.push([!sent.issues.some((i) => i.id === target) && sent.issues.length === 8, `${lang}: the Ideator gets the ${sent.issues.length} kept issues as decided, the parked one out`]);
      const cells = await page.$$eval(".comb-cell, [data-idea]", (els) => els.length);
      const ideas = await tiles(page);
      res.push([cells >= 8 && ideas.covered.value !== "…" && ideas.top.value !== "…", `${lang}: eight ideas in the honeycomb, and Issues covered (${ideas.covered.value}) and Top score (${ideas.top.value}) answer`]);
      const guard = await page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
      res.push([guard, `${lang}: with ideas on screen, leaving the page asks first (the result isn't downloaded yet)`]);
      await toReport(page);
      const measured = await page.textContent(".live-measured");
      const cutoff = await page.textContent(".live-cutoff");
      const lead = d["report.measured"].split("{cost}")[0];
      res.push([measured.startsWith(lead) && measured.includes(d["ld.preset.balanced"]) && measured.includes("Haiku 5.5") && cutoff === d["report.cutoff"], `${lang}: the Report step says what the run cost and took ("${measured}") and the knowledge-cutoff note`]);
      const headline = await page.textContent(".rep-headline");
      res.push([headline.includes(A(s1, lang).recommendation.headline.split("{{")[0].trim().slice(0, 20)), `${lang}: the Writer's headline is on the report's page ("${headline.slice(0, 60)}…")`]);
      res.push([fake.agents().join() === "merges,ideator,writer" && !fake.violations.length, `${lang}: three requests in all: ${fake.agents().join(", ")}`]);
      const outside = net.filter((x) => !x.url.startsWith("https://api.anthropic.com/"));
      res.push([!outside.length && !errors.length, `${lang}: nothing went to any other host and no page error${outside.length || errors.length ? `: ${[...outside.map((x) => x.url), ...errors].join("; ")}` : ""}`]);
      await context.close();
    }
    report("flow", res, "LIVE FLOW OK");
  }

  // ---- handoff-only ---------------------------------------------------------------------------------------
  if (want("handoff-only")) {
    const res = [];
    for (const lang of ["en", "de"]) {
      const d = DICT[lang];
      // Ideas that name the canvas's issues only, since the canvas's report is the one file read.
      const bmc = A(s1, lang).ideas.ideas.filter((i) => i.issues.every((id) => id.startsWith("bmc-"))).slice(0, 3);
      const { context, page, net, errors } = await open({ lang, script: [{ answer: { ideas: bmc } }] });
      await intake(page, handoffFiles(s1, lang, ["d1"]), { count: 3 });
      const label = (await page.textContent("#btn-cta")).trim();
      res.push([label === d["intake.read"], `${lang}: with one challenger's report the button says "${label}"`]);
      await page.click("#btn-cta");
      await stepIs(page, "read");
      const rows = await page.$$eval(".issue-row", (trs) => trs.length);
      const agent = await page.textContent(".agent-line");
      res.push([rows > 0 && !net.length && agent.includes(d["read.agent.handoffNone"]), `${lang}: ${rows} issues on screen with no request to any host, and the lilac line says so`]);
      await page.click("#btn-cta");
      await page.waitForSelector("#live-dialog[open]");
      res.push([!net.length, `${lang}: Find prototype ideas asks for the key first, still with nothing sent`]);
      await fillDialog(page);
      await stepIs(page, "ideate");
      res.push([messages(net).length === 1 && !errors.length, `${lang}: after the key, one request: the Ideator's`]);
      await context.close();
    }
    report("handoff-only", res, "LIVE HANDOFF OK");
  }

  // ---- decide -----------------------------------------------------------------------------------------------
  // Victor's first real run (0.3.0): S3's PDF alone, the Reader's first answer refused once, nine issues, and
  // then Keep, Merge and Park did nothing that he could see. The same run against the stand-in, with the
  // clicks a person makes; a second run after Start a new run, which must show its own issues; Undo; and
  // the page's answers when something goes wrong: an error, a hidden modal dialog, a layer over the page.
  if (want("decide")) {
    const res = [];
    const good = clone(A(s3, "en").reader);
    const refused = clone(good);
    refused.issues[0].sources = [{ file: "notes.md", where: "section 1", quote: "Not one of the files." }];
    const second = clone(good);
    second.issues = second.issues.slice(0, 3).map((i, k) => ({ ...i, id: `I${k + 1}`, title: `Second run issue ${["one", "two", "three"][k]}`, kpis: [], sources: [{ file: "other-notes.md", where: "section 1", quote: "Nothing from the first run." }] }));
    second.merges = [];
    const { context, page, fake, errors } = await open({ width: 1876, height: 880, script: [{ answer: refused }, { answer: good }, { answer: second }] });
    const status = () => page.$$eval("tr[data-issue]", (rows) => Object.fromEntries(rows.map((r) => [r.dataset.issue, r.className.match(/issue-row--(\w+)/)?.[1]])));
    const toasts = () => page.$$eval(".vc-toast--danger", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
    /** A person's click: the mouse at the button's middle, as it stands on screen. */
    const press = async (id, action) => {
      const b = await page.$(`tr[data-issue="${id}"] [data-action="decide-${action}"]`);
      if (!b) return false;
      await b.scrollIntoViewIfNeeded();
      const box = await b.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(250);
      return true;
    };
    await intake(page, [s3Pdf("en")]);
    await startRun(page);
    await stepIs(page, "read");
    const first = await status();
    const ids = Object.keys(first);
    res.push([fake.agents().join() === "reader,reader" && ids.length === good.issues.length && Object.values(first).every((x) => x === "kept"), `the run reads S3's PDF alone, its first answer sent back once, and shows ${ids.length} issues, all kept`]);
    const lead = await page.$eval(".story .step-lead", (e) => e.textContent);
    res.push([lead === EN["read.lead.none"], "the lead says every issue starts as kept"]);
    const stake0 = (await tiles(page)).stake.value;
    // Park an issue with euros at stake, so the tile moves; merge another; Keep undoes the merge.
    const withEur = ids.find((id) => good.issues.find((i) => `doc-${i.id}` === id)?.eur_year_expected);
    await press(withEur, "park");
    const parked = await status();
    const stake1 = (await tiles(page)).stake.value;
    res.push([parked[withEur] === "parked" && stake1 !== stake0, `Park, clicked with the mouse, parks "${withEur}" and at stake moves from ${stake0} to ${stake1}`]);
    const other = ids.find((id) => id !== withEur && id !== ids.find((x) => x !== withEur));
    await press(other, "merge");
    const merged = await status();
    res.push([merged[other] === "merged" && merged[withEur] === "parked", `Merge merges "${other}" into a kept issue`]);
    await press(other, "keep");
    const keptId = ids.find((id) => id !== withEur && id !== other);
    await press(keptId, "keep");
    const kept = await status();
    res.push([kept[other] === "kept" && kept[keptId] === "kept" && !(await toasts()).length, "Keep undoes the merge, Keep on a kept issue changes nothing, and no problem shows"]);
    // Start a new run sets this one aside; Undo brings it back with its choices.
    const toStart = async () => { await page.click("#steps .vc-step:first-child .vc-step__button"); await page.waitForSelector('[data-action="new-run"]'); };
    await toStart();
    await page.click('[data-action="new-run"]');
    await page.click('[data-action="undo-new"]');
    await page.waitForTimeout(300);
    await page.click("#steps .vc-step:nth-child(2) .vc-step__button");
    await stepIs(page, "read");
    const back = await status();
    res.push([Object.keys(back).length === ids.length && back[withEur] === "parked", `Undo brings back the run set aside, with its own issues and choices${Object.keys(back).length === ids.length ? "" : `: step ${await page.evaluate(() => document.querySelector(".step")?.dataset.step)}, ${JSON.stringify(back)}`}`]);
    // A new run on other files: its Read step shows its own issues, not the first run's, and its choices take.
    await toStart();
    await page.click('[data-action="new-run"]');
    await page.setInputFiles("#intake-files", [textFile("other-notes.md", "# Other notes\n\nNothing from the first run.\n")]);
    await page.waitForTimeout(300);
    await startRun(page, { key: null });
    await stepIs(page, "read");
    const titles = await page.$$eval("tr[data-issue] .issue-title", (els) => els.map((e) => e.firstChild.textContent));
    res.push([titles.length === 3 && titles.every((x) => x.startsWith("Second run issue")), `after Start a new run the Read step shows the new run's ${titles.length} issues, not the first run's (${titles.slice(0, 2).join(", ")})`]);
    // Review A3: the tiles compare with this run as the agents left it, never with the first run's figures.
    const struck = await page.$$eval(".kpis .vc-stat__was", (els) => els.filter((e) => !e.hidden).map((e) => e.textContent.trim()).filter(Boolean));
    res.push([!struck.length, `and before any decision its tiles strike nothing through${struck.length ? `: ${struck.join(", ")}` : ""}`]);
    const secondIds = Object.keys(await status());
    await press(secondIds[0], "park");
    res.push([(await status())[secondIds[0]] === "parked", "and its choices take"]);
    // An error the page didn't expect stays on screen, with anything shaped like a key taken out.
    const planted = `sk-ant-api03-${"q".repeat(48)}`;
    await page.evaluate((k) => setTimeout(() => { throw new Error(`planted failure with ${k}`); }, 0), planted);
    await page.waitForTimeout(6500);
    const t1 = await toasts();
    res.push([t1.some((x) => x.includes("planted failure")) && !t1.some((x) => x.includes(planted)), `an error stays on screen after 6.5 s, without the key: "${(t1.find((x) => x.includes("planted")) || "").slice(0, 90)}"`]);
    await page.evaluate(() => document.querySelectorAll(".vc-toast").forEach((x) => x.remove()));
    // A modal dialog that is open but not drawn: the first press closes it and says so; the next click works.
    await page.evaluate(() => { const d = document.createElement("dialog"); d.id = "planted-dialog"; document.body.append(d); d.showModal(); d.style.display = "none"; });
    await press(secondIds[1], "park");
    const healed = await page.evaluate(() => !document.getElementById("planted-dialog").open);
    const t2 = await toasts();
    await press(secondIds[1], "park");
    res.push([healed && t2.some((x) => x.includes(EN["p.error.hiddenDialog"].slice(0, 30)) && x.includes("planted-dialog")) && (await status())[secondIds[1]] === "parked", "a hidden modal dialog is closed by the first press, which says so; the next click parks the issue"]);
    await page.evaluate(() => document.querySelectorAll(".vc-toast").forEach((x) => x.remove()));
    // A layer over the page that isn't the page's: the press names it.
    await page.evaluate(() => { const o = document.createElement("div"); o.id = "planted-layer"; Object.assign(o.style, { position: "fixed", inset: "0", zIndex: "9999" }); document.body.append(o); });
    await page.mouse.click(1400, 500);
    await page.waitForTimeout(250);
    const t3 = await toasts();
    res.push([t3.some((x) => x.includes(EN["p.error.covered"].slice(0, 30)) && x.includes("div#planted-layer")), `a press on a layer over the page names it: "${(t3[0] || "").slice(0, 80)}"`]);
    res.push([!errors.filter((x) => !/planted failure/.test(x)).length, `no page error besides the planted one${errors.length ? `: ${errors.slice(0, 2).join(" | ")}` : ""}`]);
    await context.close();
    report("decide", res, "LIVE DECIDE OK");
  }

  // ---- repair ---------------------------------------------------------------------------------------------
  if (want("repair")) {
    const res = [];
    const good = { ideas: A(s1, "en").ideas.ideas };
    const bad = clone(good);
    bad.ideas[0].issues = ["bmc-I99"];
    {
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, { answer: bad }, { answer: good }, { answer: A(s1, "en").recommendation }] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      await findIdeas(page);
      const second = fake.requests[2]?.req;
      const roles = second?.messages.map((m) => m.role).join(",");
      const note = second?.messages.at(-1)?.content?.[0]?.text || "";
      const agent = await page.textContent(".agent-line");
      res.push([fake.agents().join() === "merges,ideator,ideator" && roles === "user,assistant,user" && /bmc-I99" does not exist/.test(note), `an idea that names an issue that doesn't exist goes back once, with the problem listed ("${note.split("\n")[1] || ""}")`]);
      res.push([agent.includes(EN["live.repaired"]) && !errors.length, "the run goes on, and the Ideate step says the first answer went back once"]);
      await context.close();
    }
    {
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, { answer: bad }, { answer: bad }] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      const before = await page.$$eval(".issue-row", (trs) => trs.length);
      const stakeBefore = (await tiles(page)).stake.value;
      await page.click("#btn-cta");
      await waitStopped(page);
      const text = await turn(page);
      const problems = await page.$$eval(".stop-problems li", (lis) => lis.map((li) => li.textContent));
      const after = await page.$$eval(".issue-row", (trs) => trs.length);
      res.push([fake.agents().join() === "merges,ideator,ideator" && text.includes(EN["live.failed.ideator"]), `a second failure stops the step after exactly two Ideator requests: "${EN["live.failed.ideator"].slice(0, 50)}…"`]);
      res.push([problems.some((p) => /bmc-I99" does not exist/.test(p)), `what failed is listed under "${EN["live.problems"]}" ("${problems[0] || ""}")`]);
      res.push([after === before && (await tiles(page)).stake.value === stakeBefore && (await page.$('.step[data-step="read"]')) !== null && !errors.length, `what is done stays: the Read step with its ${after} issues and At stake ${stakeBefore}`]);
      await context.close();
    }
    report("repair", res, "LIVE REPAIR OK");
  }

  // ---- guards ---------------------------------------------------------------------------------------------
  if (want("guards")) {
    const res = [];
    const good = { ideas: A(s1, "en").ideas.ideas };
    const defects = [
      ["names an issue that doesn't exist", (a) => { a.ideas[1].issues = ["bmc-I99"]; }, /does not exist/],
      ["has one key figure", (a) => { a.ideas[2].key_figures = a.ideas[2].key_figures.slice(0, 1); }, /1 key figures, 2 or 3 wanted/],
      ["has a public key figure without its source", (a) => { const f = a.ideas[3].key_figures[0]; f.public = true; f.source = ""; f.today = f.today || "12 %"; }, /marked public, but today's value or its source is missing/],
      ["rates a criterion 6", (a) => { a.ideas[4].ratings.value.score = 6; }, /score: must be one of 1, 2, 3, 4, 5; got 6/],
      ["gives a rating no reason", (a) => { a.ideas[5].ratings.demo.reason = " "; }, /the demo rating has no reason/]
    ];
    for (const [label, plant, re] of defects) {
      const bad = clone(good);
      plant(bad);
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, { answer: bad }, { answer: good }] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      await findIdeas(page);
      const note = fake.requests[2]?.req.messages.at(-1)?.content?.[0]?.text || "";
      res.push([fake.agents().join() === "merges,ideator,ideator" && re.test(note) && !errors.length, `an idea that ${label} goes back for one repair, which names it`]);
      await context.close();
    }
    // The Reader: a text file's quote word for word, a PDF's not checked by code.
    {
      const md = textFile("field-notes.md", "# Field notes\n\nCustomers ask for heat pumps faster than the utility can connect them.\n");
      const reader = clone(A(s3, "en").reader);
      reader.issues.push({ ...clone(reader.issues[0]), id: "I9", title: "Heat pumps wait for a grid connection", description: "Customers wait to connect heat pumps.", eur_year_low: null, eur_year_high: null, eur_year_expected: null, eur_basis: "", sources: [{ file: "field-notes.md", where: "section 1", quote: "Customers ask for heat pumps sooner than ever." }] });
      const fixed = clone(reader);
      fixed.issues.at(-1).sources[0].quote = "Customers ask for heat pumps faster than the utility can connect them.";
      const { context, page, fake, errors } = await open({ script: [{ answer: reader }, { answer: fixed }] });
      await intake(page, [s3Pdf("en"), ...handoffFiles(s3, "en"), md]);
      await startRun(page);
      await stepIs(page, "read").catch(async (e) => { console.log(`  (turn: ${await turn(page)}; problems: ${(await page.$$eval(".stop-problems li", (l) => l.map((x) => x.textContent))).join(" | ")}; requests: ${fake.agents()}; errors: ${errors})`); throw e; });
      const note = fake.requests[1]?.req.messages.at(-1)?.content?.[0]?.text || "";
      res.push([fake.agents().join() === "reader,reader" && /does not stand in field-notes\.md word for word/.test(note), "a quote that doesn't stand in its text file word for word goes back for one repair"]);
      const checks = await page.$$eval(".found-check", (els) => els.map((e) => e.textContent));
      res.push([checks.length > 0 && checks.every((c) => c === EN["read.notChecked"]) && !errors.length, `quotes from the PDF say "${EN["read.notChecked"]}" (${checks.length})`]);
      const doc = fake.requests[0].req.messages[0].content.find((b) => b.type === "document");
      res.push([doc?.source?.media_type === "application/pdf" && doc.source.type === "base64" && doc.source.data.startsWith("JVBER"), "the PDF goes to the Reader once, as a base64 document block"]);
      await context.close();
    }
    // A text the fact audit refuses twice shows Unchecked, on the idea and on the report.
    {
      const numbered = clone(good);
      numbered.ideas[0].what_it_does = "Finds 4,312 containers a week whose allowances nobody charged.";
      const writer = clone(A(s1, "en").recommendation);
      writer.found = "Eight issues put 12.9 million euros a year at stake.";
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, { answer: numbered }, { answer: numbered }, { answer: writer }, { answer: writer }] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      await findIdeas(page);
      const note = await page.$(".unchecked-note");
      await page.click('[data-idea="P1"]').catch(() => {});
      await page.waitForSelector("#idea-drawer[open]", { timeout: 5000 }).catch(() => {});
      const drawer = await page.evaluate(() => !!document.querySelector("#idea-drawer[open] .unchecked-note"));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      res.push([fake.agents().join() === "merges,ideator,ideator" && !!note && drawer, "an idea whose text the fact audit refuses twice comes through marked Unchecked, on the step and on the idea's page"]);
      await toReport(page);
      const tag = await page.$$eval(".rep-page--short :not(.unchecked-note) > .unchecked-tag", (els) => els.length);
      res.push([tag === 1 && fake.agents().filter((x) => x === "writer").length === 2 && !errors.length, "the Writer's text refused twice shows Unchecked beside it on the report"]);
      // Review A10: the ideas file has no field for the marks, so its disclaimer names what is unchecked.
      const [d] = await Promise.all([page.waitForEvent("download"), page.click('[data-action="download-json"]')]);
      const file = JSON.parse(readFileSync(await d.path(), "utf8"));
      const p1 = file.ideas.find((i) => i.id === "P1")?.name || "";
      res.push([file.disclaimer.includes(EN["json.unchecked"].split(":")[0]) && file.disclaimer.includes(p1) && file.disclaimer.includes(EN["json.unchecked.found"]), `the ideas file's disclaimer names the unchecked texts: "${file.disclaimer.slice(file.disclaimer.indexOf("Unchecked"), file.disclaimer.indexOf("Unchecked") + 110)}…"`]);
      await context.close();
    }
    report("guards", res, "LIVE GUARDS OK");
  }

  // ---- ideas-cap ------------------------------------------------------------------------------------------
  if (want("ideas-cap")) {
    const res = [];
    const four = { ideas: A(s1, "en").ideas.ideas.slice(0, 4) };
    const three = { ideas: A(s1, "en").ideas.ideas.slice(0, 3) };
    const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, { answer: four }, { answer: three }] });
    await intake(page, handoffFiles(s1, "en"));
    const options = await page.$$eval("#intake-count option", (os) => os.map((o) => Number(o.value)));
    res.push([options.join() === "1,2,3,4,5,6,7,8,9,10" && (await page.inputValue("#intake-count")) === String(LIMITS.ideasDefault), "the control offers 1 to 10, five chosen"]);
    await page.selectOption("#intake-count", "3");
    await startRun(page);
    await stepIs(page, "read");
    await findIdeas(page);
    const req = fake.requests[1]?.req;
    res.push([/\{maxItems: 3\}/.test(req.output_config.format.schema.properties.ideas.description) && /RETURN exactly 3 ideas, never more/.test(req.system), "the Ideator's request carries 3 in its schema ({maxItems: 3}) and its prompt"]);
    const note = fake.requests[2]?.req.messages.at(-1)?.content?.[0]?.text || "";
    const shown = await page.$$eval("[data-idea]", (els) => new Set(els.map((e) => e.dataset.idea)).size);
    res.push([/4 ideas, but at most 3 were asked for/.test(note) && shown === 3 && !errors.length, `four ideas for three asked go back once; the repair's three reach the screen (${shown})`]);
    await context.close();
    // Victor's run of 24 November 2026: six ideas twice for five. The repaired answer's first ideas are kept,
    // the rest refused, and the Ideate step says so; the run goes on instead of stopping.
    {
      const again = await open({ script: [{ answer: A(s1, "en").merges }, { answer: four }, { answer: four }] });
      await intake(again.page, handoffFiles(s1, "en"));
      await again.page.selectOption("#intake-count", "3");
      await startRun(again.page);
      await stepIs(again.page, "read");
      await findIdeas(again.page);
      const kept = await again.page.$$eval("[data-idea]", (els) => [...new Set(els.map((e) => e.dataset.idea))].length);
      const line = await again.page.$eval(".agent-line", (el) => el.textContent);
      const stopped = await again.page.$$eval(".turn-bar--stopped", (els) => els.length);
      res.push([kept === 3 && /kept the first 3 and refused the rest/.test(line) && !stopped && again.fake.requests.length === 3 && !again.errors.length, `four ideas twice for three: the first three are kept, the Ideate step says so and the run goes on (${kept} ideas, ${stopped ? "stopped" : "not stopped"}: "${line.trim().slice(0, 160)}")`]);
      await again.context.close();
    }
    report("ideas-cap", res, "LIVE IDEAS CAP OK");
  }

  // ---- abort ----------------------------------------------------------------------------------------------
  if (want("abort")) {
    const res = [];
    // The held answer is the Ideator's first; Try again's answer is the script's next step.
    const ideas = { answer: A(s1, "en").ideas };
    const run = await open({ script: [{ answer: A(s1, "en").merges }, ideas, ideas, { answer: A(s1, "en").recommendation }], hold: (n) => (n === 2 ? 4000 : 0) });
    await intake(run.page, handoffFiles(s1, "en"), { count: 8 });
    await startRun(run.page);
    await stepIs(run.page, "read");
    const issues = await run.page.$$eval(".issue-row", (trs) => trs.length);
    await run.page.click("#btn-cta");
    await run.page.waitForSelector("#turn.turn-bar--busy");
    const busy = await run.page.evaluate(() => ({ text: document.getElementById("turn").innerText, inert: document.querySelector(".evidence").inert, steps: [...document.querySelectorAll("#steps .vc-step__button")].every((b) => b.disabled), back: document.getElementById("btn-live").disabled }));
    res.push([busy.text.includes(EN["live.busy.ideator.other"].replace("{n}", "8")) && busy.inert && busy.steps && busy.back, "while the Ideator works, its bar says so with Stop, and the issue map, the steps and the mode switch wait"]);
    await run.page.waitForTimeout(600);
    await run.page.click("#btn-cta");
    await waitStopped(run.page);
    const text = await turn(run.page);
    await run.page.waitForTimeout(4500);
    const after = await run.page.$$eval(".issue-row", (trs) => trs.length);
    res.push([text.includes(EN["live.stopped"]) && run.fake.agents().join() === "merges,ideator" && after === issues, `Stop: "${EN["live.stopped"]}", no further request, and the ${after} issues stay`]);
    await run.page.click("#btn-cta");
    await stepIs(run.page, "ideate");
    res.push([run.fake.agents().join() === "merges,ideator,ideator" && !run.errors.length, "Try again sends the Ideator's request once more and the run goes on"]);
    await run.context.close();
    report("abort", res, "LIVE ABORT OK");
  }

  // ---- cap ------------------------------------------------------------------------------------------------
  if (want("cap")) {
    const res = [];
    // The Reader on Thorough with a counted 30,000-token PDF: at €0.05 even its smallest output can't fit.
    {
      const { context, page, net, errors } = await open({ count: 30000, script: [] });
      await intake(page, [s3Pdf("en"), ...handoffFiles(s3, "en")]);
      await startRun(page, { preset: "thorough", cap: 0.05 });
      await waitStopped(page);
      const text = await turn(page);
      const counted = net.some((x) => /count_tokens/.test(x.url));
      res.push([text.includes(EN["live.budget.reader"].replace("{cap}", fmtEur(0.05, "en")).split(":")[0]) && text.includes(fmtEur(0.05, "en")) && counted && !messages(net).length && !errors.length, `a Reader request that can't fit €0.05: the PDF's tokens counted for free, nothing sent, and "${text.slice(text.indexOf("Stopped"), text.indexOf("Stopped") + 60)}…"`]);
      await context.close();
    }
    // Review A2: a 60-page PDF whose pages sit in an object stream, with the free count failing. Its pages are
    // read, the dialog prices them, and the cap takes them at Anthropic's rule's high end (60 × 4,568 tokens):
    // on Thorough at €0.50 the run stops before the Reader. Before 1.0.0 the file read as no pages, was priced
    // at nothing, and the request went out.
    {
      const { context, page, net, errors } = await open({ count: null, script: [{ answer: A(s3, "en").reader }] });
      const dir = mkdtempSync(path.join(tmp, "objstm-"));
      const pdf = path.join(dir, "compressed-annual-report.pdf");
      writeFileSync(pdf, objectStreamPdf(60));
      await intake(page, [pdf]);
      const row = await page.$$eval(".vc-dropzone__meta", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ")).join(" | "));
      await startRun(page, { preset: "thorough", cap: 0.5 });
      await waitStopped(page);
      const text = await turn(page);
      const counted = net.some((x) => /count_tokens/.test(x.url));
      res.push([/60 pages/.test(row) && counted && !messages(net).length && text.includes(EN["live.budget.reader"].replace("{cap}", fmtEur(0.5, "en")).split(":")[0]) && !errors.length, `a 60-page PDF with its pages compressed reads as "${(row.match(/[^|]*60 pages[^|]*/) || [row])[0].trim()}", and with the count failing the cap takes its pages at the rule's high end: nothing sent, "${text.slice(text.indexOf("Stopped"), text.indexOf("Stopped") + 50)}…"`]);
      await context.close();
    }
    // The Reader at its smallest output: a cap between the two worst cases.
    {
      const sonnet = MODELS.find((m) => m.id === "claude-sonnet-5-5").price;
      const { context, page, fake, errors } = await open({ count: 2000, script: [{ answer: A(s3, "en").reader }] });
      await intake(page, [s3Pdf("en"), ...handoffFiles(s3, "en")]);
      // 2,000 counted tokens and the prompt and schema: the worst case at 8,000 output tokens is about €0.08,
      // at 3,000 about €0.035; €0.05 lies between.
      await startRun(page, { preset: "thorough", cap: 0.05 });
      await stepIs(page, "read");
      const req = fake.requests[0]?.req;
      res.push([req?.max_tokens === AGENT_TOKENS.reader.min && !errors.length, `with €0.05 between the two worst cases, the Reader's request goes out with max_tokens ${req?.max_tokens} (its step's minimum, ${AGENT_TOKENS.reader.min}); at Sonnet 5.5's $${sonnet.output} a million output tokens`]);
      await context.close();
    }
    // After reading: the Ideator's request could pass the cap, so the run stops, and goes on with a higher cap.
    {
      // The merges answer's usage (10,000 in, 1,000 out on Sonnet 5.5: about €0.027) leaves too little of €0.05
      // for the Ideator's smallest worst case.
      const { context, page, fake, net, errors } = await open({ script: [{ answer: A(s1, "en").merges, usage: { input_tokens: 10000, output_tokens: 1000 } }, { answer: A(s1, "en").ideas }, { answer: A(s1, "en").recommendation }] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page, { preset: "thorough", cap: 0.05 });
      await stepIs(page, "read");
      await page.click("#btn-cta");
      await waitStopped(page);
      const text = await turn(page);
      res.push([text.includes(EN["live.budget.ideator"].split(":")[0]) && messages(net).length === 1, `the Ideator's worst case passes €0.05 after reading: nothing sent, and "${EN["live.budget.ideator"].split(":")[0]}"`]);
      const primary = (await page.textContent("#btn-cta")).trim();
      await page.click("#btn-cta");
      await page.waitForSelector("#live-dialog[open]");
      const min = Number(await page.getAttribute("#live-cap", "min"));
      await fillDialog(page, { key: null, cap: 0.5 });
      await stepIs(page, "ideate");
      const spent = (10000 * 2 + 1000 * 10) / 1e6 * FX_USD_EUR;
      res.push([primary === EN["live.settings"] && min >= spent && fake.agents().join() === "merges,ideator" && !errors.length, `"${primary}" opens the dialog, whose cap starts above the €${spent.toFixed(4)} spent (from €${min.toFixed(2)}); a higher cap and the run goes on`]);
      await context.close();
    }
    report("cap", res, "LIVE CAP OK");
  }

  // ---- cost -----------------------------------------------------------------------------------------------
  if (want("cost")) {
    const res = [];
    const usage = [{ input_tokens: 2100, output_tokens: 640 }, { input_tokens: 9400, output_tokens: 7300 }, { input_tokens: 3100, output_tokens: 520 }];
    const haiku = MODELS.find((m) => m.id === "claude-haiku-5-5").price;
    const eur = (us) => us.reduce((s, u) => s + (u.input_tokens * haiku.input + u.output_tokens * haiku.output) / 1e6, 0) * FX_USD_EUR;
    for (const lang of ["en", "de"]) {
      const script = s1Script(lang).map((step, k) => ({ ...step, usage: usage[k] }));
      const { context, page, errors } = await open({ lang, script });
      await intake(page, handoffFiles(s1, lang), { count: 8 });
      await startRun(page, { cap: 0.75 });
      await stepIs(page, "read");
      const one = await tiles(page);
      res.push([one.cost.value === fmtEurSpend(eur(usage.slice(0, 1)), lang) && one.cost.note === DICT[lang]["kpi.cost.live"].replace("{cap}", fmtEur(0.75, lang)), `${lang}: after the merges request the tile shows ${one.cost.value} "${one.cost.note}" (2,100 in and 640 out at Haiku 5.5's prices, 0.894 euros a dollar)`]);
      await findIdeas(page);
      await toReport(page);
      const all = await tiles(page);
      const measured = await page.textContent(".live-measured");
      const total = fmtEurSpend(eur(usage), lang);
      res.push([all.cost.value === total && measured.includes(total) && measured.includes(DICT[lang]["report.requests.other"].replace("{n}", "3")) && !errors.length, `${lang}: after three requests the tile and the Report's line show ${total}`]);
      await context.close();
    }
    report("cost", res, "LIVE COST OK");
  }

  // ---- errors ---------------------------------------------------------------------------------------------
  if (want("errors")) {
    const res = [];
    const cases = [
      ["401", [{ error: { status: 401, type: "authentication_error", message: "invalid x-api-key" } }], "api.unauthorized", EN["live.key"], 1],
      ["403", [{ error: { status: 403, type: "permission_error", message: "Your API key does not have permission to use the specified resource." } }], "api.forbidden", EN["live.settings"], 1],
      ["404", [{ error: { status: 404, type: "not_found_error", message: "model: claude-haiku-5-5" } }], "api.notFound", EN["live.settings"], 1],
      ["400 for credit", [{ error: { status: 400, type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits." } }], "api.credit", EN["live.again"], 1],
      ["429 at the workspace's spend limit", [{ error: { status: 429, type: "rate_limit_error", message: "You have reached your specified workspace API usage limits.", details: { error_code: "enforced_spend_limit_reached" } } }], "api.spendLimit", EN["live.again"], 1],
      ["429 three times", Array.from({ length: 3 }, () => ({ error: { status: 429, type: "rate_limit_error", message: "Number of request tokens has exceeded your rate limit.", retryAfter: 1 } })), "api.rateLimited", EN["live.again"], 3],
      ["529 three times", Array.from({ length: 3 }, () => ({ error: { status: 529, type: "overloaded_error", message: "Overloaded" } })), "api.overloaded", EN["live.again"], 3]
    ];
    for (const [label, errs, key, primary, n] of cases) {
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, ...errs] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      await page.click("#btn-cta");
      await waitStopped(page);
      const text = await turn(page);
      const msg = EN[key].replace("{model}", "Haiku 5.5");
      const button = (await page.textContent("#btn-cta")).trim();
      const times = fake.requests.slice(1).map((r) => r.at);
      const gaps = times.slice(1).map((t, k) => t - times[k]);
      const timing = key === "api.overloaded" ? gaps[0] >= 1400 && gaps[1] >= 3900 : key === "api.rateLimited" ? gaps.every((g) => g >= 900) : true;
      res.push([text.includes(msg) && button === primary && fake.requests.length - 1 === n && timing && !errors.length, `${label}: "${msg.slice(0, 60)}…", "${button}", after ${n} Ideator request${n === 1 ? "" : "s"}${gaps.length ? ` (retried after ${gaps.map((g) => `${(g / 1000).toFixed(1)} s`).join(" and ")})` : ""}`]);
      await context.close();
    }
    // 529 twice, then an answer: the retries carry the run through.
    {
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }, { error: { status: 529, type: "overloaded_error", message: "Overloaded" } }, { error: { status: 529, type: "overloaded_error", message: "Overloaded" } }, { answer: A(s1, "en").ideas }] });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      await page.click("#btn-cta");
      await page.waitForFunction(() => /\d/.test(document.getElementById("busy-note")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
      const note = await page.evaluate(() => document.getElementById("busy-note")?.textContent || "");
      await stepIs(page, "ideate");
      res.push([fake.requests.length === 4 && note.startsWith(EN["live.retrying"].split("{s}")[0]) && !errors.length, `529 twice and then an answer: the busy bar says "${note}" and the run goes on`]);
      await context.close();
    }
    // A network failure, three times.
    {
      const { context, page, fake, errors } = await open({ script: [{ answer: A(s1, "en").merges }], fail: (n) => n > 1 });
      await intake(page, handoffFiles(s1, "en"), { count: 8 });
      await startRun(page);
      await stepIs(page, "read");
      await page.click("#btn-cta");
      await waitStopped(page);
      const text = await turn(page);
      res.push([text.includes(EN["api.network"]) && fake.requests.length === 4 && !errors.length, `a network failure, retried twice: "${EN["api.network"].slice(0, 50)}…"`]);
      await context.close();
    }
    // At the key check: an organisation that refuses browser requests is named apart from a bad key.
    {
      const cors = () => ({ status: 401, body: { type: "error", error: { type: "authentication_error", message: "CORS requests are not allowed for this Organization because of its CORS settings." } } });
      const { context, page, net, errors } = await open({ models: cors });
      await intake(page, handoffFiles(s1, "en"));
      await startRun(page);
      await page.waitForFunction(() => document.getElementById("live-key-msg").dataset.tone === "error", null, { timeout: 10000 });
      const msg = await page.textContent("#live-key-msg");
      res.push([msg === EN["api.cors"] && !messages(net).length && !errors.length, `a 401 for browser requests at the key check: "${msg.slice(0, 50)}…"`]);
      await context.close();
    }
    report("errors", res, "LIVE ERRORS OK");
  }

  // ---- storage --------------------------------------------------------------------------------------------
  if (want("storage")) {
    const res = [];
    const { context, page, net, errors, logs } = await open({ script: s1Script("en") });
    await intake(page, handoffFiles(s1, "en"), { count: 8 });
    await startRun(page);
    await stepIs(page, "read");
    await findIdeas(page);
    await toReport(page);
    // The report's own downloads carry no key either: the HTML file and the ideas file, from 0.4.0.
    const files = [];
    for (const action of ["download-html", "download-json", "save-run"]) {
      const [d] = await Promise.all([page.waitForEvent("download"), page.click(`[data-action="${action}"]`)]);
      files.push(readFileSync(await d.path(), "utf8"));
    }
    const saved = files.join("\n");
    const guard = await page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
    res.push([!guard, "after Save run as simulation, leaving the page no longer asks"]);
    const kept = await page.evaluate(async () => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      dbs: (await indexedDB.databases()).map((d) => d.name),
      caches: await caches.keys(),
      cookie: document.cookie,
      text: document.body.innerText,
      html: document.documentElement.outerHTML,
      inputs: [...document.querySelectorAll("input, textarea")].map((i) => i.value).join("\n"),
      url: location.href
    }));
    const okLocal = kept.local.every((k) => k === KEYS.lang || k === KEYS.theme);
    const okSession = kept.session.every((k) => k.startsWith(KEYS.guidePrefix));
    res.push([okLocal && okSession, `storage holds only ${KEYS.theme}, ${KEYS.lang} and Vici's guide note (local: ${kept.local.join(", ") || "none"}; session: ${kept.session.join(", ") || "none"})`]);
    res.push([!kept.dbs.length && !kept.caches.length && kept.cookie === "", "no IndexedDB database, no cache and no cookie"]);
    const where = { download: saved, "console lines": logs.join("\n"), "page text": kept.text, "page markup": kept.html, "form fields": kept.inputs, address: kept.url };
    const scan = (places) => Object.entries(places).filter(([, v]) => v.includes(KEY) || v.includes(KEY.slice(8, 40))).map(([k]) => k);
    const leaks = scan(where);
    res.push([!leaks.length, `the key is in no download, console line, page text, markup, field or address${leaks.length ? `: found in ${leaks.join(", ")}` : ""}`]);
    // A planted control: the same scan finds the key, or a long part of it, where one is.
    res.push([scan({ whole: `x${KEY}y`, part: `[${KEY.slice(8, 40)}]`, clean: "sk-ant-[REDACTED]" }).join() === "whole,part", "control: the scan finds the key and a part of it, and passes a redacted one"]);
    res.push([!net.some((x) => !x.url.startsWith("https://api.anthropic.com/")) && !errors.length, "nothing went to another host, and no page error"]);
    await context.close();
    // Clear everything (brief §5.9, review A5): asked once in place, saying when a result hasn't been
    // downloaded; then the files, the fields, the run and the key are gone, and the next run asks for a key.
    {
      const c = await open({ script: s1Script("en") });
      await intake(c.page, handoffFiles(s1, "en"), { count: 8 });
      await c.page.evaluate(() => { document.querySelector(".intake-more").open = true; });
      await c.page.fill("#intake-company", "Tidewell Lines");
      await startRun(c.page);
      await stepIs(c.page, "read");
      await findIdeas(c.page);
      await c.page.click("#steps .vc-step:first-child .vc-step__button");
      await c.page.waitForSelector("#btn-clear");
      await c.page.click("#btn-clear");
      const asked = (await c.page.textContent("#btn-clear")).trim();
      const stillThere = await c.page.$$eval(".vc-dropzone__file", (els) => els.length);
      await c.page.click("#btn-clear");
      await c.page.waitForTimeout(300);
      const after = await c.page.evaluate(() => ({
        files: document.querySelectorAll(".vc-dropzone__file").length,
        company: document.getElementById("intake-company")?.value ?? "",
        reached: document.querySelectorAll("#steps .vc-step--done").length,
        stake: document.querySelector("#kpi-stake .kpi-value").textContent,
        guard: (() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; })()
      }));
      await c.page.setInputFiles("#intake-files", handoffFiles(s1, "en"));
      await c.page.waitForTimeout(300);
      await c.page.click("#btn-cta");
      await c.page.waitForSelector("#live-dialog[open]");
      const key = await c.page.evaluate(() => ({ value: document.getElementById("live-key").value, masked: !document.getElementById("live-current").hidden }));
      res.push([asked === EN["live.clear.confirmLose"] && stillThere === 3 && after.files === 0 && after.company === "" && after.reached === 0 && !after.guard && key.value === "" && !key.masked && !c.errors.length,
        `Clear everything asks once ("${asked}"), then the files (${stillThere} to ${after.files}), the fields, the run and the key are gone: the next run asks for a key, and leaving no longer warns`]);
      await c.context.close();
    }
    report("storage", res, "LIVE STORAGE OK");
  }

  // ---- save-run -------------------------------------------------------------------------------------------
  if (want("save-run")) {
    const res = [];
    const marker = "MARKER-TEXT-THAT-STAYS-ON-THIS-MACHINE";
    const md = textFile("board-notes.md", `# Board notes\n\n${marker}\n`);
    const { context, page, errors } = await open({ script: [{ answer: A(s3, "en").reader }, { answer: A(s3, "en").ideas }, { answer: A(s3, "en").recommendation }] });
    await intake(page, [s3Pdf("en"), ...handoffFiles(s3, "en"), md], { count: A(s3, "en").ideas.ideas.length });
    await startRun(page);
    await stepIs(page, "read");
    await findIdeas(page);
    await page.click("#btn-cta");
    await stepIs(page, "score");
    await page.click("#btn-cta");
    await stepIs(page, "shortlist");
    // A pick of the person's own: the second-ranked idea first.
    const ids = await page.$$eval(".pick-idea, [data-idea]", (els) => [...new Set(els.map((e) => e.dataset.idea).filter(Boolean))]);
    await page.click("#btn-cta");
    await stepIs(page, "report");
    const [download] = await Promise.all([page.waitForEvent("download"), page.click('[data-action="save-run"]')]);
    const name = download.suggestedFilename();
    const text = readFileSync(await download.path(), "utf8");
    const saved = JSON.parse(text);
    const v = validate(saved, REGISTRY.SavedRun, REGISTRY);
    res.push([v.valid, `the file (${name}) validates against the saved-run contract${v.valid ? "" : `: ${v.errors.slice(0, 3).map((e) => `${e.path} ${e.message}`).join("; ")}`}`]);
    res.push([/^prototype-ideator-auental-energie-gmbh-\d{4}-\d{2}-\d{2}-en-run\.json$/.test(name), "its name: prototype-ideator-<company>-<date>-<lang>-run.json"]);
    const run = buildRun(saved, saved.language, { decisions: saved.choices.issues, weights: saved.choices.weights, picks: saved.choices.shortlist, decided: true });
    const ref = referenceOf(run);
    const frozen = { ...saved.reference, cost_cents: saved.reference.cost_cents[saved.language] };
    res.push([JSON.stringify(ref) === JSON.stringify(frozen), `it plays back to the same figures: at stake ${ref.at_stake.eur}, ${ref.ideas} ideas, the order ${ref.order.join(", ")}, the top score ${ref.top.score}`]);
    const leaks = [["the key", text.includes(KEY)], ["a prompt", /You are the (Reader|Ideator|Writer)/.test(text)], ["thinking", /"thinking"/.test(text)], ["the text file's text", text.includes(marker)], ["the PDF", text.includes("JVBER")]].filter(([, x]) => x).map(([k]) => k);
    const quotes = (saved.answers[saved.language]?.reader?.issues || []).flatMap((i) => (i.sources || []).map((x) => String(x.quote || "")));
    res.push([!leaks.length && saved.files && Object.keys(saved.files).length === 1 && quotes.every((q) => q.length <= 150), `no key, no prompt, no thinking and no document text beyond the challenger's file and the Reader's ${quotes.length} quotes, none over 150 characters (longest ${Math.max(0, ...quotes.map((q) => q.length))})${leaks.length ? `: found ${leaks.join(", ")}` : ""}`]);
    res.push([saved.source === "live" && saved.language === "en" && saved.answers.de === null && saved.run.setting === "balanced" && typeof saved.run.cost_eur === "number" && ids.length > 0 && !errors.length, `marked live, in its one language, with its setting and cost (${saved.run.cost_eur} euros)`]);
    // What the free count gave for each step, beside the input billed, so a real run shows how close it came.
    const usage = Object.entries(saved.run.usage || {});
    res.push([usage.length > 0 && usage.every(([, u]) => Number.isInteger(u.counted_input_tokens) && u.counted_input_tokens > 0), `each step's usage carries its free count beside its billed input: ${usage.map(([a, u]) => `${a} ${u.counted_input_tokens} counted, ${u.input_tokens} billed`).join("; ")}`]);
    // Each step's use, for setting max_tokens from Victor's runs: the stand-in answers 1,800 in and 900 out.
    const use = saved.run.usage || {};
    const steps = ["reader", "ideator", "writer"].every((k) => use[k] && use[k].requests === 1 && use[k].input_tokens === 1800 && use[k].output_tokens === 900 && use[k].max_output_tokens === 900);
    res.push([steps && !("merges" in use), `each step's requests, tokens and largest answer: ${JSON.stringify(use)}`]);
    await context.close();
    report("save-run", res, "LIVE SAVE RUN OK");
  }
} finally {
  await browser.close();
  server.close();
}

// The tokens in the parts' fixed order, so a ledger can expect them in sequence.
const ordered = ORDER.map((p) => ({ dialog: "LIVE DIALOG OK", privacy: "LIVE PRIVACY OK", presets: "LIVE PRESETS OK", flow: "LIVE FLOW OK", "handoff-only": "LIVE HANDOFF OK", decide: "LIVE DECIDE OK", repair: "LIVE REPAIR OK", guards: "LIVE GUARDS OK", "ideas-cap": "LIVE IDEAS CAP OK", abort: "LIVE ABORT OK", cap: "LIVE CAP OK", cost: "LIVE COST OK", errors: "LIVE ERRORS OK", storage: "LIVE STORAGE OK", "save-run": "LIVE SAVE RUN OK" })[p]).filter((t) => tokens.includes(t));
console.log(failed ? `\nlive: ${failed} checks failed.` : `\nlive: all parts passed.\n${ordered.join("\n")}`);
process.exit(failed ? 1 : 0);
