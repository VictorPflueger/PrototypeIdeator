// Numbers, money and dates through Intl, in the active language (en-GB or de-DE): scores to two decimals
// ("4.75", "4,75"), the cost meter and the live-run estimates in euros with cents ("€0.30", "0,30 €"),
// money at stake in short form ("€2.8m", "2,8 Mio. €") and as a range ("€2m–€6m", "2–6 Mio. €"), shares
// as whole percentages and dates with the month written out. Computed values stay at full precision; only
// these functions round, for display. Adapted from the Sovereignty Assessment 2.0.0 (35c0dea): its Intl
// cache, no-data rule, shares, whole numbers and dates stay; scores get two decimals and the money
// formats are new. They move to the challengers' js/risk.js once one publishes it (PLAN.md §6.3).

import { locale, getLang, t } from "./i18n/index.js";

const NBSP = " ";
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

/** A share as a whole percentage: "92%" in English, "92 %" in German. */
export function fmtShare(value, lang = getLang()) {
  return has(value) ? nf(lang, { style: "percent", maximumFractionDigits: 0 }).format(Number(value)) : noData(lang);
}

/** A whole number with the language's grouping: 1,122 or 1.122. */
export function fmtInt(value, lang = getLang()) {
  return has(value) ? nf(lang, { maximumFractionDigits: 0 }).format(Math.round(Number(value))) : noData(lang);
}

/** Euros with cents, for the cost meter and the live-run estimates: "€0.30" or "0,30 €". */
export function fmtEur(value, lang = getLang()) {
  return has(value) ? nf(lang, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value)) : noData(lang);
}

// The short form of an amount: its scale and the number to show, rounded with whole numbers so that
// 9,450,000 shows as 9.5 million, not 9.4 (9.45 has no exact binary value).
function scaleOf(value) {
  const a = Math.abs(value);
  if (a >= 999_950_000) return "bn";
  if (a >= 999_500) return "m";
  if (a >= 1000) return "k";
  return "";
}
function shortNumber(value, scale) {
  if (scale === "bn") { const tenths = Math.round(value / 1e8); return Math.abs(tenths) >= 1000 ? Math.round(value / 1e9) : tenths / 10; }
  if (scale === "m") { const tenths = Math.round(value / 1e5); return Math.abs(tenths) >= 1000 ? Math.round(value / 1e6) : tenths / 10; }
  if (scale === "k") return Math.round(value / 1e3);
  return Math.round(value);
}
const UNIT_DE = { bn: "Mrd.", m: "Mio.", k: "Tsd.", "": "" };
const UNIT_EN = { bn: "bn", m: "m", k: "k", "": "" };
function shortParts(value, lang) {
  const scale = scaleOf(value);
  const n = nf(lang, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(shortNumber(value, scale));
  return { scale, n };
}

/** Money at stake in short form: "€2.8m", "€600k", "€800"; "2,8 Mio. €", "600 Tsd. €", "800 €". */
export function fmtEurCompact(value, lang = getLang()) {
  if (!has(value)) return noData(lang);
  const { scale, n } = shortParts(Number(value), lang);
  if (lang === "de") return scale ? `${n}${NBSP}${UNIT_DE[scale]}${NBSP}€` : `${n}${NBSP}€`;
  return `€${n}${UNIT_EN[scale]}`;
}

/** A range of money: "€2m–€6m" or "2–6 Mio. €"; across scales "€600k–€1.2m" or "600 Tsd. € – 1,2 Mio. €". */
export function fmtEurRange(low, high, lang = getLang()) {
  if (!has(low) || !has(high)) return noData(lang);
  if (Number(low) === Number(high)) return fmtEurCompact(low, lang);
  if (lang === "de") {
    const a = shortParts(Number(low), lang), b = shortParts(Number(high), lang);
    if (a.scale === b.scale && Number(low) >= 0) return a.scale ? `${a.n}–${b.n}${NBSP}${UNIT_DE[a.scale]}${NBSP}€` : `${a.n}–${b.n}${NBSP}€`;
    return `${fmtEurCompact(low, lang)} – ${fmtEurCompact(high, lang)}`;
  }
  return `${fmtEurCompact(low, lang)}–${fmtEurCompact(high, lang)}`;
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
