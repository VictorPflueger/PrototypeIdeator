// Numbers, money and dates through Intl, in the active language (en-GB or de-DE): scores to two decimals
// ("4.75", "4,75"), the cost meter and the live-run estimates in euros with cents ("€0.30", "0,30 €"),
// one live run of a prototype to a tenth of a cent below €0.10 ("€0.004"), money at stake in short form
// ("€2.8m", "2,8 Mio. €") and as a range ("€2.0m–€6.0m", "2,0–6,0 Mio. €"), shares as whole percentages
// with a no-break space ("63 %") and dates with the month written out. Computed values stay at full
// precision; only these functions round, for display. Adapted from the Sovereignty Assessment 2.0.0
// (35c0dea): its Intl cache, no-data rule, shares, whole numbers and dates stay; scores get two decimals.
// Money at stake takes the money format of js/risk.js, which the SWOT Challenger published first and the
// four tools share (brief 4.1).

import { locale, getLang, t } from "./i18n/index.js";
import { money } from "./risk.js";

const cache = new Map();
function nf(lang, opts) {
  const key = `${lang}|${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale(lang), opts));
  return cache.get(key);
}
const has = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

/** "no figure" for a value without a basis: never shown as 0. */
export function noData(lang = getLang()) {
  return t("fact.noData", null, lang);
}

/** A weighted score out of 5, to two decimals: "4.75" or "4,75". */
export function fmtScore(value, lang = getLang()) {
  return has(value) ? nf(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) : noData(lang);
}

/**
 * A share as a whole percentage with a no-break space before the sign, as Vici's writing rule asks in both
 * languages: "92 %" (review B13; Intl writes "92%" in English).
 */
export function fmtShare(value, lang = getLang()) {
  return has(value) ? nf(lang, { style: "percent", maximumFractionDigits: 0 }).format(Number(value)).replace(/(\d)\s?%/u, "$1\u00a0%") : noData(lang);
}

/** A whole number with the language's grouping: 1,122 or 1.122. */
export function fmtInt(value, lang = getLang()) {
  return has(value) ? nf(lang, { maximumFractionDigits: 0 }).format(Math.round(Number(value))) : noData(lang);
}

/**
 * One live run of a proposed prototype, as Victor's rule prices it: to a tenth of a cent below €0.10
 * ("€0.004", "€0.025"), else cents. A per-run figure in cents read "€0.00" for a cheap idea, which looked
 * free, and didn't multiply to its twenty runs (review B3); runShown gives the number shown, which "Twenty
 * runs" multiplies. Below a twentieth of a cent it says "under €0.001".
 */
export function fmtEurRun(value, lang = getLang()) {
  if (!has(value)) return noData(lang);
  const v = Number(value);
  const eur = (x, digits) => nf(lang, { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x);
  if (v > 0 && v < 0.0005) return t("kpi.cost.under", { amount: eur(0.001, 3) }, lang);
  return eur(v, v < 0.1 ? 3 : 2);
}

/** The per-run figure as fmtEurRun shows it, as a number: what "Twenty runs" multiplies. */
export function runShown(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  return v < 0.1 ? Math.round(v * 1000) / 1000 : Math.round(v * 100) / 100;
}

/** Euros with cents, for the cost meter and the live-run estimates: "€0.30" or "0,30 €". */
export function fmtEur(value, lang = getLang()) {
  return has(value) ? nf(lang, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) : noData(lang);
}

/**
 * What a live run has spent, for the cost meter: four decimals under a cent, three under a euro, then
 * cents ("€0.0042", "€0.137", "€1.24"), so a run of Haiku requests never reads €0.00.
 */
export function fmtEurSpend(value, lang = getLang()) {
  if (!has(value)) return noData(lang);
  const v = Number(value);
  const digits = v === 0 || v >= 1 ? 2 : v < 0.01 ? 4 : 3;
  return nf(lang, { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

/**
 * Money at stake in short form, as the four tools write it: the money format of js/risk.js, shared with
 * the challengers (brief 4.1), from about €1m in millions with one decimal ("€2.8m", "2,8 Mio. €"), from
 * about €1,000 in whole thousands ("€600k", "600 Tsd. €"), below in whole euros ("€800", "800 €").
 */
export function fmtEurCompact(value, lang = getLang()) {
  return has(value) ? money(Number(value), lang) : noData(lang);
}

// The unit at the end of an amount money() wrote, so a range in German can name it once.
const DE_UNIT = /(\u00a0(?:Mio\.|Tsd\.))?\u00a0€$/u;

/** A range of money: "€2.0m–€6.0m" or "2,0–6,0 Mio. €"; across units "600 Tsd. € – 1,2 Mio. €". */
export function fmtEurRange(low, high, lang = getLang()) {
  if (!has(low) || !has(high)) return noData(lang);
  if (Number(low) === Number(high)) return fmtEurCompact(low, lang);
  const a = money(Number(low), lang);
  const b = money(Number(high), lang);
  if (lang === "de") {
    const ua = a.match(DE_UNIT)[0];
    const ub = b.match(DE_UNIT)[0];
    if (ua === ub && Number(low) >= 0) return `${a.slice(0, -ua.length)}–${b}`;
    return `${a} – ${b}`;
  }
  return `${a}–${b}`;
}

/** An amount or a range a year: "€2m–€6m a year", "2–6 Mio. € im Jahr". */
export function perYear(text, lang = getLang()) {
  return t("money.perYear", { amount: text }, lang);
}

/**
 * A date with the month written out: "19 November 2026" or "19. November 2026". A bare ISO date is read
 * as that day where the browser is, not as midnight UTC.
 */
export function fmtDate(iso, lang = getLang()) {
  const text = String(iso ?? "");
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00` : text);
  if (Number.isNaN(d.getTime())) return noData(lang);
  return d.toLocaleDateString(locale(lang), { day: "numeric", month: "long", year: "numeric" });
}
