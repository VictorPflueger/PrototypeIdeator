// Fact placeholders and the fact audit (brief §5.10). The model never writes a figure the page shows as
// fact: its prose cites the engine's values through placeholders, {{fact:<key>}}, with keys the engine
// returned in this run (js/engine.js factValues), and code writes them in the run's language. Numbers
// from the documents go only into the fields made for them (money as stated, a key figure's today value).
//
// The audit runs on every model-written prose field and finds every number written outside the
// placeholders. In this order, on the text with its white space normalised:
//   1. placeholders are resolved; a key the engine didn't return is an error;
//   2. a source's address from the run's evidence is set aside, so a source can be linked;
//   3. quoted text that appears word for word in the run's evidence is set aside („…“, “…”, "…", »…«);
//   4. dates are set aside: ISO dates, and a day with a month written out ("12 March 2026", "12. März");
//   5. blocked words are reported as written: "%", percent, per cent, Prozent, fractions in words (half,
//      a third, Hälfte, Drittel, Viertel…) and counts in words above twelve, in English and German;
//   6. every other number is reported, unless it is a year (1900 to 2099) or a name with digits written
//      as the documents write it: a token with letters ("PSD2") or a number after a word ("ISO 14083",
//      "Industry 4.0").
// A refused text goes back once with its tokens; refused twice, it shows with an "Unchecked" tag.
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea), which built on Rebate Hunter's figures.js:
// steps 1 to 3 and 5 stay; block ids, lever ids and legal references go; years and dates pass.

import { t, getLang } from "./i18n/index.js";
import { fmtScore, fmtShare, fmtInt, fmtEur, fmtEurCompact, noData } from "./format.js";

/** A placeholder: {{fact:at_stake}}. */
export const FACT_RE = /\{\{fact:([A-Za-z0-9_.-]+)\}\}/g;

/**
 * A fact's value as text in a language. fact: { type, value } from engine.factValues; type eur (short
 * form, and "on 6 of 9 issues" when it rests on part of them), eur_cents, score, share, count or text.
 */
export function formatFact(fact, lang = getLang()) {
  if (!fact || fact.value === null || fact.value === undefined) {
    return fact?.type === "eur" && fact.of !== undefined ? t("kpi.atStake.none", null, lang) : noData(lang);
  }
  switch (fact.type) {
    case "eur": {
      const amount = fmtEurCompact(fact.value, lang);
      return fact.of !== undefined && fact.stated !== undefined && fact.stated < fact.of ? t("kpi.atStake.part", { amount, stated: fact.stated, of: fact.of }, lang) : amount;
    }
    case "eur_cents": return fmtEur(fact.value, lang);
    case "score": return fmtScore(fact.value, lang);
    case "share": return fmtShare(fact.value, lang);
    case "count": return fmtInt(fact.value, lang);
    default: return String(fact.value);
  }
}

/** The text with every {{fact:key}} replaced by its value; an unknown key stays as written, so it shows. */
export function renderFacts(text, values, lang = getLang()) {
  return String(text ?? "").replace(FACT_RE, (m, key) => (values && Object.hasOwn(values, key) ? formatFact(values[key], lang) : m));
}

