// What differs between the prototypes in the shared Vici tests (tests/tokens.mjs, tests/hexagon.mjs and
// tests/page-icon.mjs). Those files are the same in the sister prototypes and this tool; this file is the
// one place that is not. Everything here is the Prototype Ideator's, at version 0.1.0: its frame.

/** The prototype's name, as on its page and on its card on Victor's website. */
export const NAME = "Prototype Ideator";

/**
 * Colour pairs only this prototype draws (the shared shell's pairs are in tests/tokens.mjs):
 * [what, foreground token, background token, kind]. kind "text" needs 4.5:1, "mark" (a line, an icon,
 * a control's border, a bar) 3:1 (WCAG 2.2, 1.4.3 and 1.4.11). Tokens are Vici's, without "--vc-".
 * Decorative outlines (panels, table rules) carry no information and are not listed.
 */
export const COLOUR_PAIRS = [
  // The stage: panels on the surface, the honeycomb canvas behind them.
  ["A step's title, its lead and a figure's name", "text", "surface", "text"],
  ["A step's notes and a figure's explanation", "text-muted", "surface", "text"],
  ["The version note's words on its neutral ground", "text", "neutral-bg", "text"],
  ["A challenger's link", "text-link", "surface", "text"],
  // The four key figures.
  ["A key figure's name and note", "text-muted", "surface", "text"],
  ["A key figure waiting for its run: the ellipsis", "text-subtle", "surface", "mark"],
  // The step bar and the strip under the header.
  ["A step's name on the step bar", "text", "bg-subtle", "text"],
  ["The sentence under the header", "text-muted", "surface", "text"],
  ["The step on screen: its number", "on-accent-soft", "accent-soft", "text"],
  // Your turn: Vici's merlot callout with the one primary action.
  ["Your turn: the callout's words on the soft merlot", "on-accent-soft", "accent-soft", "text"],
  ["Your turn: the callout's cell against its ground", "accent", "accent-soft", "mark"],
  ["Your turn: the primary action", "on-accent", "accent", "text"],
  // Header tags and switches.
  ["SIMULATION (a plain tag)", "neutral-text", "neutral-bg", "text"],
  ["LIVE, on merlot", "on-accent", "accent", "text"],
  ["The language on screen, pressed", "on-accent", "accent", "text"],
  ["You are interacting with an AI system", "feature-text", "feature-bg", "text"],
  ["Run it live: its outline on the step bar", "border-strong", "bg-subtle", "mark"]
];

/**
 * Colours that must stay apart, beyond the shared ones in tests/tokens.mjs: [what, token, token].
 * The test reports how far apart they stay under colour-vision deficiency; it does not fail on them.
 * Version 0.1.0 draws no states of its own yet.
 */
export const SEPARATIONS = [];

/**
 * The hexagon test's tour of the page (tests/hexagon.mjs): the English guide as it opens on a new tab and
 * its talk track, the first step, Run it live's note, then the German page and its guide.
 * visit(name, { settle }) checks the page as it is, settle ms (250) after the step.
 */
export async function hexagonTour(page, visit) {
  await page.waitForSelector('html[data-boot="ready"]', { timeout: 20000 });
  await page.waitForSelector("#guide-en[open]", { timeout: 10000 });
  await visit("the guide, opened by itself");
  await page.click("#guide-en .vc-guide__rail .vc-step__button >> nth=-1");
  await visit("the guide's talk track");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 5000 });
  await visit("the first step");
  await page.click("#btn-live");
  await visit("Run it live, before version 0.3.0", { settle: 300 });
  await page.click('.lang-option[data-lang="de"]');
  await page.waitForSelector('html[lang="de"]', { timeout: 5000 });
  await visit("the German page");
  await page.click('[data-vc-guide-open="guide-de"]');
  await page.waitForSelector("#guide-de[open]", { timeout: 5000 });
  await visit("the German guide");
  await page.keyboard.press("Escape");
}

/**
 * The page icon (tests/page-icon.mjs): the icon and kind of this prototype's card on Victor's website
 * (VictorPflueger/VIP, data/prototypes.js, from version 1.0.0), the colour of that kind's cell (Vici's
 * lilac for a prototype), and favicon.svg exactly: the card's cell drawn for small sizes.
 */
export const PAGE_ICON = {
  icon: "sparkle",
  kind: "prototype",
  tone: "lilac",
  favicon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 103.92">
  <!-- Prototype Ideator's page icon: Vici's sparkle icon in a lilac hexagon cell, the icon and kind of its
       card on Victor Pflüger's website (VictorPflueger/VIP, data/prototypes.js). Vici's lilac 100 (#f2e9fd)
       and lilac 900 (#372544); the icon is drawn larger and bolder than on the card so that it still
       reads at 16 px. -->
  <polygon points="120,51.96 90,103.92 30,103.92 0,51.96 30,0 90,0" fill="#f2e9fd"/>
  <g transform="translate(12 2.06) scale(4)" fill="none" stroke="#372544" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.5 4.8 L11.84 11.66 L17.5 13 L11.84 14.34 L10.5 21.2 L9.16 14.34 L3.5 13 L9.16 11.66 Z"/>
    <path d="M20.5 5.4 L19.55 7.05 L17.65 7.05 L16.7 5.4 L17.65 3.75 L19.55 3.75 Z" fill="#372544" stroke="none"/>
  </g>
</svg>
`
};
