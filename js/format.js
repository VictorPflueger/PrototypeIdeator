// Numbers, money and dates through Intl, in the active language (en-GB or de-DE): scores to two decimals
// ("4.75", "4,75"), the cost meter and the live-run estimates in euros with cents ("€0.30", "0,30 €"),
// money at stake in short form ("€2.8m", "2,8 Mio. €") and as a range ("€2.0m–€6.0m", "2,0–6,0 Mio. €"),
// shares as whole percentages and dates with the month written out. Computed values stay at full
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
