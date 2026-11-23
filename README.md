# Prototype Ideator

From documents to agentic-AI prototypes worth building. AI agents read documents about a company, map its business issues and KPIs, and propose agentic-AI prototypes that each improve a named KPI. Code scores and ranks the ideas; a person shortlists the one to build and downloads a report.

Live site: <https://victorpflueger.github.io/PrototypeIdeator/>

## Status

Version 0.1.0 (M1 Foundations), 23 November 2026. The page holds its frame: the header, four key figures that wait for a run, the step bar, the start step and a How it works guide in English and in German. Under it sit the parts the next versions build on: the scoring engine with its golden cases, the data contracts, the KPI library shared with the three challengers, the fact audit, the Ideator's prompt and its guards. The three fictional companies play from version 0.2.0, live runs from version 0.3.0 and the report from version 0.4.0. PLAN.md holds the plan.

## What is real and what is simulated

Real: the scoring rules, the ranking, the stability check and the cost estimates, which code computes; the rules for the agents' answers; and what the scenarios will say about the world (laws, prices, market shifts), checked at source with a date.

Simulated, from version 0.2.0: three fictional companies with illustrative figures, Tidewell Lines, Arvento Drives and Auental Energie, whose agent answers are recorded. They need no key and cost nothing.

Live, from version 0.3.0: your own documents and your own Claude API key, with a budget cap you set. The key and everything you enter stay in the browser tab's memory and go only to Anthropic's API; nothing is stored, and a result leaves the page only as a download you start. Public information only: never enter confidential, personal or otherwise protected data.

## The Ideator probe

Before the screens are built on it, `js/probe.js` sends the Ideator's real request with the stand-in issues of Tidewell Lines and checks the answer as a live run will. TECH_NOTES.md, section 8, holds the line to paste into the browser console and what it costs.

## The set of four

The Prototype Ideator is the fourth of four tools. Each challenger stress-tests one strategy framework and hands its result to the Ideator as a file it reads without a model call:

- [Business Model Canvas Challenger](https://victorpflueger.github.io/BMC-challenger/)
- [SWOT Challenger](https://victorpflueger.github.io/SWOT-challenger/)
- [PESTEL Challenger](https://victorpflueger.github.io/PESTEL-challenger/)

## How it is built

Static HTML, CSS and JavaScript modules on GitHub Pages: no backend, no build step, no framework, and no request to any host but api.anthropic.com. It follows Vici, Victor's design system, copied unchanged into `vici/`. TECH_NOTES.md records the facts and decisions the code rests on, with their dates, and REVIEW.md every file taken from a sister prototype.

## Tests

`node tests/run-all.mjs` runs every suite; `tests/README.md` says what each checks and how to set up the browser suites. No test calls the real API.

## Author

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
