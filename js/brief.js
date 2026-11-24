// The build brief (brief §6.6, D10): one shortlisted idea turned into two blocks to paste into a new Claude
// project, its project instructions and its first message, built like this tool's own kit at a fraction of
// its length. The fixed parts come from the template below, never from a model: the links to Vici, its
// Build a prototype page and its brief for agents, to the byline, to Dispatch Lab's talk track and to
// Victor's portfolio; the five skills; the standing rules in short form; and a Phase 0 that plans and stops.
// The idea's own part (what it builds, the steps, the key figures, the data, the agent's tools and
// guardrails, two or three golden cases) comes from the Brief writer in a live run, from the recording in
// the simulation, or, for an idea the recording has no brief for, from the idea's page, composed by code
// and marked so. The repository name is the person's to fill in.
//
// Pure: no DOM, no storage. The presenter shows the blocks; js/live_agents.js sends the Brief writer.

import { t } from "./i18n/index.js";
import { renderFacts, auditText, normalise } from "./facts.js";
import { fmtScore, fmtInt } from "./format.js";
import { STOCK_WORDS } from "./prompts.js";

/** The links every brief carries (brief §6.6), from the template, never from the model. */
export const BRIEF_LINKS = Object.freeze({
  vici: "https://victorpflueger.github.io/ViciDesign/index.html",
  viciRepo: "https://github.com/VictorPflueger/ViciDesign",
  prototypes: "https://victorpflueger.github.io/ViciDesign/start/prototypes.html",
  agents: "https://github.com/VictorPflueger/ViciDesign/blob/main/src/docs/prototype-brief.md",
  byline: "https://victorpflueger.github.io/ViciDesign/brand/profile-links.html",
  talkTrack: "https://victorpflueger.github.io/mobilitychallenge/?map=koeln&run=optimized&step=0",
  portfolio: "https://victorpflueger.github.io/VIP/prototypes.html"
});

/** The five skills every brief names (brief §6.6). */
export const BRIEF_SKILLS = Object.freeze(["/unlazy", "/impeccable", "/ux-heuristics", "/steve-jobs-design-review", "/humanizer"]);

/** The counts code holds, since the Brief writer's schema can't (PLAN.md §8.3). */
export const BRIEF_LIMITS = Object.freeze({ steps: [3, 7], keyFigures: [2, 4], tools: [1, 7], guardrails: [1, 6], data: [1, 6], goldenCases: [2, 3] });

/** A GitHub repository name from what the person typed: letters, digits, dots, hyphens and underscores. */
export function cleanRepo(text) {
  return String(text ?? "").trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "").replace(/^\.+/, "").slice(0, 100);
}

const L = BRIEF_LINKS;
const lines = (items, fn) => items.map(fn).join("\n");

