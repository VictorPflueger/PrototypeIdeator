// The presenter. Version 0.1.0 holds the frame: the EN and DE switch, which changes every text on the page
// without a reload and shows the guide of the language on screen; the first step's Your turn bar, which
// opens that guide; and Run it live, which says that live runs come with version 0.3.0 and sends
// nothing. From version 0.2.0 it adds the six steps, Play and the key figures that answer first, taken
// from the Data Quality Agent 2.2.0's app.js with the Sovereignty Assessment's language switch.

import { setLang, getLang, onLang, t } from "./i18n/index.js";

const LANGS = ["en", "de"];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/** Starts the page. */
export async function start() {
  for (const button of $$(".lang-option")) button.addEventListener("click", () => switchTo(button.dataset.lang));
  $("#turn-primary")?.addEventListener("click", () => openGuide());
  $("#btn-live")?.addEventListener("click", () => liveLater());
  showLang(getLang());
  onLang(showLang);
}

function switchTo(lang) {
  if (!LANGS.includes(lang) || lang === getLang()) return;
  setLang(lang);
  announce(t("p.lang.now"));
}

/** What changes with the language beyond the texts: html lang, the pressed button, the guide's button. */
function showLang(lang) {
  const root = document.documentElement;
  root.setAttribute("lang", lang === "de" ? "de" : "en-GB");
  root.dataset.lang = lang;
  for (const button of $$(".lang-option")) button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  for (const l of LANGS) {
    const opener = $(`[data-vc-guide-open="guide-${l}"]`);
    if (opener) opener.hidden = l !== lang;
  }
}

/** Opens the How it works guide in the page's language, at its first chapter. */
function openGuide() {
  const id = `guide-${getLang()}`;
  if (window.Vici?.guide?.open) window.Vici.guide.open(id);
  else $(`[data-vc-guide-open="${id}"]`)?.click();
}

/** Run it live, before version 0.3.0: says so on screen and to screen readers. Nothing is sent. */
function liveLater() {
  const title = t("p.live.later.title");
  const message = t("p.live.later.message");
  window.Vici?.toast?.({ title, message, tone: "info" });
  announce(`${title}. ${message}`);
}

function announce(text) {
  const el = $("#announce");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = text; });
}
