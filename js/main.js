// Entry point: sets the language, starts the presenter, installs the leave-page warning and removes the
// boot screen. The presenter is imported dynamically, so a file that fails to load is reported on the
// boot screen instead of a blank page. Browsers never run this module from file://; the boot screen
// explains that case on its own. Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): its data
// globals check goes, since this tool's data ships as modules the presenter imports.

import { initLang, applyStatic, t } from "./i18n/index.js";
import { installLeaveWarning } from "./session.js";
import { redactSecrets } from "./keystore.js";
import { APP } from "./config.js";

boot().catch((err) => {
  console.error(`[${APP.name}] Start-up failed:`, redactSecrets(String(err?.stack || err)));
  const el = document.getElementById("boot");
  if (!el) return;
  el.dataset.state = "failed";
  document.getElementById("boot-status").textContent = t("p.boot.failed");
  const detail = document.getElementById("boot-detail");
  detail.textContent = redactSecrets(String(err?.message || err));
  detail.hidden = false;
});

async function boot() {
  // English unless ?lang= or the visitor's last choice says German (js/lang.js has read the same).
  initLang();
  applyStatic();
  let presenter;
  try {
    presenter = await import("./presenter.js");
  } catch (err) {
    throw new Error(t("p.boot.module", { error: String(err?.message || err) }));
  }
  await presenter.start();
  installLeaveWarning(window);
  document.documentElement.dataset.boot = "ready";
  const el = document.getElementById("boot");
  el.dataset.state = "done";
  setTimeout(() => el.remove(), 300);
  // A last resort: an error the page did not expect says so on screen, with anything shaped like a key
  // taken out.
  const report = (message) => {
    if (!message || message === "Script error.") return;
    window.Vici?.toast?.({ title: t("p.error.title"), message: redactSecrets(String(message)).slice(0, 200), tone: "danger" });
  };
  window.addEventListener("error", (e) => report(e.message || e.error?.message));
  window.addEventListener("unhandledrejection", (e) => { if (e.reason?.name !== "AbortError" && typeof e.reason !== "symbol") report(e.reason?.message || e.reason); });
}
