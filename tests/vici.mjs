// Vici's own rules, checked with Vici's own functions (AC-01; Build a prototype, "Check it"): the How it
// works guides and their key figures (guideProblems), the byline (bylineProblems), the Writing guideline's
// checkable patterns (writingProblems), the AI notice of a page that can start a live run
// (aiNoticeProblems), names, not record ids (recordIdProblems), the strict security policy
// (policyProblems), the live-run dialog (liveDialogProblems) and Nothing is kept (storageProblems on the
// scripts, storedKeyProblems on what a visit leaves behind). They run on the page as served, on the
// page as rendered in English and in German (at its first step, after Run it live, on every step of the
// scenarios and on a live run against the scripted stand-in), on both string files and on the docs. ViciDesign's check-guide-render.mjs drives the guide over http. vici/ holds
// Vici's files byte for byte, at the commit vici/README.md and the workflow name.
//
// Each imported check first fails on a planted control. Prints VICI CONTROLS OK, VICI STANDARDS OK and
// VICI OK. The functions come from a ViciDesign checkout (VICI_DIR, or ../ViciDesign); without one the
// suite says so and passes, unless --require-vici is given or it runs on GitHub Actions. Adapted from the
// Sovereignty Assessment 2.0.0's tests/vici.mjs: this page's frame, ids and docs.
// Usage: node tests/vici.mjs [--require-vici]
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, REQUIRE_VICI, viciDir, launchBrowser, serveStatic, NETWORK_NOISE, MOCK_KEY } from "./lib/harness.mjs";
import { createFakeClaude } from "./lib/fake-claude.mjs";
import { routeStandIn } from "./lib/live-route.mjs";

const dir = viciDir();
if (!dir) {
  console.log(`${REQUIRE_VICI ? "FAIL" : "SKIP"}  no ViciDesign checkout in VICI_DIR or next to this repository (../ViciDesign)`);
  process.exit(REQUIRE_VICI ? 1 : 0);
}
const lib = async (file) => import(pathToFileURL(path.join(dir, "scripts", "lib", file)).href);
const { guideProblems } = await lib("guide.mjs");
const { bylineProblems } = await lib("byline.mjs");
const { writingProblems } = await lib("writing.mjs");
const { aiNoticeProblems, canRunLive, AI_NOTICE } = await lib("ai.mjs");
const { recordIdProblems } = await lib("ids.mjs");
const { policyProblems } = await lib("policy.mjs");
const { storageProblems, storedKeyProblems } = await lib("storage.mjs");
const { liveDialogProblems } = await lib("live.mjs");
const mod = (p) => import(pathToFileURL(path.join(APP_ROOT, p)).href);

