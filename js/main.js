// Entry point: sets the language, starts the presenter, installs the leave-page warning and removes the
// boot screen. The presenter is imported dynamically, so a file that fails to load is reported on the
// boot screen instead of a blank page. Browsers never run this module from file://; the boot screen
// explains that case on its own. Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): its data
// globals check goes, since this tool's data ships as modules the presenter imports.

import { initLang, applyStatic, t } from "./i18n/index.js";
import { installLeaveWarning } from "./session.js";
import { redactSecrets } from "./keystore.js";
import { APP } from "./config.js";
import { problem, watchPresses } from "./watch.js";

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
  // The chart measures its names in the page's font: if the fonts load after a chart was drawn, the step is
  // drawn once more with their real widths.
  document.fonts?.ready?.then(() => { if (document.querySelector("#stage svg.score-chart")) presenter.presenter?.render(); }).catch(() => {});
  installLeaveWarning(window);
  document.documentElement.dataset.boot = "ready";
  const el = document.getElementById("boot");
  el.dataset.state = "done";
  setTimeout(() => el.remove(), 300);
  // A last resort: an error the page did not expect says so on screen and stays until it is closed, with
  // where it happened and anything shaped like a key taken out; a press that something else catches says so.
  const where = () => {
    const st = presenter.presenter?.state;
    return st ? `${APP.version}, ${st.mode}, ${presenter.STEPS?.[st.step] || st.step}` : APP.version;
  };
  window.addEventListener("error", (e) => problem(e.message || e.error?.message, where()));
  window.addEventListener("unhandledrejection", (e) => { if (e.reason?.name !== "AbortError" && typeof e.reason !== "symbol") problem(e.reason?.message || e.reason, where()); });
  watchPresses(document);
}