/** The project instructions, in the brief's language: everything fixed, the idea's name and the repository. */
const INSTRUCTIONS = {
  en: ({ name, company, fictional, repo }) => `# ${name}: project instructions

You build **${name}**, a browser prototype for Victor Pflüger. The idea comes from a Prototype Ideator report on ${company}${fictional ? ", a fictional company" : ""}. The build brief, this project's first message, says what to build.

Repository: https://github.com/VictorPflueger/${repo}, published at https://victorpflueger.github.io/${repo}/. Partners show it to customers, often on a projector and without Victor.

## Sources of truth, in this order

1. Victor's latest instruction in the chat.
2. The build brief: the first message of this project.
3. Vici, Victor's design system, as it stands on main: ${L.vici}, repository ${L.viciRepo}. Its page Build a prototype, ${L.prototypes}, and its brief for agents, ${L.agents}, set the rules every prototype follows.
4. Victor's other prototypes, for how things are built: ${L.portfolio}. Read their code, not only their READMEs.
5. Official documentation for every API fact. Verify, never recall.

Never deviate silently. If you think the brief is wrong, say so and propose a fix.

## Always

1. Vici, kept current: copy Vici from main into vici/ unchanged and name its commit in vici/README.md.
2. The byline: "Built by", with Victor's portrait and name linking to LinkedIn and a globe linking to his website, both with rel="author", as ${L.byline} shows.
3. The talk track: a How it works guide that opens by itself and ends with the presenter's script of three to seven timed steps. Dispatch Lab's guide is the model: ${L.talkTrack}
4. Key figures: two to four vc-stat tiles at the top right, each explained in the guide. Before anything runs, they show what is at stake.
5. Two modes: a simulation that plays without a key, and a live run on the person's own Claude API key, with the model, the effort and a budget cap they choose.
6. Nothing is kept: the key and everything entered, uploaded or created live in memory only and are gone when the tab closes.
7. Public information only: wherever a person can type or upload, the page says so.
8. GitHub Pages only: static HTML, CSS and JavaScript modules, no backend, no build step, no framework and no request to any host but api.anthropic.com.
9. Cheap and fast by default: Haiku, low or medium effort and a budget cap on every run.
10. Honest by design: "You are interacting with an AI system" beside every control that starts a live run; lilac marks what the AI wrote; code computes every figure the page shows.
11. No client in public: no client, prospect, meeting or internal name in any file.

## Skills

- /unlazy before every milestone: gates from its acceptance criteria, and nothing reported as done while a gate is unmet.
- /impeccable when you shape a screen, and for the polish pass before each pull request.
- /ux-heuristics on every flow a stranger must get through alone.
- /steve-jobs-design-review on the plan at the end of Phase 0, and on the running tool before the release.
- /humanizer on every word a person reads.

## How we work

- Plan before code: Phase 0 ends with PLAN.md, which Victor approves.
- One branch and pull request per milestone; merge when CI is green and Victor has approved it.
- Node and Playwright tests with a scripted stand-in for the Claude API; automated tests never call the real API.
- No API key in the build: Victor runs the real live checks.
- Ask first before anything expensive, irreversible or scope-changing.
- British English and German, plain words and short sentences, as Vici's writing guideline says.
`,
  de: ({ name, company, fictional, repo }) => `# ${name}: Projektanweisungen

Sie bauen **${name}**, einen Browser-Prototyp für Victor Pflüger. Die Idee stammt aus einem Bericht des Prototype Ideator zu ${company}${fictional ? ", einem fiktiven Unternehmen" : ""}. Das Bau-Briefing, die erste Nachricht dieses Projekts, sagt, was gebaut wird.

Repository: https://github.com/VictorPflueger/${repo}, veröffentlicht unter https://victorpflueger.github.io/${repo}/. Partner zeigen es Kunden, oft am Beamer und ohne Victor.

## Maßgebliche Quellen, in dieser Reihenfolge

1. Victors letzte Anweisung im Chat.
2. Das Bau-Briefing: die erste Nachricht dieses Projekts.
3. Vici, Victors Designsystem, wie es auf main steht: ${L.vici}, Repository ${L.viciRepo}. Seine Seite Build a prototype, ${L.prototypes}, und sein Briefing für Agenten, ${L.agents}, setzen die Regeln, denen jeder Prototyp folgt.
4. Victors andere Prototypen, dafür, wie gebaut wird: ${L.portfolio}. Lesen Sie ihren Code, nicht nur die READMEs.
5. Offizielle Dokumentation für jede Angabe zur API. Prüfen, nicht erinnern.

Weichen Sie nie stillschweigend ab. Halten Sie das Briefing für falsch, sagen Sie es und schlagen Sie eine Korrektur vor.

## Immer

1. Vici, aktuell gehalten: Vici von main unverändert nach vici/ kopieren und den Commit in vici/README.md nennen.
2. Die Byline: „Erstellt von“ mit Victors Porträt und Namen, verlinkt auf LinkedIn, und einem Globus, verlinkt auf seine Website, beide mit rel="author", wie ${L.byline} zeigt.
3. Der Leitfaden: „So funktioniert's“ öffnet sich von selbst und endet mit dem Skript für die vorführende Person, drei bis sieben Schritte mit Zeiten. Vorbild ist der Leitfaden von Dispatch Lab: ${L.talkTrack}
4. Kennzahlen: zwei bis vier vc-stat-Kacheln oben rechts, jede im Leitfaden erklärt. Bevor etwas läuft, zeigen sie, was auf dem Spiel steht.
5. Zwei Modi: eine Simulation, die ohne Schlüssel läuft, und ein Live-Lauf mit dem eigenen Claude-API-Schlüssel der Person, mit Modell, Aufwand und Kostenlimit nach ihrer Wahl.
6. Nichts wird gespeichert: Der Schlüssel und alles Eingegebene, Hochgeladene und Erzeugte leben nur im Speicher und sind weg, wenn der Tab schließt.
7. Nur öffentliche Informationen: Wo man tippen oder hochladen kann, sagt die Seite das.
8. Nur GitHub Pages: statisches HTML, CSS und JavaScript-Module, kein Backend, kein Build-Schritt, kein Framework und keine Anfrage an einen anderen Host als api.anthropic.com.
9. Günstig und schnell als Vorgabe: Haiku, geringer oder mittlerer Aufwand und ein Kostenlimit für jeden Lauf.
10. Ehrlich gebaut: „Sie interagieren mit einem KI-System“ neben jedem Bedienelement, das einen Live-Lauf startet; Lila markiert, was die KI geschrieben hat; Code berechnet jede Zahl, die die Seite zeigt.
11. Kein Kunde öffentlich: kein Name von Kunden, Interessenten, Terminen oder intern in irgendeiner Datei.

## Skills

- /unlazy vor jedem Meilenstein: Gates aus seinen Abnahmekriterien, und nichts gilt als fertig, solange ein Gate offen ist.
- /impeccable, wenn Sie einen Bildschirm gestalten, und für den letzten Schliff vor jedem Pull Request.
- /ux-heuristics für jeden Ablauf, den eine fremde Person allein schaffen muss.
- /steve-jobs-design-review für den Plan am Ende von Phase 0 und für das laufende Werkzeug vor der Veröffentlichung.
- /humanizer für jedes Wort, das ein Mensch liest.

## So arbeiten wir

- Erst planen, dann programmieren: Phase 0 endet mit PLAN.md, das Victor freigibt.
- Ein Branch und ein Pull Request je Meilenstein; zusammenführen, wenn die CI grün ist und Victor zugestimmt hat.
- Tests in Node und Playwright mit einem geskripteten Ersatz für die Claude-API; automatische Tests rufen nie die echte API auf.
- Kein API-Schlüssel im Build: Victor macht die echten Live-Prüfungen.
- Erst fragen bei allem, was teuer oder unumkehrbar ist oder den Umfang ändert.
- Britisches Englisch und Deutsch, klare Wörter und kurze Sätze, wie Vicis Schreibrichtlinie sagt.
`
};

