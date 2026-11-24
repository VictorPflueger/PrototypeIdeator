// The private-data warning (brief §5.10, AC-11), in Node: planted e-mail addresses, phone numbers, IBANs and
// keywords in English and German are found, each named by its kind and where it stands and never repeated;
// clean business text with years, dates, amounts, percentages, a standard's number and page numbers says
// nothing; an IBAN-shaped code that fails its checksum stays quiet.
// Prints PRIVACY OK.
// Usage: node tests/privacy.mjs
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";
import { createReport } from "./lib/report.mjs";

const { findPrivate, privateFindings, ibanValid } = await import(path.join(APP_ROOT, "js/privacy.js"));
const r = createReport("privacy");
// Addresses are put together here, so no file of the repository carries one (tests/hygiene.mjs).
const AT = (name, host) => `${name}@${host}`;
const kinds = (text) => findPrivate(text).map((f) => (f.kind === "word" ? `word:${f.word}` : f.kind)).sort().join(" ");

// The control: the check tells a planted address from clean text.
r.control(kinds(`Write to ${AT("jane.doe", "example.com")} today.`) === "email" && kinds("Write to us today.") === "", "a planted address is found and the same sentence without it says nothing");

const planted = [
  [`Contact: ${AT("anna.schmidt", "tidewell.example")}, ask for the figures.`, "email"],
  ["Reach the desk on +49 30 1234567 before Friday.", "phone"],
  ["Hotline (030) 123 45 67, Mo bis Fr.", "phone"],
  ["Ruf an: 0151-23456789", "phone"],
  ["UK office +44 20 7946 0958", "phone"],
  ["Pay to DE89 3704 0044 0532 0130 00 by the end of the month.", "iban"],
  ["IBAN GB82WEST12345698765432", "iban"],
  ["CONFIDENTIAL: board figures for Q3", "word:confidential"],
  ["For internal use only.", "word:internal"],
  ["Streng vertraulich: Vorstandsvorlage", "word:vertraulich"],
  ["Nur intern: Zahlen des Werks", "word:intern"],
  ["Interne Prozesse und Kennzahlen", "word:intern"],
  ["Proprietary and not for distribution.", "word:not for distribution word:proprietary"]
];
for (const [text, want] of planted) r.check(kinds(text) === want, `found ${want} in "${text}" (${kinds(text) || "nothing"})`);

const clean = [
  "Drewry's World Container Index stood at $1,859 per 40 ft on 13 November 2025 and $4,176 on 19 November 2026.",
  "Allowances for 40 % of 2024's emissions and 70 % of 2025's; 2026-11-24; 91.16 g CO2e per MJ.",
  "Counting follows EN ISO 14083; see page 12 and section 3.2 of the annual report 2025.",
  "At stake: €2.8m a year, 0.894 euros a dollar, 1,500 to 3,000 tokens a page, 100,000 tokens.",
  "Der Index lag am 19. November 2026 bei 4.176 Dollar; 12,9 Mio. € stehen auf dem Spiel.",
  "Order 1 0 2 4 6 8 10 12 in a list, version 2.13.0, ISO 9001:2015, 24/7 support.",
  "Account code DE00 1234 5678 9012 3456 78 is a made-up label, not a payable account."
];
for (const text of clean) r.check(kinds(text) === "", `nothing in clean text: "${text.slice(0, 60)}…" (${kinds(text) || "nothing"})`);

r.check(ibanValid("DE89 3704 0044 0532 0130 00") && !ibanValid("DE00 1234 5678 9012 3456 78"), "an IBAN's checksum tells a payable account from a code that only looks like one");

// Where it stands, and never the value.
const found = privateFindings([
  { where: "notes.md", text: `Questions to ${AT("jane.doe", "example.com")}, +49 30 1234567.` },
  { where: "Focus", text: "the internal finance team" },
  { where: "report.json", text: "Public figures only." }
]);
r.check(JSON.stringify(found.map((f) => [f.where, f.kind])) === JSON.stringify([["notes.md", "email"], ["notes.md", "phone"], ["Focus", "word"]]), `each finding names its kind and where it stands: ${found.map((f) => `${f.kind} in ${f.where}`).join(", ")}`);
r.check(!JSON.stringify(found).includes("jane.doe") && !JSON.stringify(found).includes("1234567"), "no finding repeats the address or the number");

r.finish("PRIVACY OK");
