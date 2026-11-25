// Accessibility (AC-14, brief §12), in Chromium at 1280 × 720. Adapted from the PESTEL Challenger 1.0.0's
// tests/access.mjs (its Tab rounds, its pixel test of the focus and its motion sampler), for this tool's
// steps, drawers and live run:
//   keyboard  with the keyboard alone Tidewell Lines runs from the guide that opens by itself to its
//             report: Escape closes the guide, Tab and Enter press each step's action, an issue is parked
//             at Read, an idea's page opens and closes at Ideate, an arrow key raises a weight at Score, the
//             second idea goes to first place at Shortlist, and at Report the PDF prints the report alone,
//             the HTML and ideas files download and a build brief opens and copies its first block;
//   live      a live run of Tidewell Lines' three reports against the scripted stand-in goes the same way:
//             Run it live, the drop zone (its file chooser opened with the keyboard), the number of ideas,
//             the live-run dialog (the key typed, the box ticked with Space) and each step's action to the
//             report, whose run saves as a simulation;
//   focus     on every screen of both runs, in the guide, the idea drawer, the brief's drawer and the
//             live-run dialog, every stop of the Tab order is a visible control that shows its focus: the
//             control looks different focused than not (a pixel comparison of its box, so a ring drawn by
//             an outline, a shadow or a pseudo-element counts alike), and a text field also changes its
//             border, outline or shadow; a drop zone's hidden input shows it on its label;
//   motion    with reduced motion asked for, no animation or transition runs for a millisecond or more while
//             the guide opens and closes, on any step, in the idea drawer, the weights, the brief's drawer,
//             the live intake, the live-run dialog or the agents' wait (Vici shortens them to 0.01 ms, and
//             keeps only a spinner's slow sweep, the one cue that work is happening);
//   names     on every screen every control has a name, every id is unique, every id a label or an aria
//             attribute points to exists, every picture has its alt text and every dialog its name.
// Each rule fails first on a planted mistake.
// Prints KEYBOARD RUN OK, KEYBOARD LIVE RUN OK, FOCUS VISIBLE, MOTION REDUCED, NAMES OK and ACCESS OK.
// Usage: node tests/access.mjs [keyboard|live|motion]   (the controls always run)
import path from "node:path";
import { APP_ROOT, launchBrowser, serveStatic, NETWORK_NOISE, MOCK_KEY } from "./lib/harness.mjs";
import { createFakeClaude } from "./lib/fake-claude.mjs";
import { routeStandIn } from "./lib/live-route.mjs";
import { createReport } from "./lib/report.mjs";

const parts = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (p) => !parts.length || parts.includes(p);
const r = createReport("access");
const { scenarioById } = await import(path.join(APP_ROOT, "js", "scenarios.js"));
const browser = await launchBrowser();
const server = await serveStatic(APP_ROOT, 8960 + Math.floor(Math.random() * 30));
const tokens = [];
// What each rule found across every screen, so each token speaks for both runs.
const seen = { focus: [], names: [], counts: [] };

// ---- helpers --------------------------------------------------------------------------------------------

async function open(query, { reducedMotion = "reduce", live = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion, acceptDownloads: true, locale: "en-GB" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: server.base.replace(/\/$/, "") });
  const net = live ? await routeStandIn(context, live) : null;
  if (!live) await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort("blockedbyclient"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error" && !NETWORK_NOISE.test(m.text())) errors.push(m.text()); });
  await page.goto(`${server.base}${query}`);
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  return { context, page, errors, net };
}

const stepOf = (page) => page.evaluate(() => document.querySelector("#stage .step")?.dataset.step || null);
const settled = (page, step, timeout = 30000) => page.waitForFunction((s) => document.querySelector("#stage .step")?.dataset.step === s && !document.querySelector("#turn[aria-busy]"), step, { timeout });

/** Tab until the focus is on `selector`; the number of presses, or null. */
async function tabTo(page, selector, max = 160) {
  for (let i = 1; i <= max; i += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => !!document.activeElement?.matches(sel), selector)) return i;
  }
  return null;
}