/** The first message: the idea's own part between the fixed opening and the fixed Phase 0. */
const MESSAGE = {
  en: ({ name, part, origin, composed }) => `# ${name}: build brief

You are the builder of ${name}. This message is your brief; the project instructions hold the standing rules. Read both before you act.

## What it builds

${part.builds}

${origin}

## What the room sees

${lines(part.steps, (s, i) => `${i + 1}. ${s}`)}

## Key figures

${lines(part.key_figures, (f) => `- **${f.name}**: ${f.measures}`)}

## Data

${lines(part.data, (d) => `- ${d}`)}

## The agent's tools

${lines(part.tools, (x) => `- **${x.name}**: ${x.does}`)}

## Guardrails

${lines(part.guardrails, (g) => `- ${g}`)}

## Golden cases

${composed
    ? `Write two or three in Phase 0, one for each key figure, before the code they test:\n\n${lines(part.key_figures, (f) => `- ${f.name}`)}`
    : `Write these into tests/fixtures/ before the code they test. Their values are synthetic, so check the arithmetic in Phase 0.\n\n${lines(part.golden_cases, (c, i) => `${i + 1}. **${c.name}**: given ${c.given}; expect ${c.expect}.`)}`}

## Phase 0: do this now

1. Save this brief to the project's files as build-brief.md, and read it again at the start of every session.
2. Study Vici's Build a prototype page and two of Victor's prototypes, their code included.
3. Check that the repository exists and is empty, and ask Victor to turn on GitHub Pages.
4. Verify at source, with the date read, every fact about the world the simulation will show.
5. Write PLAN.md: the screens, the agent's steps, the key figures, the scenarios, the tests and the milestones.
6. Run /steve-jobs-design-review on the plan and cut what the story doesn't need.
7. Stop and wait for Victor's approval before you write app code.
`,
  de: ({ name, part, origin, composed }) => `# ${name}: Bau-Briefing

Sie bauen ${name}. Diese Nachricht ist Ihr Briefing; die Projektanweisungen enthalten die festen Regeln. Lesen Sie beides, bevor Sie handeln.

## Was gebaut wird

${part.builds}

${origin}

## Was der Raum sieht

${lines(part.steps, (s, i) => `${i + 1}. ${s}`)}

## Kennzahlen

${lines(part.key_figures, (f) => `- **${f.name}**: ${f.measures}`)}

## Daten

${lines(part.data, (d) => `- ${d}`)}

## Die Werkzeuge des Agenten

${lines(part.tools, (x) => `- **${x.name}**: ${x.does}`)}

## Leitplanken

${lines(part.guardrails, (g) => `- ${g}`)}

## Goldene Fälle

${composed
    ? `Schreiben Sie in Phase 0 zwei oder drei, je einen für jede Kennzahl, bevor Sie den Code dazu schreiben:\n\n${lines(part.key_figures, (f) => `- ${f.name}`)}`
    : `Legen Sie diese in tests/fixtures/ an, bevor Sie den Code dazu schreiben. Ihre Werte sind synthetisch: Prüfen Sie die Rechnung in Phase 0.\n\n${lines(part.golden_cases, (c, i) => `${i + 1}. **${c.name}**: gegeben ${c.given}; erwartet ${c.expect}.`)}`}

## Phase 0: jetzt

1. Legen Sie dieses Briefing als build-brief.md in den Dateien des Projekts ab und lesen Sie es zu Beginn jeder Sitzung wieder.
2. Lesen Sie Vicis Seite Build a prototype und zwei von Victors Prototypen, samt Code.
3. Prüfen Sie, dass das Repository existiert und leer ist, und bitten Sie Victor, GitHub Pages einzuschalten.
4. Prüfen Sie jede Angabe über die Welt, die die Simulation zeigen wird, an der Quelle, mit dem Datum.
5. Schreiben Sie PLAN.md: die Bildschirme, die Schritte des Agenten, die Kennzahlen, die Szenarien, die Tests und die Meilensteine.
6. Wenden Sie /steve-jobs-design-review auf den Plan an und streichen Sie, was die Geschichte nicht braucht.
7. Halten Sie an und warten Sie auf Victors Freigabe, bevor Sie App-Code schreiben.
`
};

