# Prototype Ideator

From documents to agentic-AI prototypes worth building. AI agents read documents about a company, map its business issues and KPIs, and propose agentic-AI prototypes that each improve a named KPI. Code scores and ranks the ideas; a person shortlists the one to build and downloads a report.

Live site: <https://victorpflueger.github.io/PrototypeIdeator/>

## Status

Version 0.4.0 (M4 Report), 24 November 2026. The three fictional companies play from Start to Report with no key: Tidewell Lines from three challenger reports, Arvento Drives from two, and Auental Energie from an annual-report excerpt and a SWOT. Each step is one screen: the Reader's issue map with keep, merge and park; the Ideator's ideas as a honeycomb, each opening its own page; the scores as a chart, a table and the stability check, with weights you can change; the shortlist; and the report. Play walks the steps and stops where you decide, and the guide ends with a five-minute script.

The report follows the reference report's structure: a cover with the honeycomb of scored ideas, the short version, the issue map, the ideas at a glance with the chart of score against build effort, a page for each idea, how they were scored and how stable the ranking is, how they would be built and what live runs would cost, a vote sheet with boxes to fill in by hand, the assumptions and sources, and About this report with the byline. Save as PDF prints it alone on A4 with the footer on every page: "Created with Prototype Ideator", the address, "Built by Victor Pflüger" and the page number, in German in a German report. It prints as the SWOT and PESTEL Challengers print theirs, on the same Vici report pattern: text at 9.5 pt, each idea on a sheet of its own, and the PDF named `prototype-ideator-<company>-<date>-<lang>`. It also downloads as an HTML file that loads nothing and as an ideas file, `prototype-ideas/1`, with the issue map, the ideas, the weights, the scores, the stability check and the shortlist. Write a build brief turns a shortlisted idea into two blocks for a new Claude project, its instructions and its first message: the links to Vici, the byline, the talk track and Victor's portfolio, the five skills, the standing rules and a Phase 0 come from a template, and only the idea's part changes. In the simulation that part is the recording's for the first pick and is composed from the idea's page for the others; live, the Brief writer writes it in one request under the same budget cap.

Run it live takes your own documents and your own Claude API key. The Reader reads PDFs, Markdown, text and CSV, or compares the issues of several challengers' reports; the Ideator proposes the ideas; the Writer writes the summary; the Brief writer, when asked, the idea's part of a build brief. Each step is one request, checked and sent back once if it breaks a rule, under a budget cap you set; Stop ends a request and keeps what is done. A run that stops after reading still gives its report, which says on every page where it stopped. After a live run, Save run as simulation downloads the run to replay. PLAN.md holds the plan.

0.3.1 and 0.3.2 fixed what Victor's first live runs found: a second run could show the issues of the first, since both shared one cache key; and with more kept issues than ideas asked for, the Ideator wrote one idea per issue and the run stopped. Each live run now has its own cache key, a problem the page meets says so on screen, the Ideator's prompt puts the number of ideas first, and a repaired answer with too many ideas keeps its first ones while code refuses the rest.

## What is real and what is simulated

Real: the scoring rules, the ranking, the stability check and the cost estimates, which code computes; the rules for the agents' answers; and what the scenarios say about the world (laws, prices, market shifts), checked at source with a date. DATA_SOURCES.md lists each of those facts with its source and the day it was read.

Simulated: three fictional companies with illustrative figures, Tidewell Lines, Arvento Drives and Auental Energie, whose agent answers are recorded. Some of their challenger reports are stand-ins, written for the scenario until the challenger exports its own, and they say so. A replay needs no key and costs nothing; your choices (an issue parked, a weight, a shortlist) run through the same code a live run uses.

Live: your own documents and your own Claude API key, with Fast, Balanced or Thorough and a budget cap you set, from €0.05 to €3.00 (€0.50 by default). The agents' answers are real model output, checked by code; every figure is the engine's, worked out from them. A challenger's report from one challenger becomes issues with no request at all. Before a run the page estimates its cost and time and warns about what looks private; the run stops before any request that could pass the cap. The key and everything you enter stay in the browser tab's memory and go only to Anthropic's API; nothing is stored, and a result leaves the page only as a download you start. This version runs no web research, so the model knows the world up to June 2026. Public information only: never enter confidential, personal or otherwise protected data.

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