/** The focused control: what it is, whether a person can see it, and the box its focus shows on. */
const focused = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { none: true };
  const st = getComputedStyle(e);
  let box = e.getBoundingClientRect();
  // A drop zone's real input is kept out of sight and shows its focus on its label.
  if (e.matches("input") && (box.width < 4 || box.height < 4 || st.opacity === "0")) {
    const label = e.labels?.[0] || document.querySelector(`label[for="${CSS.escape(e.id)}"]`);
    if (label) box = label.getBoundingClientRect();
  }
  const hidden = !!e.closest("[hidden], dialog:not([open]), [inert]") || st.visibility === "hidden" || st.display === "none";
  const text = e.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select");
  const label = (e.getAttribute("aria-label") || e.textContent || e.getAttribute("title") || e.id || e.tagName).trim().replace(/\s+/g, " ").slice(0, 48);
  if (!e.__tabKey) e.__tabKey = (window.__tabSeq = (window.__tabSeq || 0) + 1);
  // Controls that repeat (every issue's Keep, every idea's place buttons) share a signature; a few of each
  // are measured, which keeps a round of the report's Tab order within the suite's time.
  const sig = `${e.tagName}.${String(e.className).split(/\s+/).filter((c) => !/^is-/.test(c)).sort().join(".")}|${e.dataset.action || ""}|${e.type || ""}`;
  return { none: false, key: e.__tabKey, sig, label, text, hidden, visible: box.width > 0 && box.height > 0 && !hidden,
    box: { x: box.left, y: box.top, w: box.width, h: box.height }, ring: [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.borderColor].join("|") };
});

/**
 * Whether the focus shows: the control's box, with 6 px around it, looks different focused than blurred, and
 * a text field changes its outline, shadow or border too (a caret alone does not count). The focus goes back
 * where it was, so the Tab order goes on from it.
 */
async function focusShows(page, f) {
  const vw = page.viewportSize();
  const x = Math.max(0, Math.floor(f.box.x - 6));
  const y = Math.max(0, Math.floor(f.box.y - 6));
  const clip = { x, y, width: Math.max(1, Math.min(vw.width - x, Math.ceil(f.box.w + 12))), height: Math.max(1, Math.min(vw.height - y, Math.ceil(f.box.h + 12))) };
  if (clip.width < 2 || clip.height < 2 || y >= vw.height || x >= vw.width) return { shows: false, why: "outside the window" };
  const shot = () => page.screenshot({ clip, animations: "disabled", caret: "hide" });
  const blur = () => page.evaluate(() => { const e = document.activeElement; window.__refocus = e; e.blur(); const st = getComputedStyle(e); return [st.outlineStyle, st.outlineWidth, st.outlineColor, st.boxShadow, st.borderColor].join("|"); });
  const refocus = () => page.evaluate(() => { window.__refocus?.focus({ preventScroll: true }); window.__refocus = null; });
  const on = await shot();
  const ringOff = await blur();
  const off = await shot();
  await refocus();
  let differs = !on.equals(off);
  if (!differs) {
    // Once more after a frame: a ring is sometimes painted a frame after the focus moves.
    await page.waitForTimeout(120);
    const again = await shot();
    await blur();
    const offAgain = await shot();
    await refocus();
    differs = !again.equals(offAgain);
  }
  if (!differs) return { shows: false, why: "looks the same focused and not" };
  if (f.text && f.ring === ringOff) return { shows: false, why: "a text field whose border, outline and shadow stay the same" };
  return { shows: true };
}

/**
 * One full round of the Tab order from where the focus is, until the first stop comes round again: a stop on
 * something hidden, or one whose focus does not show, is a problem.
 */