/** Where the idea comes from, in one paragraph: its issues and its place in the ranking, all from the run. */
function originOf(run, idea, lang) {
  const tr = (key, vars = null) => t(key, vars, lang);
  const titles = [...new Set(idea.issues.map((id) => {
    const i = run.issues.find((x) => x.id === id);
    if (!i) return null;
    const kept = i.status === "merged" ? run.issues.find((x) => x.id === i.merged_into) : i;
    return (kept || i).title;
  }).filter(Boolean))];
  const r = (run.ranked || []).find((x) => x.id === idea.id);
  return tr("brief.origin", {
    issues: titles.map((x) => `“${x}”`).join(lang === "de" ? " und " : " and "),
    score: r ? fmtScore(r.value, lang) : "…",
    rank: r ? r.rank : "…",
    of: (run.ideas || []).length,
    low: fmtInt(idea.effort_days.low, lang),
    high: fmtInt(idea.effort_days.high, lang)
  });
}

/**
 * The idea's part composed by code from its page, for an idea the recording has no brief for: what it
 * does and for whom, what the room sees, its key figures and data, the agent's five steps as its tools,
 * and the person's decision and its open points as guardrails. Golden cases are left to Phase 0.
 */
export function composedPart(idea, lang) {
  const tr = (key, vars = null) => t(key, vars, lang);
  return {
    builds: `${idea.what_it_does} ${tr("brief.audience", { audience: idea.audience })}`.trim(),
    steps: [...idea.room],
    key_figures: idea.key_figures.map((f) => ({ name: f.name, measures: f.demo })),
    data: [...idea.data],
    tools: ["spot", "check", "calculate", "propose", "prepare"].map((k) => ({ name: tr(`drawer.how.${k}`), does: idea.how[k] })),
    guardrails: [idea.how.decision, ...idea.risks.map((risk) => tr("brief.openPoint", { risk }))],
    golden_cases: []
  };
}

