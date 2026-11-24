// Run it live: Vici's live-run dialog (components/overlays.html#live-run), the way into a live run. Its parts
// come in Vici's order: the key, the setting, Advanced, the budget cap, the acknowledgement, the warning
// about what looks private, the estimate, and in the footer the start button with the AI notice beside it.
// The key field sits in no form and password managers leave it alone; the box is unticked at every
// opening; the start button waits for a key that looks right and the ticked box. Start checks the key
// with Anthropic's free model list (no tokens), which also says whether the chosen model is available,
// and only then hands it to js/keystore.js. Inside another page's frame the dialog refuses, so a framing
// page can't steer the clicks around the key. The first tool of the set to build the pattern into a page;
// the challengers can take this file with their own settings. Adapted from the Data Quality Agent 2.2.0's
// js/live_dialog.js (its key check and frame rule), with the presets, cap and estimate of this tool.

import { checkKey } from "./anthropic.js";
import { getKey, setKey, forgetKey, hasKey, looksLikeKey, maskKey } from "./keystore.js";
import { MODELS, PRESETS, DEFAULT_PRESET, EFFORTS, BUDGET, LIVE_MODELS } from "./config.js";
import { settingsOf } from "./pipeline.js";
import { messageOf } from "./api_messages.js";
import { t, onLang, getLang } from "./i18n/index.js";
import { fmtEur } from "./format.js";
import { clear, h } from "./dom.js";

const $ = (id) => document.getElementById(id);
const label = (id) => MODELS.find((m) => m.id === id)?.label || id;

/** True when the page runs inside another page's frame (or the browser won't say). */
export function framed() {
  try { return window.top !== window.self; } catch { return true; }
}

/** The cap's lowest value: the run's spend so far plus one step, so a run that goes on can't stop at once. */
function floorOf(spentEur) {
  const step = BUDGET.stepEur;
  return Math.max(BUDGET.minEur, Math.ceil((spentEur + 0.005) / step) * step);
}

/**
 * Opens the dialog. ctx:
 *   settings   the run's settings so far ({ preset, model, effort }), or null for Balanced
 *   capEur     the cap so far
 *   spentEur   what the run has spent (0 before the first request): the cap can't go below it
 *   estimate   (settings) → { eur: [lo, hi], seconds: [lo, hi], longPrompt } for the whole run
 *   words      { cost(eur), time(seconds) } the estimate in the page's language
 *   findings   what looks private: [{ kind, word, where }]
 *   pdfs       true when a PDF is among the files, which this page can't search
 *   last       the last live run's { eur, seconds } in this tab, or null
 *   forgetFirst  true after Anthropic rejected the key: the held one is forgotten
 * Resolves { settings, capEur } once the key passed the free check, or null when the dialog closes.
 */
