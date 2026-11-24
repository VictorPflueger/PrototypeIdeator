// What usually is private, looked for before a live run (brief §5.10, AC-11): e-mail addresses, phone
// numbers, IBANs and words such as "confidential", "internal", "vertraulich" and "intern". The page warns
// and does not block: the person removes the file or the words, or confirms that what they entered is
// public. What was found is named by its kind and where, never repeated, so the warning itself shows
// nothing private. Pure: the live dialog and the tests call the same functions.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// A phone number starts with + or a 0 and runs to seven to fifteen digits with spaces, dashes, dots, slashes
// or brackets between them; a year, a date, an amount or a standard's number doesn't start that way.
const PHONE = /(?<![\w+])(?:\+\d{1,3}[\s.\-/]?(?:\(0\)[\s.\-/]?)?|\(?0)\d[\d\s.\-/()]{5,17}\d(?![\w])/g;
const IBAN = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g;
const WORDS = [
  ["confidential", /\bconfidential\b/i],
  ["internal", /\binternal(?:[ -]only| use)?\b/i],
  ["vertraulich", /\b(?:streng )?vertraulich(?:e|er|es|en)?\b/i],
  ["intern", /\bintern(?:e|er|es|en)?\b/i],
  ["proprietary", /\bproprietary\b/i],
  ["not for distribution", /\bnot for (?:distribution|circulation)\b/i],
  ["nur für den Dienstgebrauch", /\bnur für den (?:internen )?(?:Dienst)?gebrauch\b/i]
];

/** True when an IBAN-shaped text passes the mod-97 check, so a code that only looks like one stays quiet. */
export function ibanValid(raw) {
  const s = String(raw).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

/** The digits of a phone-shaped text: seven to fifteen, and not a date such as 2026-11-24. */
function phoneLike(match) {
  const digits = match.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(match.trim())) return false;
  return true;
}

/**
 * What looks private in one text: [{ kind: email | phone | iban | word, word? }], each kind and word once.
 * The values themselves are not returned.
 */
export function findPrivate(text) {
  const s = String(text ?? "");
  const out = [];
  const ibans = (s.match(IBAN) || []).filter(ibanValid);
  // An IBAN's digits are no phone number: they are taken out before the phone numbers are looked for.
  const rest = ibans.reduce((acc, i) => acc.split(i).join(" "), s);
  if ((rest.match(EMAIL) || []).length) out.push({ kind: "email" });
  if ((rest.match(PHONE) || []).some(phoneLike)) out.push({ kind: "phone" });
  if (ibans.length) out.push({ kind: "iban" });
  for (const [word, re] of WORDS) if (re.test(s)) out.push({ kind: "word", word });
  return out;
}

/**
 * What looks private across what the person entered: sources is [{ where, text }] (a file's name or a
 * field's label, and its text). Returns [{ kind, word, where }], in the order of the sources.
 */
export function privateFindings(sources) {
  const out = [];
  for (const { where, text } of sources || []) for (const f of findPrivate(text)) out.push({ ...f, where });
  return out;
}