/**
 * The two blocks of a brief. part: the Brief writer's answer, the recording's or composedPart()'s;
 * composed: true for a composed part. Every {{fact:key}} in the part is filled from the run.
 */
export function briefBlocks({ run, idea, part, lang, repo, composed = false }) {
  const l = lang === "de" ? "de" : "en";
  const fill = (s) => renderFacts(s, run.facts, l);
  const filled = {
    builds: fill(part.builds),
    steps: part.steps.map(fill),
    key_figures: part.key_figures.map((f) => ({ name: fill(f.name), measures: fill(f.measures) })),
    data: part.data.map(fill),
    tools: part.tools.map((x) => ({ name: fill(x.name), does: fill(x.does) })),
    guardrails: part.guardrails.map(fill),
    golden_cases: (part.golden_cases || []).map((c) => ({ name: fill(c.name), given: fill(c.given), expect: fill(c.expect) }))
  };
  const name = idea.name;
  const company = run.company?.name || "";
  const fictional = run.company?.fictional === true;
  const r = cleanRepo(repo) || t("brief.repo.placeholder", null, l);
  return {
    instructions: INSTRUCTIONS[l]({ name, company, fictional, repo: r }),
    message: MESSAGE[l]({ name, part: filled, origin: originOf(run, idea, l), composed })
  };
}

/** Both blocks as one Markdown file, each under its own heading line. */
export function briefMarkdown(blocks, lang) {
  const l = lang === "de" ? "de" : "en";
  return `<!-- ${t("brief.file.instructions", null, l)} -->\n\n${blocks.instructions}\n\n---\n\n<!-- ${t("brief.file.message", null, l)} -->\n\n${blocks.message}`;
}

// ---- the Brief writer's answer, checked (brief §6.7) -------------------------------------------------------

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STOCK = new RegExp(`(?<![\\p{L}])(${STOCK_WORDS.map((w) => esc(w).replace(/'/g, "['’]")).join("|")})(?![\\p{L}])`, "iu");
const DASH = /\S\s*—\s*\S|\S\s+–\s+\S/u;
// What the template holds and the idea's part may not repeat or change: its links, the five skills, its
// headings and its Phase 0.
const TEMPLATE_HOSTS = /victorpflueger\.github\.io\/(ViciDesign|VIP|mobilitychallenge)|github\.com\/VictorPflueger\/ViciDesign/i;
const SKILL = new RegExp(`(^|[^\\p{L}/])(${BRIEF_SKILLS.map((s) => esc(s)).join("|")})(?![\\p{L}-])`, "iu");
const HEADING = /(^|\n)\s{0,3}#{1,6}\s/;
const PHASE0 = /\bPhase\s*0\b/i;