export function openLiveDialog(ctx) {
  const dlg = $("live-dialog");
  const input = $("live-key");
  const show = $("live-key-show");
  const msg = $("live-key-msg");
  const current = $("live-current");
  const masked = $("live-masked");
  const forget = $("live-forget");
  const model = $("live-model");
  const effort = $("live-effort");
  const advanced = dlg.querySelector(".vc-live__advanced");
  const cap = $("live-cap");
  const capOut = $("live-cap-out");
  const ack = $("live-ack");
  const start = $("live-start");
  const estimate = $("live-estimate");
  const warning = $("live-warning");
  const list = $("live-warning-list");
  const pdfs = $("live-pdfs");
  const radios = [...dlg.querySelectorAll('input[name="live-preset"]')];
  const presetHelp = $("live-preset-help");
  const isFramed = framed();
  if (ctx.forgetFirst) forgetKey();

  // Every opening starts from the run's settings, with the box unticked and the field empty.
  const initial = ctx.settings || { preset: DEFAULT_PRESET, model: null, effort: null };
  for (const r of radios) r.checked = r.value === (PRESETS.some((p) => p.id === initial.preset) ? initial.preset : DEFAULT_PRESET);
  input.value = "";
  input.type = "password";
  show.setAttribute("aria-pressed", "false");
  ack.checked = false;
  const floor = floorOf(ctx.spentEur || 0);
  cap.min = String(floor);
  cap.value = String(Math.min(BUDGET.maxEur, Math.max(floor, ctx.capEur || BUDGET.defaultEur)));
  let checking = false;
  let busyText = "";

  const preset = () => radios.find((r) => r.checked)?.value || DEFAULT_PRESET;
  const chosen = () => settingsOf({ preset: preset(), model: model.value || null, effort: effort.value || null });
  const say = (text = "", tone = "") => { msg.textContent = text; msg.dataset.tone = tone; };

  // The first fill brings back the run's own Advanced choices; later ones keep what the person chose here.
  let first = true;
  function fillSelects() {
    const p = PRESETS.find((x) => x.id === preset());
    const own = (v, preset) => (first && v && v !== preset ? v : "");
    const keepModel = model.value || own(ctx.settings?.model, p.model);
    const keepEffort = effort.value || own(ctx.settings?.effort, p.effort);
    first = false;
    clear(model);
    model.append(h("option", { value: "" }, t("ld.asSetting", { value: label(p.model) })), ...LIVE_MODELS.map((id) => h("option", { value: id }, label(id))));
    model.value = LIVE_MODELS.includes(keepModel) ? keepModel : "";
    clear(effort);
    effort.append(h("option", { value: "" }, t("ld.asSetting", { value: t(`ld.effort.${p.effort}`) })), ...EFFORTS.map((e) => h("option", { value: e }, t(`ld.effort.${e}`))));
    effort.value = EFFORTS.includes(keepEffort) ? keepEffort : "";
  }

  function draw() {
    const lang = getLang();
    presetHelp.textContent = t(`ld.preset.help.${preset()}`);
    capOut.textContent = fmtEur(Number(cap.value), lang);
    current.hidden = !hasKey();
    masked.textContent = hasKey() ? maskKey() : "";
    // What looks private, named by its kind and where, never repeated.
    clear(list);
    for (const f of ctx.findings || []) {
      const where = f.where;
      list.append(h("li", {}, f.kind === "word" ? t("ld.warning.word", { word: f.word, where }) : t(`ld.warning.${f.kind}`, { where })));
    }
    warning.hidden = !(ctx.findings || []).length;
    pdfs.hidden = !ctx.pdfs;
    const s = chosen();
    const e = ctx.estimate(s);
    clear(estimate);
    const [costText, timeText] = [ctx.words.cost(e.eur), ctx.words.time(e.seconds)];
    const sentence = t("ld.estimate", { cost: "\u0000", time: "\u0001" });
    const [a, rest] = sentence.split("\u0000");
    const [b, c] = rest.split("\u0001");
    estimate.append(a, h("strong", {}, costText), b, h("strong", {}, timeText), c);
    if (e.longPrompt) estimate.append(" ", t("ld.estimate.long"));
    if (ctx.last) estimate.append(" ", t("ld.estimate.last", { cost: ctx.words.cost([ctx.last.eur, ctx.last.eur]), time: ctx.words.time([ctx.last.seconds, ctx.last.seconds]) }));
    if (busyText) say(busyText);
    gate();
  }

  function gate() {
    const raw = input.value.trim();
    const keyOk = raw ? looksLikeKey(raw) : hasKey();
    start.disabled = isFramed || checking || !ack.checked || !keyOk;
  }

  return new Promise((resolve) => {
    let result = null;
    const offLang = onLang(() => { fillSelects(); draw(); });

    async function go() {
      if (start.disabled) return;
      const raw = input.value.trim() || getKey() || "";
      if (!looksLikeKey(raw)) { say(t("ld.key.bad"), "error"); input.focus(); return; }
      const settings = chosen();
      checking = true;
      busyText = t("ld.key.checking");
      say(busyText);
      gate();
      const r = await checkKey(raw);
      checking = false;
      busyText = "";
      if (r.ok && !(r.missing || []).includes(settings.model)) {
        setKey(raw);
        input.value = "";
        result = { settings, capEur: Number(cap.value) };
        dlg.close("live");
        return;
      }
      if (r.ok) { say(t("ld.key.missing", { model: label(settings.model) }), "error"); gate(); return; }
      const m = messageOf({ status: r.status, type: r.error?.type, message: r.error?.message, details: r.error?.details }, { model: label(settings.model) });
      if (m.next === "key") { forgetKey(); draw(); }
      say(t(m.key, m.vars || {}), "error");
      gate();
      input.focus();
    }
    const onInput = () => { if (msg.dataset.tone === "error") say(); gate(); };
    const onKeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } };
    const onShow = () => {
      const on = input.type === "password";
      input.type = on ? "text" : "password";
      show.setAttribute("aria-pressed", String(on));
      show.setAttribute("aria-label", t(on ? "ld.key.hide" : "ld.key.show"));
      show.querySelector(".vc-icon").className = `vc-icon vc-icon--${on ? "eye-off" : "eye"}`;
    };
    const onForget = () => { forgetKey(); input.value = ""; draw(); say(t("ld.key.forgotten")); input.focus(); };
    const onPreset = () => { fillSelects(); draw(); };
    const onChange = () => draw();
    const listeners = [
      [start, "click", go], [input, "input", onInput], [input, "keydown", onKeydown], [show, "click", onShow], [forget, "click", onForget],
      [model, "change", onChange], [effort, "change", onChange], [cap, "input", onChange], [ack, "change", gate],
      ...radios.map((r) => [r, "change", onPreset])
    ];
    for (const [el, type, fn] of listeners) el.addEventListener(type, fn);
    dlg.addEventListener("close", function onClose() {
      dlg.removeEventListener("close", onClose);
      for (const [el, type, fn] of listeners) el.removeEventListener(type, fn);
      offLang?.();
      input.value = "";
      input.type = "password";
      resolve(result);
    });

    $("live-framed").hidden = !isFramed;
    for (const el of [input, show, forget, cap, ack, model, effort, ...radios]) el.disabled = isFramed;
    advanced.open = !!(ctx.settings && (ctx.settings.model !== PRESETS.find((p) => p.id === initial.preset)?.model || ctx.settings.effort !== PRESETS.find((p) => p.id === initial.preset)?.effort));
    model.value = "";
    effort.value = "";
    fillSelects();
    say(ctx.forgetFirst ? t("api.unauthorized") : "", ctx.forgetFirst ? "error" : "");
    draw();
    if (!dlg.open) dlg.showModal();
    (hasKey() || isFramed ? (radios.find((r) => r.checked) || ack) : input).focus();
  });
}