const read = (f) => readFileSync(path.join(APP_ROOT, f), "utf8");
const readIf = (f) => (existsSync(path.join(APP_ROOT, f)) ? read(f) : "");
const html = read("index.html");
const page = (paragraphs, lang = "en-GB") => `<html lang="${lang}"><body>${paragraphs.map((t) => `<p>${String(t).replace(/</g, "&lt;")}</p>`).join("")}</body></html>`;
const controls = [];
const standards = [];
const control = (ok, what) => controls.push([!!ok, what]);
const check = (ok, what) => standards.push([!!ok, what]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- the checks can fail ----------------------------------------------------------------------------------
control(guideProblems(html.replace(/<dialog\b[^>]*vc-guide[\s\S]*?<\/dialog>/g, "")).length > 0, "guideProblems catches a page without its guides");
control(guideProblems(html.replace('<div class="kpis"', '<p class="vc-stat" data-vc-kpi="Ideas built" data-vc-kpi-de="Gebaute Ideen">6</p><div class="kpis"')).some((p) => /Ideas built|Gebaute Ideen/.test(p)), "guideProblems catches a key figure no How it works chapter explains");
control(bylineProblems(html.replace(/href="https:\/\/victorpflueger\.github\.io\/VIP\/index\.html"/, 'href="#"')).length > 0, "bylineProblems catches a byline without the website link");
control(writingProblems(page(["The score is 4.75 — much more."])).length > 0 && writingProblems(page(["A seamless shortlist."])).length > 0, "writingProblems catches an em dash and a stock word");
control(recordIdProblems("<p>The issue is bmc-I1, see transport_logistics.cost_per_teu.</p>", ["bmc-I1", "transport_logistics.cost_per_teu"]).length === 2 && !recordIdProblems("<p>Cost per container moved</p>", ["transport_logistics.cost_per_teu"]).length, "recordIdProblems catches an issue id and a KPI id on a screen, and passes names");
control(policyProblems(html.replace("</head>", "<style>p{}</style></head>")).length > 0 && policyProblems(html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")).length > 0, "policyProblems catches a style element and a policy that lets inline scripts in");
control(storageProblems({ "js/x.js": "localStorage.setItem('pi.notes', text);" }, { allow: ["js/lang.js"] }).length === 1 && storageProblems({ "js/x.js": "const db = indexedDB.open('pi');" }).length === 1 && !storageProblems({ "js/x.js": "// localStorage is not used here" }).length, "storageProblems catches local storage outside the allowed modules and any database, and ignores a comment");
control(storedKeyProblems({ local: ["vc-theme", "pi.lang", "pi.key"], session: ["vc-guide:/#guide-en"] }, { prefix: "pi" }).length === 1, "storedKeyProblems catches a stray key and lets the three allowed ones pass");
control(aiNoticeProblems(html.split(AI_NOTICE.en).join("An assistant")).length > 0 && !aiNoticeProblems('<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'"><p>Replay</p>').length, "aiNoticeProblems catches a live page that never says it is an AI, and leaves a page that cannot run live alone");
control(liveDialogProblems(html.replace('<input type="checkbox" id="live-ack">', '<input type="checkbox" id="live-ack" checked>')).some((p) => /unticked/.test(p)) && !liveDialogProblems(html).length, "liveDialogProblems catches the acknowledgement ticked in the markup, and passes the page's dialog");

// ---- the page as served -------------------------------------------------------------------------------------
const g = guideProblems(html);
check(!g.length, `the two guides follow Vici's standard, a row in How it works for each key figure in its language included${g.length ? `: ${g.join("; ")}` : ""}`);
check(/<dialog class="vc-dialog vc-guide" id="guide-en" lang="en-GB"[\s\S]*?<h2[^>]*>How the prototype works<\/h2>/.test(html), "the English guide is titled How the prototype works, in English");
check(/<dialog class="vc-dialog vc-guide" id="guide-de" lang="de"[\s\S]*?<h2[^>]*>So funktioniert der Prototyp<\/h2>/.test(html), "the German guide is titled So funktioniert der Prototyp, in German");
const kpis = [...html.matchAll(/\bdata-vc-kpi="([^"]+)" data-vc-kpi-de="([^"]+)"/g)].map((m) => `${m[1]} / ${m[2]}`);
check(kpis.join("|") === "At stake a year / Pro Jahr auf dem Spiel|Issues covered / Abgedeckte Themen|Top score / Bester Wert|Session cost / Sitzungskosten", `the header marks four key figures, each in both languages (${kpis.join(", ")})`);
const b = bylineProblems(html);
check(!b.length, `the byline follows Vici's standard${b.length ? `: ${b.join("; ")}` : ""}`);
const w = writingProblems(html);
check(!w.length, `index.html keeps Vici's writing rules${w.length ? `: ${w.join("; ")}` : ""}`);
const a = aiNoticeProblems(html);
check(canRunLive(html) && !a.length, `the page can start a live run and says "${AI_NOTICE.en}"${a.length ? `: ${a.join("; ")}` : ""}`);
check(new RegExp(`id="btn-live" data-vc-live>[\\s\\S]{0,200}?</button>\\s*<span class="vc-tag vc-tag--feature[^"]*"[^>]*>[\\s\\S]{0,160}${esc(AI_NOTICE.en)}</span>`).test(html), "the AI notice stands in a lilac tag right beside Run it live");
const DE = (await mod("js/i18n/de.js")).default;
const EN = (await mod("js/i18n/en.js")).default;
check(Object.values(DE).includes(AI_NOTICE.de) && Object.values(EN).includes(AI_NOTICE.en), `the page says "${AI_NOTICE.de}" in German`);
const header = (html.match(/<header class="app-header"[\s\S]*?<\/header>/) || [""])[0];
check(/>SIMULATION</.test(header) && /data-vc-theme-toggle/.test(header) && /data-vc-guide-open="guide-en"/.test(header) && /lang-switch/.test(header) && /vc-icon--sparkle/.test(header), "the header has the sparkle in a lilac hexagon, the name, SIMULATION, How it works, EN and DE, and the theme toggle");
const strip = (html.match(/<\/header>(?:\s*<!--[\s\S]*?-->)?\s*<div class="intro"[^>]*>([\s\S]*?)<\/div>\s*(?:<!--[\s\S]*?-->\s*)?<nav/) || [])[1] || "";
check(/<p class="intro-text"[^>]*>[^<]{40,300}<\/p>/.test(strip) && /fictional companies/.test(strip) && /class="vc-byline"/.test(strip), "one sentence under the header says what the tool does and that the simulation's companies are fictional, beside the byline");
check((html.match(/class="vc-byline"/g) || []).length === 1, "the page carries one byline");
check(/Public information only: never enter confidential, personal or otherwise protected data\./.test(html), "the public-information notice is on the page, in the brief's words");
const pp = policyProblems(html);
check(!pp.length, `the page keeps Vici's strict security policy: one policy, nothing inline${pp.length ? `: ${pp.join("; ")}` : ""}`);
const scripts = [];
const walkJs = (d) => { for (const f of readdirSync(path.join(APP_ROOT, d))) { const p = `${d}/${f}`; if (statSync(path.join(APP_ROOT, p)).isDirectory()) walkJs(p); else if (/\.m?js$/.test(f)) scripts.push(p); } };
walkJs("js");
walkJs("data");
const sp = storageProblems(Object.fromEntries([...scripts, "index.html"].map((f) => [f, read(f)])), { allow: ["js/lang.js", "js/i18n/index.js"] });
check(scripts.length > 20 && !sp.length, `Nothing is kept, in the ${scripts.length} scripts and the page: only the language modules touch storage, and nothing uses a database, the Cache API or a cookie${sp.length ? `: ${sp.join("; ")}` : ""}`);

// The ids of the tool's data: sectors, KPIs and the issues of the example handoff file. Vici's names-not-ids
// rule: none of them may reach a screen.
const { SECTORS, KPIS } = await mod("data/kpis.js");
const H = await mod("js/handoff.js");
const example = JSON.parse(read("tests/fixtures/strategy-challenge-example.json"));
const IDS = new Set([...SECTORS.map((s) => s.id), ...KPIS.map((k) => k.id), ...H.readHandoff(example).issues.map((i) => i.id), "bmc-challenger", "swot-challenger", "pestel-challenger"]);
// The scenarios' own ids: their issues (bmc-I1, doc-I3 and the rest), documents and ideas (P1 to P8).
const { scenarios: allScenarios } = await mod("js/scenarios.js");
const { recordedRun } = await mod("js/simulation.js");
const IDEA_IDS = new Set();
for (const sc of allScenarios()) for (const lang of ["en", "de"]) {
  const run = recordedRun(sc, lang);
  for (const i of run.issues) IDS.add(i.id);
  for (const i of run.ideas) IDEA_IDS.add(i.id);
  for (const d of sc.documents) IDS.add(`${sc.id}-${d.id}`);
}
check(IDS.size > 120, `the data's ids are known (${IDS.size}, with ${IDEA_IDS.size} idea ids)`);

const name = (lang) => (lang === "en" ? "English" : "German");

/**
 * The live screens in one language, from S1's three reports against the scripted stand-in: the dialog's
 * markup, a step at work, a stop after two failed checks with what they found open, and the live report.
 */
async function liveScreens(lang) {
  const sc = allScenarios().find((x) => x.id === "s1");
  const a = sc.answers[lang];
  const bad = structuredClone(a.ideas);
  bad.ideas[0].issues = [bad.ideas[1].issues[0], "bmc-I99"];
  // An issue merged into another is not kept: the guards name it by its id, the screen by its title.
  bad.ideas[2].issues = [a.merges.merges[0].merged[0]];
  const fake = createFakeClaude([{ answer: a.merges }, { answer: bad }, { answer: bad }, { answer: a.ideas }, { answer: a.recommendation }]);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await routeStandIn(context, fake, { hold: (n) => (n === 2 ? 1500 : 0) });
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e.message || e)));
  p.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await p.goto(`${server.base}?guide=0&lang=${lang}`);
  await p.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await p.click("#btn-live");
  await p.setInputFiles("#intake-files", sc.documents.map((d) => ({ name: d.name[lang], mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sc.files[d.id][lang], null, 2)) })));
  await p.waitForTimeout(200);
  await p.selectOption("#intake-count", String(a.ideas.ideas.length));
  await p.click("#btn-cta");
  await p.waitForSelector("#live-dialog[open]");
  await p.waitForTimeout(200);
  const dialog = await p.evaluate(() => document.getElementById("live-dialog").outerHTML);
  await p.fill("#live-key", MOCK_KEY);
  await p.check("#live-ack");
  await p.click("#live-start");
  const settled = (step) => p.waitForFunction((n) => !!document.querySelector(`.step[data-step="${n}"]`) && !document.querySelector("#turn[aria-busy]"), step, { timeout: 30000 });
  await settled("read");
  const screens = [];
  await p.click("#btn-cta");
  await p.waitForSelector("#turn.turn-bar--busy");
  screens.push(await p.content());
  await p.waitForSelector("#turn.turn-bar--stopped", { timeout: 30000 });
  await p.click(".stop-problems summary");
  screens.push(await p.content());
  const listed = await p.$$eval(".stop-problems li", (lis) => lis.map((li) => li.textContent));
  if (!listed.some((x) => /is not kept/.test(x))) errors.push(`the stop lists no issue that is not kept: ${listed.join(" | ")}`);
  await p.click("#btn-cta");
  await settled("ideate");
  screens.push(await p.content());
  for (const step of ["score", "shortlist", "report"]) { await p.click("#btn-cta"); await settled(step); }
  screens.push(await p.content());
  await context.close();
  return { dialog, screens, errors };
}