async function tabRound(page, where, { max = 260, perSig = 3 } = {}) {
  const problems = [];
  const keys = new Set();
  const sigs = new Map();
  let stops = 0;
  let first = null;
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    const f = await focused(page);
    if (f.none) continue; // the browser's own controls, between the end of the page and its start
    if (first === null) first = f.key;
    else if (f.key === first) break;
    if (keys.has(f.key)) continue;
    keys.add(f.key);
    stops += 1;
    if (!f.visible) { problems.push(`${where}: the focus lands on something hidden (${f.label})`); continue; }
    const n = (sigs.get(f.sig) || 0) + 1;
    sigs.set(f.sig, n);
    if (n > perSig) continue;
    const s = await focusShows(page, f);
    if (!s.shows) problems.push(`${where}: "${f.label}" ${s.why}`);
  }
  return { stops, problems };
}

/**
 * What runs with motion: animations and transitions that play now for a millisecond or more. Vici's reduced
 * motion shortens every animation and transition to 0.01 ms, which ends within the frame, and keeps a
 * spinner's slow sweep, the only cue that work is happening; neither counts.
 */
const moving = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.playState === "running" || a.playState === "pending")
  .map((a) => ({ a, t: a.effect?.getComputedTiming?.() || {} }))
  .filter(({ a, t }) => (t.duration || 0) >= 1 && !a.effect?.target?.closest?.(".vc-spinner"))
  .map(({ a }) => `${a.animationName || a.transitionProperty || a.constructor.name} on ${a.effect?.target?.tagName?.toLowerCase()}.${[...(a.effect?.target?.classList || [])].slice(0, 2).join(".")}`));

/** Samples motion right after a move and a little later, since a transition may start a frame late. */
async function motionAfter(page, where, out) {
  for (const wait of [0, 40, 160]) {
    if (wait) await page.waitForTimeout(wait);
    for (const m of await moving(page)) out.add(`${where}: ${m}`);
  }
}

/** Names, ids, references, pictures and dialogs on the page as it stands: the problems, or none. */
const nameProblems = (page) => page.evaluate(() => {
  const out = [];
  const shown = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !e.closest("[hidden], dialog:not([open])"); };
  const byId = (id) => document.getElementById(id);
  const textOf = (e) => (e?.textContent || "").replace(/\s+/g, " ").trim();
  const nameOf = (e) => {
    const lb = e.getAttribute("aria-labelledby");
    if (lb) return lb.split(/\s+/).map((id) => textOf(byId(id))).join(" ").trim();
    if (e.getAttribute("aria-label")?.trim()) return e.getAttribute("aria-label").trim();
    if (e.matches("input, select, textarea")) {
      if (e.id) { const l = document.querySelector(`label[for="${CSS.escape(e.id)}"]`); if (l && textOf(l)) return textOf(l); }
      const wrap = e.closest("label"); if (wrap && textOf(wrap)) return textOf(wrap);
      return (e.getAttribute("title") || e.getAttribute("placeholder") || "").trim();
    }
    const alt = [...e.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ");
    return (textOf(e) || alt || e.getAttribute("title") || "").trim();
  };
  // A print copy carries suffixed ids of its own; it is not on screen.
  const live = (e) => !e.closest("body > [data-vc-print]");
  for (const e of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1']), [role=button], [role=tab], [role=radio], [role=checkbox]")) {
    if (!live(e) || !shown(e)) continue;
    if (!nameOf(e)) out.push(`a ${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${e.className ? `.${String(e.className).split(" ")[0]}` : ""} has no name`);
  }
  const ids = new Map();
  for (const e of document.querySelectorAll("[id]")) if (live(e)) ids.set(e.id, (ids.get(e.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) out.push(`the id "${id}" is used ${n} times`);
  for (const e of document.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], label[for]")) {
    if (!live(e)) continue;
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "for"]) {
      for (const id of (e.getAttribute(attr) || "").split(/\s+/).filter(Boolean)) if (!byId(id)) out.push(`${attr}="${id}" on a ${e.tagName.toLowerCase()} points to nothing`);
    }
  }
  for (const img of document.querySelectorAll("img")) if (live(img) && !img.hasAttribute("alt")) out.push(`a picture without alt text (${img.getAttribute("src")})`);
  for (const d of document.querySelectorAll("dialog[open]")) if (!nameOf(d) && !d.getAttribute("aria-labelledby")) out.push(`an open dialog without a name (${d.id})`);
  if (!document.documentElement.lang) out.push("the page names no language");
  return out;
});

