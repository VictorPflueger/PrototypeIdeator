# Prototype Ideator

From documents to agentic-AI prototypes worth building. AI agents read documents about a company, map its business issues and KPIs, and propose agentic-AI prototypes that each improve a named KPI. Code scores and ranks the ideas; a person shortlists the one to build and downloads a report.

Live site: <https://victorpflueger.github.io/PrototypeIdeator/>

## Status

Version 1.0.0 (M5 Release), 25 November 2026. The three fictional companies play from Start to Report with no key: Tidewell Lines from three challenger reports, Arvento Drives from two, and Auental Energie from an annual-report excerpt and a SWOT. Each step is one screen: the Reader's issue map with keep, merge and park; the Ideator's ideas as a honeycomb, each opening its own page; the scores as a chart, a table and the stability check, with weights you can change; the shortlist; and the report. Play walks the steps and stops where you decide, and the guide ends with a five-minute script, which DEMO_SCRIPT.md and DEMO_SCRIPT.de.md set out for a presenter.

The report follows the reference report's structure: a cover with the honeycomb of scored ideas, the short version, the issue map, the ideas at a glance with the chart of score against build effort, a page for each idea, how they were scored and how stable the ranking is, how they would be built and what live runs would cost, a vote sheet with boxes to fill in by hand, the assumptions and sources, and About this report with the byline. Save as PDF prints it alone on A4 with the footer on every page: "Created with Prototype Ideator", the address, "Built by Victor Pflüger" and the page number, in German in a German report. It prints as the SWOT and PESTEL Challengers print theirs, on the same Vici report pattern: text at 9.5 pt, each idea on a sheet of its own, and the PDF named `prototype-ideator-<company>-<date>-<lang>`. It also downloads as an HTML file that loads nothing and as an ideas file, `prototype-ideas/1`, with the issue map, the ideas, the weights, the scores, the stability check and the shortlist. Write a build brief turns a shortlisted idea into two blocks for a new Claude project, its instructions and its first message: the links to Vici, the byline, the talk track and Victor's portfolio, the five skills, the standing rules and a Phase 0 come from a template, and only the idea's part changes. In the simulation that part is the recording's for the first pick and is composed from the idea's page for the others; live, the Brief writer writes it in one request under the same budget cap.

Run it live takes your own documents and your own Claude API key. The Reader reads PDFs, Markdown, text and CSV, or compares the issues of several challengers' reports; the Ideator proposes the ideas; the Writer writes the summary; the Brief writer, when asked, the idea's part of a build brief. Each step is one request, checked and sent back once if it breaks a rule, under a budget cap you set; Stop ends a request and keeps what is done. A run that stops after reading still gives its report, which says on every page where it stopped. After a live run, Save run as simulation downloads the run to replay.

The page works from 1920 × 1080 down to 1280 × 720 in both themes and languages, with the keyboard alone and with reduced motion. PLAN.md holds the plan, DESIGN.md what Vici leaves to the tool, and REVIEW.md the files taken from other tools and the reviews before the release.

## What is real and what is simulated

Real: the scoring rules, the ranking, the stability check and the cost estimates, which code computes; the rules for the agents' answers; and what the scenarios say about the world (laws, prices, market shifts), checked at source with a date. DATA_SOURCES.md lists each of those facts with its source and the day it was read.

Simulated: three fictional companies with illustrative figures, Tidewell Lines, Arvento Drives and Auental Energie, whose agent answers are recorded. Some of their challenger reports are stand-ins, written for the scenario until the challenger exports its own, and they say so. A replay needs no key and costs nothing; your choices (an issue parked, a weight, a shortlist) run through the same code a live run uses.

Live: your own documents and your own Claude API key, with Fast, Balanced or Thorough and a budget cap you set, from €0.05 to €3.00 (€0.50 by default). The agents' answers are real model output, checked by code; every figure is the engine's, worked out from them. A challenger's report from one challenger becomes issues with no request at all. Before a run the page estimates its cost and time and warns about what looks private; before each request it counts the request's tokens with Anthropic's free count, and the run stops before any request that could pass the cap. The key and everything you enter stay in the browser tab's memory and go only to Anthropic's API; nothing is stored, Clear everything on the live Start step empties it all, and a result leaves the page only as a download you start. This version runs no web research, so the model knows the world up to June 2026. Public information only: never enter confidential, personal or otherwise protected data.

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

## How to present

DEMO_SCRIPT.md has the five minutes in English and DEMO_SCRIPT.de.md in German: what to say, what to click and what the room sees, what to do when something goes wrong and the questions that will come. They follow the guide's talk track, which `?guide=present` opens.

## History

- **1.0.0** (25 November 2026), M5 Release: the keyboard alone runs a scenario and a live run, the focus shows at every stop, reduced motion stops every animation, and the layout holds at 1600 × 900 and 1366 × 768 as well. Three faults from Victor's first printed live run are fixed: the report's honeycomb printed in two columns, since a print dialog reports A4's page area to the media queries and a phone rule took over (fixed in Vici, PR 50); the chart left an idea without a name and its range lines ran through the names; and the stability check could leave its last row alone on the next sheet. DESIGN.md and the two demo scripts are new, and REVIEW.md holds the independent review and the design and partner reviews. The independent review's fixes: the budget cap counts every request's tokens with the free endpoint, since four characters a token saw a third too few on the 5.5 models; a PDF that keeps its pages in compressed object streams is held to the page limit and priced; Play stops wherever you act; the private-data warning comes before a run's first request whatever its step; Clear everything is on the live Start step; At stake says when it holds the Reader's AI estimates; and a cheap idea's live run reads to a tenth of a cent ("€0.004"), not €0.00.
- **0.4.0** (24 November 2026), M4 Report: the report, Save as PDF with the footer on every page, the HTML and ideas files, the vote sheet and the build brief.
- **0.3.1 and 0.3.2** (24 November 2026) fixed what Victor's first live runs found: a second run could show the issues of the first, since both shared one cache key; and with more kept issues than ideas asked for, the Ideator wrote one idea per issue and the run stopped. Each live run now has its own cache key, a problem the page meets says so on screen, the Ideator's prompt puts the number of ideas first, and a repaired answer with too many ideas keeps its first ones while code refuses the rest.
- **0.3.0** (24 November 2026), M3 Live: the live-run dialog, the agents and their prompts, the budget cap and the cost meter, errors and retries, and Save run as simulation.
- **0.2.0** (24 November 2026), M2 Simulation: the three scenarios, the six steps, Play, the key figures and the guide with its talk track.
- **0.1.0** (23 November 2026), M1 Foundations: Vici, the frame, both languages, the engine with the golden cases, the contracts, the security policy and CI.

## Author

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