// ---- the page as rendered, in English and in German -----------------------------------------------------------
const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8600 + Math.floor(Math.random() * 300));
try {
  for (const lang of ["en", "de"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort("blockedbyclient"));
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e.message || e)));
    p.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
    await p.goto(`${server.base}?guide=0&lang=${lang}`);
    await p.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
    await p.waitForTimeout(300);
    const views = [await p.content()];
    await p.click("#btn-live");
    await p.waitForTimeout(400);
    views.push(await p.content());
    // Every step of every scenario, the idea's page, and Score's table and stability views.
    const steps = [];
    for (const sc of allScenarios()) for (let step = 1; step <= 6; step++) {
      await p.goto(`${server.base}?guide=0&lang=${lang}&scenario=${sc.id}&step=${step}`);
      await p.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
      await p.waitForTimeout(150);
      steps.push(await p.content());
      if (step === 3) { await p.click(".comb-tile"); await p.waitForTimeout(250); steps.push(await p.content()); await p.keyboard.press("Escape"); }
      if (step === 4) for (const v of ["table", "stability"]) { await p.click(`label:has(#view-${v})`); await p.waitForTimeout(150); steps.push(await p.content()); }
      // The Report step holds the whole report; its build brief opens in a drawer of its own.
      if (step === 6) { await p.click("#btn-brief"); await p.waitForSelector("#brief-drawer[open]"); await p.waitForTimeout(200); steps.push(await p.content()); await p.keyboard.press("Escape"); }
    }
    // The live screens: the live-run dialog (Vici's own check of the pattern), a step at work, a stop with
    // what the checks found open, and the live report, from S1's reports against the scripted stand-in.
    const live = await liveScreens(lang);
    steps.push(...live.screens);
    const ld = liveDialogProblems(live.dialog);
    const la = aiNoticeProblems(live.dialog);
    check(!ld.length && !live.errors.length, `rendered in ${name(lang)}: the live-run dialog passes Vici's liveDialogProblems, and the live run has no page error${[...ld, ...live.errors].length ? `: ${[...ld, ...live.errors].join("; ")}` : ""}`);
    check(live.dialog.includes(lang === "de" ? AI_NOTICE.de : AI_NOTICE.en) && !la.length, `rendered in ${name(lang)}: the AI notice stands beside Start the live run, in its language`);
    // The page in one language shows one guide: the other is out of its way (lang.js takes its
    // data-vc-guide-auto and its button), so Vici's guide check sees the page as a one-language page.
    const other = lang === "en" ? "de" : "en";
    const rg = guideProblems(views[0].replace(new RegExp(`<dialog\\b[^>]*\\bid="guide-${other}"[\\s\\S]*?</dialog>`), "").replace(new RegExp(`<button[^>]*data-vc-guide-open="guide-${other}"[\\s\\S]*?</button>`), ""));
    const rb = bylineProblems(views[0]);
    const rw = views.flatMap((v) => writingProblems(v));
    const ra = aiNoticeProblems(views[0]);
    check(!rg.length && !rb.length && !rw.length && !ra.length && !errors.length, `rendered in ${name(lang)}: the guide, the byline, the writing and the AI notice pass, at the first step and after Run it live${[...rg, ...rb, ...rw, ...ra, ...errors].length ? `: ${[...rg, ...rb, ...rw, ...ra, ...errors].join("; ")}` : ""}`);
    check(new RegExp(`<html[^>]*lang="${lang === "de" ? "de" : "en-GB"}"`).test(views[0]) && views[0].includes(lang === "de" ? AI_NOTICE.de : AI_NOTICE.en), `rendered in ${name(lang)}: the page says its language and carries the AI notice in it`);
    const ri = [...views, ...steps].flatMap((v) => [...recordIdProblems(v, IDS), ...recordIdProblems(v, IDEA_IDS, { min: 2 })]);
    check(steps.length === 18 + 3 + 6 + 3 + 4 && !ri.length, `rendered in ${name(lang)}: names, not record ids, on every step of S1, S2 and S3, on each idea's page, in every Score view, in each report and its build brief, and on the live screens (${steps.length} screens)${ri.length ? `: ${[...new Set(ri)].slice(0, 6).join("; ")}` : ""}`);
    const sw = steps.flatMap((v) => writingProblems(v));
    check(!sw.length, `rendered in ${name(lang)}: every step keeps Vici's writing rules${sw.length ? `: ${[...new Set(sw)].slice(0, 6).join("; ")}` : ""}`);
    const stores = await p.evaluate(async () => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), databases: (await indexedDB.databases()).map((d) => d.name), caches: await caches.keys(), cookie: document.cookie }));
    const sk = storedKeyProblems(stores, { prefix: "pi" });
    check(!sk.length, `rendered in ${name(lang)}: the visit leaves only the allowed keys behind (${[...stores.local, ...stores.session].join(", ") || "none"})${sk.length ? `: ${sk.join("; ")}` : ""}`);
    await context.close();
  }
  // ViciDesign's own drive of the guide, over http.
  const r = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(dir, "scripts", "check-guide-render.mjs"), server.base], { cwd: dir, env: process.env });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 240000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
  check(r.code === 0 && /GUIDE BEHAVIOUR OK/.test(r.out), `Vici's check-guide-render.mjs passes against the page over http${r.code === 0 ? "" : `: ${r.out.split("\n").filter((l) => l.trim()).slice(-6).join(" | ")}`}`);
} finally {
  await server.close();
  await browser.close();
}