/** Every text of the idea's part with where it stands, for the checks. */
export function briefTexts(part) {
  const out = [["builds", part?.builds]];
  (part?.steps || []).forEach((s, i) => out.push([`step ${i + 1}`, s]));
  (part?.key_figures || []).forEach((f, i) => out.push([`key figure ${i + 1} name`, f?.name], [`key figure ${i + 1} measures`, f?.measures]));
  (part?.data || []).forEach((s, i) => out.push([`data ${i + 1}`, s]));
  (part?.tools || []).forEach((x, i) => out.push([`tool ${i + 1} name`, x?.name], [`tool ${i + 1} does`, x?.does]));
  (part?.guardrails || []).forEach((s, i) => out.push([`guardrail ${i + 1}`, s]));
  (part?.golden_cases || []).forEach((c, i) => out.push([`golden case ${i + 1} name`, c?.name], [`golden case ${i + 1} given`, c?.given], [`golden case ${i + 1} expect`, c?.expect]));
  return out;
}

/**
 * The Brief writer's answer, checked: the counts the schema can't hold, no empty text, and nothing that
 * touches the template's fixed parts (its links, the skills, a heading, Phase 0), each sent back once. The
 * prose goes through the fact audit; a golden case's given and expect hold synthetic test values and are
 * left out of it. Returns { refusals, audit, notes, ok }.
 */
export function briefProblems(answer, { facts = [], evidence = {} } = {}) {
  const refusals = [];
  const audit = [];
  const notes = [];
  const count = (key, label, [lo, hi]) => {
    const n = Array.isArray(answer?.[key]) ? answer[key].length : 0;
    if (n < lo || n > hi) refusals.push(`${label}: ${n}, but the brief needs ${lo === hi ? lo : `${lo} to ${hi}`}`);
  };
  count("steps", "steps", BRIEF_LIMITS.steps);
  count("key_figures", "key figures", BRIEF_LIMITS.keyFigures);
  count("tools", "tools", BRIEF_LIMITS.tools);
  count("guardrails", "guardrails", BRIEF_LIMITS.guardrails);
  count("data", "data", BRIEF_LIMITS.data);
  count("golden_cases", "golden cases", BRIEF_LIMITS.goldenCases);
  for (const [where, text] of briefTexts(answer)) {
    if (typeof text !== "string" || !normalise(text)) { refusals.push(`${where} is empty`); continue; }
    if (TEMPLATE_HOSTS.test(text)) refusals.push(`${where} repeats a link the template holds; write only the idea's part`);
    const skill = text.match(SKILL);
    if (skill) refusals.push(`${where} names the skill ${skill[2]}, which the template holds; write only the idea's part`);
    if (HEADING.test(text)) refusals.push(`${where} holds a heading; the template sets the headings`);
    if (PHASE0.test(text)) refusals.push(`${where} speaks of Phase 0, which the template holds`);
    if (!/^golden case \d+ (given|expect)$/.test(where)) {
      const a = auditText(text, { facts, evidence });
      if (!a.pass) audit.push({ where, tokens: a.tokens, unknownFacts: a.unknownFacts });
    }
    const dash = text.match(DASH);
    if (dash) notes.push(`${where}: a dash as punctuation ("${dash[0]}")`);
    const stock = text.match(STOCK);
    if (stock) notes.push(`${where}: the stock word "${stock[1]}"`);
  }
  return { refusals, audit, notes, ok: refusals.length === 0 && audit.length === 0 };
}

/** The evidence a brief's prose may draw on: the run's, and the idea's key figures with their sources. */
export function briefEvidence(run, idea) {
  const e = run.evidence || { titles: [], texts: [], quotes: [], urls: [] };
  const own = (idea?.key_figures || []).flatMap((f) => [f.today || "", f.source || "", f.name || ""]).filter(Boolean);
  return { ...e, texts: [...(e.texts || []), ...own, idea?.what_it_does || "", ...(idea?.room || [])] };
}
