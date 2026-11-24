// What the page does when it can't do what was asked, so a person never clicks into silence. An error says
// so on screen and stays until it is closed; the same message shows once. A modal dialog that is open but
// can't be seen would leave the whole page dead: the first press closes it and says so. A press that lands
// on something this page didn't draw, such as an extension's layer over the page, names what caught it.
// Nothing here is stored or sent, and anything shaped like a key is taken out of what is shown.

import { t } from "./i18n/index.js";
import { redactSecrets } from "./keystore.js";

const shown = new Set();

/** A problem on screen: Vici's danger toast, kept until closed, once per message. detail: what it rests on. */
export function problem(message, detail = "") {
  const text = redactSecrets(String(message || "")).trim().slice(0, 240);
  if (!text || text === "Script error.") return null;
  const extra = redactSecrets(String(detail || "")).trim().slice(0, 160);
  const key = `${text}|${extra}`;
  if (shown.has(key)) return null;
  shown.add(key);
  return window.Vici?.toast?.({ title: t("p.error.title"), message: extra ? `${text} (${extra})` : text, tone: "danger", duration: 0 }) || null;
}

/** The page's own parts, as index.html draws them; anything else is not this page's. */
const OWN = "body > .vc-skip-link, body > .app-header, body > .intro, body > .stepbar, body > #announce, body > #stage, body > dialog, body > #boot, body > .vc-toast-region";

/** An element as a short label: tag, id and the first class. */
const label = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : ""}`;

/** Rendered at all: a box on the page and not hidden. Opacity doesn't count, so an opening dialog does. */
const rendered = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

/**
 * Watches every press before the page handles it. A modal dialog open but not rendered is closed; a press
 * on something foreign that covers at least a quarter of the window is named. Returns a function that stops.
 */
export function watchPresses(doc = document) {
  const onDown = (e) => {
    const modal = [...doc.querySelectorAll("dialog[open]")].find((d) => d.matches(":modal"));
    if (modal && !rendered(modal)) {
      modal.close();
      problem(t("p.error.hiddenDialog"), label(modal));
      return;
    }
    const el = e.target instanceof Element ? e.target : null;
    if (!el || el === doc.documentElement || el === doc.body || el.closest(OWN)) return;
    const r = el.getBoundingClientRect();
    const view = doc.defaultView;
    if (r.width * r.height >= 0.25 * view.innerWidth * view.innerHeight) problem(t("p.error.covered"), label(el));
  };
  doc.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  return () => doc.removeEventListener("pointerdown", onDown, { capture: true });
}