// ---- every text of the string files, and the KPI library ------------------------------------------------------
for (const [lang, D] of [["en", EN], ["de", DE]]) {
  const texts = Object.values(D);
  const p = writingProblems(page(texts, lang === "de" ? "de" : "en-GB"));
  check(texts.length > 50 && !p.length, `${lang === "en" ? "English" : "German"}: the ${texts.length} texts of the string file keep the writing rules${p.length ? `: ${p.join("; ")}` : ""}`);
  const kpiTexts = [...SECTORS.map((s) => s.name[lang]), ...KPIS.flatMap((k) => [k.name[lang], k.definition[lang]])];
  const kp = writingProblems(page(kpiTexts, lang === "de" ? "de" : "en-GB"));
  check(!kp.length, `${lang === "en" ? "English" : "German"}: the KPI library's ${kpiTexts.length} names, units and definitions keep the writing rules${kp.length ? `: ${kp.join("; ")}` : ""}`);
}

// ---- the docs, as text --------------------------------------------------------------------------------------------
for (const doc of ["README.md", "TECH_NOTES.md", "REVIEW.md", "PLAN.md", "tests/README.md", "vici/README.md"]) {
  const there = existsSync(path.join(APP_ROOT, doc));
  const p = there ? writingProblems(page([read(doc).replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "")])) : ["missing"];
  check(!p.length, `${doc} keeps the writing rules${p.length ? `: ${p.join("; ")}` : ""}`);
}