/** A Tab round and the names on the screen as it stands, recorded under `where`. */
async function audit(page, where) {
  const t = await tabRound(page, where);
  seen.focus.push(...t.problems);
  seen.counts.push(`${where} ${t.stops}`);
  seen.names.push(...(await nameProblems(page)).map((p) => `${where}: ${p}`));
  return t;
}

/** Enter on the step's action (#btn-cta), reached with Tab. */
async function pressCta(page, where) {
  if (await tabTo(page, "#btn-cta:not([disabled])") === null) throw new Error(`Tab never reaches the action at ${where}`);
  const label = await page.evaluate(() => document.activeElement.textContent.trim());
  await page.keyboard.press("Enter");
  return label;
}

/** The print dialog stood in for: beforeprint, whether the report alone is in the print copy, afterprint. */
const standInPrint = (page) => page.evaluate(() => {
  window.__printed = null;
  window.print = () => { dispatchEvent(new Event("beforeprint")); window.__printed = !!document.querySelector("body > [data-vc-print] .vc-report"); dispatchEvent(new Event("afterprint")); };
});

try {
  // ---- controls: each rule fails on a planted mistake first -----------------------------------------------
  {
    const { context, page } = await open("?guide=0&lang=en&scenario=s1");
    // Focus: a button whose focus ring is taken away, through the CSS object model the page's policy allows.
    await page.evaluate(() => {
      const b = document.getElementById("btn-play");
      b.style.setProperty("outline", "none", "important");
      b.style.setProperty("box-shadow", "none", "important");
    });
    const toPlay = await tabTo(page, "#btn-play");
    const planted = toPlay ? await focusShows(page, await focused(page)) : { shows: true };
    const toCta = await tabTo(page, "#btn-cta");
    const clean = toCta ? await focusShows(page, await focused(page)) : { shows: false };
    r.control(toPlay && toCta && !planted.shows && clean.shows, `a control without its focus ring is caught (${planted.why || "missed"}), one with it passes`);
    // Names: a button without a name, a second id, a reference to nothing and a picture without alt text.
    await page.evaluate(() => {
      const extra = document.createElement("div");
      const b = document.createElement("button"); b.type = "button"; b.className = "vc-button"; b.append(document.createElement("span"));
      const dup = document.createElement("span"); dup.id = "btn-cta"; dup.textContent = "x";
      const dangling = document.createElement("button"); dangling.type = "button"; dangling.textContent = "y"; dangling.setAttribute("aria-describedby", "nowhere");
      const img = document.createElement("img"); img.src = "favicon.svg"; img.width = 20; img.height = 20;
      extra.append(b, dup, dangling, img);
      document.getElementById("stage").prepend(extra);
    });
    const names = await nameProblems(page);
    const caught = ["has no name", 'id "btn-cta"', "points to nothing", "without alt text"].filter((x) => names.some((p) => p.includes(x)));
    r.control(caught.length === 4, `a nameless button, a second id, a reference to nothing and a picture without alt text are caught (${caught.length} of 4)`);
    await context.close();
  }
  {
    // Motion: without reduced motion something moves as the guide opens or a step changes, and the sampler sees it.
    const { context, page } = await open("?lang=en&scenario=s1", { reducedMotion: "no-preference" });
    const moved = new Set();
    await motionAfter(page, "the guide opening", moved);
    await page.keyboard.press("Escape");
    await motionAfter(page, "the guide closing", moved);
    await page.click("#btn-cta");
    await motionAfter(page, "after Start", moved);
    await page.click('[data-action="open-idea"]').catch(() => {});
    await motionAfter(page, "a drawer opening", moved);
    r.control(moved.size > 0, `without reduced motion the sampler sees what moves (${[...moved].slice(0, 2).join("; ") || "nothing"})`);
    await context.close();
  }

  // ---- keyboard: Tidewell Lines from the guide to its report ------------------------------------------------
  if (want("keyboard")) {
    const { context, page, errors } = await open("?lang=en&scenario=s1");
    const way = [];
    const problems = [];
    try {
      await page.waitForSelector("#guide-en[open]", { timeout: 8000 });
      await audit(page, "the guide");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog[open]"));
      way.push("guide closed with Escape");
      // Start.
      await audit(page, "start");
      way.push(`start: ${await pressCta(page, "start")}`);
      await settled(page, "read");
      // Read: park the first kept issue with Enter on its Park button, then find the ideas.
      await audit(page, "read");
      const { parkedId, parkedTitle } = await page.evaluate(() => { const row = document.querySelector(".issue-row--kept"); return { parkedId: row?.dataset.issue, parkedTitle: row?.querySelector(".issue-title")?.firstChild?.textContent.trim() }; });
      if (await tabTo(page, `tr[data-issue="${parkedId}"] [data-action="decide-park"]`) === null) throw new Error("Tab never reaches an issue's Park");
      await page.keyboard.press("Enter");
      await page.waitForFunction((id) => !!document.querySelector(`tr[data-issue="${id}"].issue-row--parked`), parkedId, { timeout: 5000 });
      const kept = await page.evaluate(() => document.activeElement?.dataset.action === "decide-park");
      way.push(`read: issue ${parkedId} parked${kept ? ", the focus stays on Park" : ", the focus is lost"}`);
      if (!kept) problems.push("read: after Park the focus is not on the Park button");
      way.push(`read: ${await pressCta(page, "read")}`);
      await settled(page, "ideate");
      // Ideate: open the first idea's page, look round it, close it with Escape.
      await audit(page, "ideate");
      if (await tabTo(page, '#stage [data-action="open-idea"]') === null) throw new Error("Tab never reaches an idea");
      const ideaName = await page.evaluate(() => document.activeElement.textContent.trim());
      await page.keyboard.press("Enter");
      await page.waitForSelector("#idea-drawer[open]", { timeout: 5000 });
      await page.waitForTimeout(150);
      await audit(page, "the idea drawer");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog[open]"));
      const back = await page.evaluate(() => document.activeElement?.dataset.action === "open-idea");
      way.push(`ideate: "${ideaName.slice(0, 24)}" opened and closed${back ? ", the focus back on its cell" : ""}`);
      if (!back) problems.push("ideate: closing the idea's page does not return the focus to its cell");
      way.push(`ideate: ${await pressCta(page, "ideate")}`);
      await settled(page, "score");
      // Score: open the weights and raise business value with the right arrow.
      await audit(page, "score");
      if (await tabTo(page, "#btn-weights") === null) throw new Error("Tab never reaches the weights");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#w-value");
      await audit(page, "score with the weights");
      if (await tabTo(page, "#w-value") === null) throw new Error("Tab never reaches business value's slider");
      const before = await page.evaluate(() => document.getElementById("w-value").value);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.getElementById("w-value")?.value);
      way.push(`score: business value ${before} to ${after} %`);
      if (Number(after) <= Number(before)) problems.push(`score: the right arrow did not raise the weight (${before} to ${after})`);
      way.push(`score: ${await pressCta(page, "score")}`);
      await settled(page, "shortlist");
      // Shortlist: the second idea in the table to first place.
      await audit(page, "shortlist");
      const second = await page.evaluate(() => document.querySelectorAll(".pick-table tbody tr")[1]?.dataset.idea);
      if (await tabTo(page, `.pick-table tr[data-idea="${second}"] [data-action="place"][data-place="1"]`) === null) throw new Error("Tab never reaches the second idea's first place");
      await page.keyboard.press("Enter");
      await page.waitForFunction((id) => document.querySelector(`.pick-table tr[data-idea="${id}"] [data-place="1"]`)?.getAttribute("aria-pressed") === "true", second, { timeout: 5000 });
      const firstName = await page.evaluate((id) => document.querySelector(`.pick-table tr[data-idea="${id}"] .pick-idea .link-button`).textContent.trim(), second);
      way.push(`shortlist: "${firstName.slice(0, 24)}" to first place`);
      way.push(`shortlist: ${await pressCta(page, "shortlist")}`);
      await settled(page, "report");
      // Report: the choices made by keyboard carry through: the parked issue is listed as parked, and the
      // Top score tile names the new first pick.
      const rep = await page.evaluate(() => ({
        top: document.getElementById("kpi-top")?.textContent.replace(/\s+/g, " ") || "",
        parked: [...document.querySelectorAll("#report-doc .rep-parked li strong")].map((x) => x.textContent.trim())
      }));
      if (!rep.top.includes(firstName)) problems.push(`report: the Top score tile does not name the first pick "${firstName}" (${rep.top.slice(0, 80)})`);
      if (!rep.parked.includes(parkedTitle)) problems.push(`report: "${parkedTitle}" is not listed as parked (${rep.parked.join(", ") || "none"})`);
      way.push(`report: "${String(parkedTitle).slice(0, 24)}" listed as parked, the Top score tile on "${firstName.slice(0, 24)}"`);
      await audit(page, "report");
      // Save as PDF, then the HTML and ideas files, by keyboard.
      await standInPrint(page);
      await pressCta(page, "report");
      await page.waitForFunction(() => window.__printed !== null, null, { timeout: 5000 }).catch(() => {});
      const printed = await page.evaluate(() => window.__printed);
      const downloads = [];
      for (const action of ["download-html", "download-json"]) {
        if (await tabTo(page, `[data-action="${action}"]`) === null) { problems.push(`report: Tab never reaches ${action}`); continue; }
        const [d] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), page.keyboard.press("Enter")]);
        if (d) downloads.push(d.suggestedFilename());
      }
      way.push(`report: PDF ${printed ? "printed alone" : "not printed"}, ${downloads.join(" and ") || "no download"}`);
      if (printed !== true) problems.push("report: Enter on Save as PDF does not print the report alone");
      if (!downloads.some((f) => f.endsWith(".html")) || !downloads.some((f) => f.endsWith(".json"))) problems.push(`report: the HTML and ideas files do not both download (${downloads.join(", ")})`);
      // The build brief: open it, copy its first block, look round it, close it.
      if (await tabTo(page, "#btn-brief") === null) throw new Error("Tab never reaches Write a build brief");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#brief-drawer[open]", { timeout: 5000 });
      await page.waitForTimeout(200);
      const onCopy = await page.evaluate(() => document.activeElement?.id || "");
      if (!/^brief-copy-/.test(onCopy) && await tabTo(page, '[id^="brief-copy-"]') === null) throw new Error("Tab never reaches a Copy button in the brief");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      const copied = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
      way.push(`brief: opened on ${onCopy || "the drawer"}, ${copied.length} characters copied`);
      if (copied.length < 200 || !/victorpflueger\.github\.io\/ViciDesign/.test(copied)) problems.push(`brief: Enter on Copy did not copy the block (${copied.length} characters)`);
      await audit(page, "the brief's drawer");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    } catch (e) {
      problems.push(`the run stopped: ${String(e.message || e).split("\n")[0]}`);
    }
    const atReport = (await stepOf(page)) === "report";
    r.check(atReport && !problems.length && !errors.length, `keyboard: Tidewell Lines runs from its guide to the report with Escape, Tab, Enter and an arrow key: ${way.join(" → ")}${problems.length ? `; ${problems.join("; ")}` : ""}${errors.length ? `; page errors: ${errors.slice(0, 2).join("; ")}` : ""}`);
    if (atReport && !problems.length && !errors.length) tokens.push("KEYBOARD RUN OK");
    await context.close();
  }

  // ---- live: Tidewell Lines' three reports against the stand-in, by keyboard -----------------------------
  if (want("live")) {
    const sc = scenarioById("s1");
    const a = sc.answers.en;
    const fake = createFakeClaude([{ answer: a.merges }, { answer: a.ideas }, { answer: a.recommendation }]);
    const { context, page, errors } = await open("?guide=0&lang=en", { live: fake });
    const way = [];
    const problems = [];
    try {
      if (await tabTo(page, "#btn-live") === null) throw new Error("Tab never reaches Run it live");
      await page.keyboard.press("Enter");
      await page.waitForSelector("#intake-files");
      await page.waitForTimeout(150);
      await audit(page, "the live intake");
      // The drop zone: its file chooser opens on Space, as the browser's own file field does.
      if (await tabTo(page, "#intake-files") === null) throw new Error("Tab never reaches the drop zone");
      const files = sc.documents.filter((d) => d.kind === "handoff").map((d) => ({ name: d.name.en, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sc.files[d.id].en, null, 2)) }));
      const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 5000 }), page.keyboard.press("Space")]);
      await chooser.setFiles(files);
      await page.waitForFunction((n) => document.querySelectorAll("[data-file]").length >= n, files.length, { timeout: 5000 });
      way.push(`drop zone: ${files.length} files chosen`);
      await audit(page, "the live intake with files");
      // The number of ideas: typed into the field.
      if (await tabTo(page, "#intake-count") === null) throw new Error("Tab never reaches the number of ideas");
      await page.keyboard.type(String(a.ideas.ideas.length));
      const count = await page.$eval("#intake-count", (s) => s.value);
      way.push(`${count} ideas`);
      if (count !== String(a.ideas.ideas.length)) problems.push(`the number of ideas reads ${count}`);
      way.push(`start: ${await pressCta(page, "the live intake")}`);
      await page.waitForSelector("#live-dialog[open]");
      await page.waitForTimeout(250);
      await audit(page, "the live-run dialog");
      if (await tabTo(page, "#live-key") === null) throw new Error("Tab never reaches the key");
      await page.keyboard.type(MOCK_KEY);
      if (await tabTo(page, "#live-ack") === null) throw new Error("Tab never reaches the box");
      await page.keyboard.press("Space");
      if (await tabTo(page, "#live-start:not([disabled])") === null) throw new Error("Tab never reaches an enabled Start the live run");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => !document.querySelector("#live-dialog[open]"), null, { timeout: 10000 });
      way.push("dialog: key typed, box ticked with Space, started");
      await settled(page, "read");
      for (const step of ["read", "ideate", "score", "shortlist"]) {
        await settled(page, step);
        await audit(page, `live ${step}`);
        way.push(`${step}: ${await pressCta(page, `live ${step}`)}`);
      }
      await settled(page, "report");
      await page.waitForSelector(".live-measured", { timeout: 10000 });
      await audit(page, "live report");
      if (await tabTo(page, '[data-action="save-run"]') === null) throw new Error("Tab never reaches Save run as simulation");
      const [d] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), page.keyboard.press("Enter")]);
      way.push(`report: ${d ? d.suggestedFilename() : "no saved run"}`);
      if (!d || !/-run\.json$/.test(d.suggestedFilename())) problems.push("report: Enter on Save run as simulation downloads nothing");
    } catch (e) {
      problems.push(`the live run stopped: ${String(e.message || e).split("\n")[0]}`);
    }
    const atReport = (await stepOf(page)) === "report";
    const requests = fake.requests.length;
    r.check(atReport && requests === 3 && !problems.length && !errors.length, `keyboard: a live run goes from Run it live through the drop zone, the number of ideas and the live-run dialog to its report, with ${requests} requests to the stand-in: ${way.join(" → ")}${problems.length ? `; ${problems.join("; ")}` : ""}${errors.length ? `; page errors: ${errors.slice(0, 2).join("; ")}` : ""}`);
    if (atReport && requests === 3 && !problems.length && !errors.length) tokens.push("KEYBOARD LIVE RUN OK");
    await context.close();
  }

  if (want("keyboard") || want("live")) {
    r.check(!seen.focus.length, `focus: every stop of the Tab order shows its focus (${seen.counts.join(", ")})${seen.focus.length ? `; ${seen.focus.slice(0, 8).join("; ")}` : ""}`);
    if (!seen.focus.length && seen.counts.length) tokens.push("FOCUS VISIBLE");
    r.check(!seen.names.length, `names: every control has a name, every id is unique, every reference resolves and every picture has its alt text, on ${seen.counts.length} screens${seen.names.length ? `; ${seen.names.slice(0, 8).join("; ")}` : ""}`);
    if (!seen.names.length && seen.counts.length) tokens.push("NAMES OK");
  }

  // ---- motion: nothing moves with reduced motion --------------------------------------------------------------
  if (want("motion")) {
    const moved = new Set();
    {
      const { context, page } = await open("?lang=en&scenario=s1");
      await motionAfter(page, "the guide opening", moved);
      await page.keyboard.press("Escape");
      await motionAfter(page, "the guide closing", moved);
      await page.click("#btn-cta");
      await motionAfter(page, "after Start", moved);
      await page.click('.issue-row--kept [data-action="decide-park"]');
      await motionAfter(page, "an issue parked", moved);
      await page.click("#btn-cta");
      await motionAfter(page, "after Find prototype ideas", moved);
      await page.click('#stage [data-action="open-idea"]');
      await motionAfter(page, "the idea drawer opening", moved);
      await page.keyboard.press("Escape");
      await motionAfter(page, "the idea drawer closing", moved);
      await page.click("#btn-cta");
      await motionAfter(page, "on to Score", moved);
      await page.click("#btn-weights");
      await motionAfter(page, "the weights opening", moved);
      await page.focus("#w-value");
      await page.keyboard.press("ArrowRight");
      await motionAfter(page, "a weight changed", moved);
      await page.click(`label:has(#view-table)`);
      await motionAfter(page, "the table view", moved);
      await page.click("#btn-cta");
      await motionAfter(page, "on to Shortlist", moved);
      await page.click("#btn-cta");
      await motionAfter(page, "the report written", moved);
      await page.click("#btn-brief");
      await motionAfter(page, "the brief's drawer opening", moved);
      await page.keyboard.press("Escape");
      await motionAfter(page, "the brief's drawer closing", moved);
      await page.click("#btn-play");
      await motionAfter(page, "Play from the start", moved);
      await context.close();
    }
    {
      const sc = scenarioById("s1");
      const a = sc.answers.en;
      const fake = createFakeClaude([{ answer: a.merges }, { answer: a.ideas }, { answer: a.recommendation }]);
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
      await routeStandIn(context, fake, { hold: (n) => (n === 2 ? 1500 : 0) });
      const page = await context.newPage();
      await page.goto(`${server.base}?guide=0&lang=en`);
      await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
      await page.click("#btn-live");
      await motionAfter(page, "the live intake", moved);
      const files = sc.documents.filter((d) => d.kind === "handoff").map((d) => ({ name: d.name.en, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sc.files[d.id].en, null, 2)) }));
      await page.setInputFiles("#intake-files", files);
      await motionAfter(page, "files dropped", moved);
      await page.selectOption("#intake-count", String(a.ideas.ideas.length));
      await page.click("#btn-cta");
      await page.waitForSelector("#live-dialog[open]");
      await motionAfter(page, "the live-run dialog", moved);
      await page.fill("#live-key", MOCK_KEY);
      await page.check("#live-ack");
      await page.click("#live-start");
      await settled(page, "read");
      await motionAfter(page, "the issue map drawn", moved);
      await page.click("#btn-cta");
      await page.waitForSelector("#turn[aria-busy]", { timeout: 5000 });
      await motionAfter(page, "the agents' wait", moved);
      await settled(page, "ideate");
      await motionAfter(page, "the ideas drawn", moved);
      await context.close();
    }
    r.check(!moved.size, `motion: with reduced motion nothing moves: the guide, every step, a parked issue, the idea drawer, the weights, the table, the report, the brief's drawer, Play, the live intake and dialog and the agents' wait${moved.size ? `; ${[...moved].slice(0, 6).join("; ")}` : ""}`);
    if (!moved.size) tokens.push("MOTION REDUCED");
  }
} finally {
  await browser.close();
  await server.close();
}
const all = !parts.length;
if (all && tokens.length === 5) tokens.push("ACCESS OK");
r.finish(tokens.join("\n") || "ACCESS CHECKS RAN");
