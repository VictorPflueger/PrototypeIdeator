// Every visible string in English (British). js/i18n/de.js has the same keys; tests/i18n.mjs holds the
// two equal in keys and placeholders and checks that every key is used. Placeholders in braces are filled
// by t(); keys ending in .one and .other are plural forms for tn(). The How it works guides are written
// out in index.html, one per language, as Vici's guide asks.

export default {
  // ---- the page ----------------------------------------------------------------------------------------
  "app.name": "Prototype Ideator",
  "app.title": "Prototype Ideator: from documents to agentic-AI prototypes worth building",
  "p.skip": "Skip to the step on screen",
  "p.mode.tip": "A replay of recorded agent answers through the real scoring rules: no model is called. Run it live calls Claude with your own key.",
  "p.theme": "Dark or light theme",
  "p.lang": "Language",
  "p.lang.now": "The page is now in English.",
  "p.kpis": "Key figures",
  "p.strip": "AI agents read your documents, map the business issues and propose agentic-AI prototypes that each improve a named KPI, scored so you can choose one to build. The simulation uses fictional companies; a live run uses your documents and your Claude key.",
  "p.byline.label": "Built by",
  "p.byline.linkedin": " on LinkedIn (opens in a new tab)",
  "p.byline.website": "Victor Pflüger's website (opens in a new tab)",
  "p.byline.tip": "Website",
  "p.newTab": " (opens in a new tab)",
  "p.public": "Public information only: never enter confidential, personal or otherwise protected data.",

  // ---- the key figures ----------------------------------------------------------------------------------
  "kpi.atStake.label": "At stake a year",
  "kpi.atStake.wait": "after the Reader",
  "kpi.covered.label": "Issues covered",
  "kpi.covered.wait": "after the ideas",
  "kpi.top.label": "Top score",
  "kpi.top.wait": "out of 5, after the ideas",
  "kpi.cost.label": "Session cost",
  "kpi.cost.wait": "after a run",

  // ---- the step bar -------------------------------------------------------------------------------------
  "p.steps": "Steps",
  "p.play": "Play",
  "p.back": "Back",
  "p.next": "Next",
  "p.step.start": "Start",
  "p.step.read": "Read",
  "p.step.ideate": "Ideate",
  "p.step.score": "Score",
  "p.step.shortlist": "Shortlist",
  "p.step.report": "Report",
  "p.live": "Run it live",
  "p.ai": "You are interacting with an AI system",
  "p.live.later.title": "Live runs come with version 0.3.0",
  "p.live.later.message": "Nothing was sent: this version calls no model.",

  // ---- the first step -----------------------------------------------------------------------------------
  "p.start.title": "From the documents you have to a ranked shortlist",
  "p.start.lead": "The Reader maps the business issues and KPIs in your documents. The Ideator proposes prototypes for them, code scores and ranks them, and you pick the three to build.",
  "p.start.version": "Version 0.1.0 holds the frame, the scoring engine and the guide. The three fictional companies play from version 0.2.0, live runs from version 0.3.0.",
  "p.start.challengers": "No documents yet? Challenge a business model, a SWOT or a PESTEL first.",
  "p.turn.lead": "Your turn",
  "p.start.turn": "Read how the tool works. The replay starts here from version 0.2.0.",
  "p.start.turnAction": "How it works",
  "p.figures.title": "The four figures at the top",
  "p.figures.atStake": "The money the kept issues put at stake a year, as the documents or the challengers state it.",
  "p.figures.covered": "Kept issues that at least one idea answers, of all kept issues.",
  "p.figures.top": "The highest weighted score out of 5; after your decision, your first pick.",
  "p.figures.cost": "What the model calls cost: measured in a live run, estimated in a replay.",

  // ---- start-up and errors ------------------------------------------------------------------------------
  "p.boot.failed": "The page could not start.",
  "p.boot.module": "A part of the page did not load: {error}",
  "p.error.title": "Something went wrong",

  // ---- the engine's words: figures, money, the stability sentence -------------------------------------
  "fact.noData": "no figure",
  "money.perYear": "{amount} a year",
  "stability.sentence": "{first}; {second}.",
  "stability.first": "{name} is first in {count} of {of} rankings",
  "stability.firstAlso": "{name} in {count}",
  "stability.holds": "the order holds in every ranking",
  "stability.places": "places {from} to {to} change with the weights",
  "stability.placesMany": "places {runs} change with the weights",
  "stability.run": "{from} to {to}",
  "stability.runOne": "{at}",
  "stability.and": " and ",
  "kpi.atStake.part": "{amount} on {stated} of {of} issues",
  "kpi.atStake.none": "No issue states an amount"
};