// ---- vici/: Vici's files, unchanged, at the commit the README and the workflow name -------------------------------
const pin = (readIf("vici/README.md").match(/commit \*\*`([0-9a-f]{7,40})`\*\*/) || [])[1];
const ref = (readIf(".github/workflows/tests.yml").match(/repository: VictorPflueger\/ViciDesign\s+ref: ([0-9a-f]{7,40})/) || [])[1];
check(pin && ref && ref.startsWith(pin), `vici/README.md and the workflow name the same ViciDesign commit (${pin} and ${ref})`);
let head = null;
try { head = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* not a git checkout */ }
check(!head || !pin || head.startsWith(pin), `the ViciDesign checkout is at that commit (${head ? head.slice(0, 7) : "not a git checkout"})`);
const files = [];
const walkDir = (d) => { for (const f of readdirSync(path.join(APP_ROOT, d))) { const p = `${d}/${f}`; if (statSync(path.join(APP_ROOT, p)).isDirectory()) walkDir(p); else files.push(p); } };
walkDir("vici");
const ours = files.filter((f) => f !== "vici/README.md");
const differ = ours.filter((f) => { const there = path.join(dir, f.slice("vici/".length)); return !existsSync(there) || !readFileSync(there).equals(readFileSync(path.join(APP_ROOT, f))); });
check(ours.length >= 18 && !differ.length, `the ${ours.length} files in vici/ equal ViciDesign's byte for byte${differ.length ? `: ${differ.join(", ")} differ` : ""}`);
const listed = [...readIf("vici/README.md").matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]);
const unlisted = ours.filter((f) => !listed.some((l) => (l.includes("*") ? new RegExp(`^${l.replace(/[.]/g, "\\.").replace(/\*/g, "[^/]*")}$`).test(f.slice(5)) : f.slice(5) === l)));
check(!unlisted.length, `vici/README.md lists every file it holds${unlisted.length ? `: ${unlisted.join(", ")} missing` : ""}`);

let failed = 0;
const report = (results, token) => {
  const f = results.filter(([ok]) => !ok).length;
  for (const [ok, what] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  failed += f;
  return f ? null : token;
};
const tokens = [report(controls, "VICI CONTROLS OK"), report(standards, "VICI STANDARDS OK")].filter(Boolean);
console.log(`(Vici's checks from ${dir})`);
if (failed) { console.log(`\n${failed} checks failed.`); process.exit(1); }
console.log(`\nAll ${controls.length + standards.length} checks passed.\n${tokens.join("\n")}\nVICI OK`);