/** White space normalised: every run of white space, no-break spaces included, becomes one space. */
export function normalise(text) {
  return String(text ?? "").replace(/\s+/gu, " ").trim();
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const L = "[\\p{L}\\p{N}]";
const NOT_BEFORE = `(?<!${L})`;
const NOT_AFTER = `(?!${L})`;

/** The run's evidence as the audit reads it: { titles, quotes, texts, urls } of the documents it read. */
export function evidenceCorpus(evidence = {}) {
  const strings = [...(evidence.titles || []), ...(evidence.quotes || []), ...(evidence.texts || [])].map(normalise).filter(Boolean);
  const urls = (evidence.urls || []).map((u) => String(u).trim()).filter(Boolean);
  return {
    strings,
    urls,
    /** The text occurs word for word in a piece of evidence. */
    contains: (s) => strings.some((e) => e.includes(s)),
    /** The phrase occurs in a piece of evidence as whole words. */
    containsWords: (s) => {
      const re = new RegExp(`${NOT_BEFORE}${esc(s)}${NOT_AFTER}`, "u");
      return strings.some((e) => re.test(e));
    }
  };
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|Januar|Februar|März|Maerz|Juni|Juli|Oktober|Dezember|Okt|Dez";
const DATE_WRITTEN = new RegExp(`${NOT_BEFORE}\\d{1,2}\\.? (?:${MONTHS})\\.?(?: \\d{4})?${NOT_AFTER}`, "gu");
const DATE_ISO = new RegExp(`${NOT_BEFORE}\\d{4}-\\d{2}-\\d{2}${NOT_AFTER}`, "gu");

// Blocked words and fractions (step 5), each a pattern on the normalised text, case ignored.
const EXCEPT = `(?![ -](?:party|parties|country|countries)${NOT_AFTER})`;
const FRACTIONS = [
  `${NOT_BEFORE}(?:two)[ -]thirds${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?:three)[ -]quarters${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?:a|one)[ -]third${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?<!once )(?:a)[ -]quarter${NOT_AFTER}${EXCEPT}`,
  `${NOT_BEFORE}(?:one)[ -]quarter${NOT_AFTER}${EXCEPT}`
];
const WORDS = [
  `${NOT_BEFORE}thirds${NOT_AFTER}`,
  `${NOT_BEFORE}quarters${NOT_AFTER}`,
  `${NOT_BEFORE}half${NOT_AFTER}(?!-)`,
  `${NOT_BEFORE}halves${NOT_AFTER}`,
  `${NOT_BEFORE}(?:percent|per cent|prozent)${NOT_AFTER}`,
  `${NOT_BEFORE}(?:hälfte|hälften)${NOT_AFTER}`,
  `${NOT_BEFORE}(?:drittel|drittels|dritteln)${NOT_AFTER}`,
  `${NOT_BEFORE}(?:viertel|viertels|vierteln)${NOT_AFTER}`,
  `%`
];
// English counts in words above twelve, with their compounds ("seventy-two") and plurals.
const EN_BIG = `${NOT_BEFORE}(?:thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)s?(?:-(?:one|two|three|four|five|six|seven|eight|nine))?(?![\\p{L}\\p{N}-])`;
// German counts in words, compounds included: a word made only of number parts that is above twelve.
const DE_PARTS = /^(?:ein|eins|eine|zwei|drei|vier|fünf|sechs|sech|sieben|sieb|acht|neun|zehn|elf|zwölf|und|zwanzig|dreißig|dreissig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend)+$/u;
const DE_BIG = /(?:zwanzig|ßig|ssig|zig|hundert|tausend)/u;
const DE_TEEN = /(?:drei|vier|fünf|sech|sieb|acht|neun)zehn$/u;
const DE_LARGE = /^(?:millionen?|milliarden?|billionen?)$/u;

/**
 * The fact audit. text: model-written prose; facts: the keys the engine returned in this run (array or
 * Set); evidence: { titles, quotes, texts, urls }. Returns { pass, tokens, unknownFacts }: the refused
 * tokens once each, as written, in the order they appear.
 */
export function auditText(text, { facts = [], evidence = {} } = {}) {
  const known = facts instanceof Set ? facts : new Set(facts);
  const corpus = evidenceCorpus(evidence);
  const src = normalise(text);
  let w = src;
  const hits = [];
  const unknownFacts = [];
  const mask = (start, length) => { w = w.slice(0, start) + " ".repeat(length) + w.slice(start + length); };
  const each = (re, fn) => { for (const m of [...w.matchAll(re)]) fn(m); };

  // 1. Placeholders: resolved against the run's facts; an unknown key is an error.
  each(new RegExp(FACT_RE.source, "g"), (m) => {
    if (!known.has(m[1]) && !unknownFacts.includes(m[1])) unknownFacts.push(m[1]);
    mask(m.index, m[0].length);
  });

  // 2. A source's address, so it can be linked.
  for (const url of corpus.urls) {
    let i = w.indexOf(url);
    while (i >= 0) { mask(i, url.length); i = w.indexOf(url, i + url.length); }
  }

  // 3. Quoted text that appears word for word in the run's evidence.
  const QUOTES = [/„([^“”„]*)[“”]/gu, /“([^”“]*)”/gu, /»([^«»]*)«/gu, /«([^«»]*)»/gu, /‚([^‘‚]*)‘/gu, /"([^"]*)"/gu];
  for (const re of QUOTES) {
    each(re, (m) => {
      const inner = normalise(m[1]);
      if (inner && corpus.contains(inner)) mask(m.index, m[0].length);
    });
  }

  // 4. Dates.
  each(DATE_ISO, (m) => mask(m.index, m[0].length));
  each(DATE_WRITTEN, (m) => mask(m.index, m[0].length));

  // 5. Blocked words and fractions, reported as written.
  for (const source of [...FRACTIONS, ...WORDS, EN_BIG]) {
    each(new RegExp(source, "giu"), (m) => { hits.push({ index: m.index, token: m[0] }); mask(m.index, m[0].length); });
  }
  each(/\p{L}+/gu, (m) => {
    const word = m[0].toLowerCase();
    if ((DE_PARTS.test(word) && (DE_BIG.test(word) || DE_TEEN.test(word))) || DE_LARGE.test(word)) {
      hits.push({ index: m.index, token: m[0] });
      mask(m.index, m[0].length);
    }
  });

  // 6. Numbers, unless a year or a name with digits written as the documents write it.
  const NUMBER = /(?<![\p{L}\p{N}])(?=[\p{L}\p{N}]*\p{N})[\p{L}\p{N}]+(?:(?<=\p{N})[.,](?=\p{N})[\p{L}\p{N}]+)*/gu;
  each(NUMBER, (m) => {
    const token = m[0];
    if (/\p{L}/u.test(token)) {
      if (corpus.containsWords(token)) return;
    } else {
      if (/^(?:19|20)\d{2}$/.test(token)) return;
      const before = src.slice(0, m.index).trimEnd();
      const prev = (before.match(/(\S+)$/) || [])[1]?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (prev && corpus.containsWords(`${prev} ${token}`)) return;
    }
    hits.push({ index: m.index, token });
  });

  hits.sort((a, b) => a.index - b.index);
  const tokens = [];
  for (const h of hits) if (!tokens.includes(h.token)) tokens.push(h.token);
  return { pass: tokens.length === 0 && unknownFacts.length === 0, tokens, unknownFacts };
}

/** A text's audit history before its first answer. */
export function auditState() {
  return { status: "new", refusals: 0, tokens: [] };
}

/**
 * The next state after an audit: "checked" when it passes; "repair" after a first refusal, with the
 * tokens to send back; "unchecked" after the second, so the text shows with the Unchecked tag.
 */
export function nextAuditState(state, result) {
  if (result.pass) return { status: "checked", refusals: state.refusals, tokens: [] };
  const refusals = state.refusals + 1;
  const tokens = [...result.tokens, ...result.unknownFacts.map((k) => `{{fact:${k}}}`)];
  return { status: refusals >= 2 ? "unchecked" : "repair", refusals, tokens };
}
