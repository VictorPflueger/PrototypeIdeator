# Design

The Prototype Ideator is built on Vici, Victor's design system, at the commit `vici/README.md` names.
This file records what Vici leaves to the tool.

## 1. Who looks at it, and where

A consulting partner shows it to a customer on a projector, often without Victor, or someone tries it on
their own company with their own Claude key. So the first screen says what the tool does, every figure
says what it rests on, and the page reads from the back of a room at 1280 × 720.

## 2. The frame

It follows the Data Quality Agent and the three challengers, so a partner who has shown one knows where
to look:

- **The header:** the sparkle icon in a lilac hexagon, the name, the actions beside it (SIMULATION or
  LIVE, How it works, EN | DE, theme) and the four key figures at the top right.
- **The strip under it:** the brief's one sentence (§8) and the byline.
- **The step bar:** Play, Back, the six steps as Vici's stepper, Next, then Run it live with the AI notice
  beside it. A step that waits for the person says so under its name.
- **The stage:** the story on the left (the company, title, lead sentence, what the agent did and the
  "Your turn" bar), the evidence on the right.

## 3. The steps

Each step answers one question in its title; Play stops where the person acts.

| Step | Left: the story | Right: the evidence |
|---|---|---|
| Start | The three companies as a segmented choice, each with its documents, "Fictional company, illustrative figures" and "Stand-in" on a stand-in report; "Your turn: Start" | The four key figures explained, and links to the three challengers |
| Read | "12 issues to keep, merge or park", the Reader's merges in lilac with their reasons | The issue map: each issue with what it puts at stake a year, its KPIs and where it was found, and Keep, Merge and Park; the sources with the dates read |
| Ideate | How many ideas, one sentence on what an idea is | The honeycomb: one cell per idea, which opens the idea's page in a drawer |
| Score | The idea that leads and in how many of the nine rankings; Change the weights opens seven sliders | Score against build effort as a chart, a table or the stability check, one segmented control apart |
| Shortlist | The three places and their points; "Your decision: Write the report" | The ideas by score, each with its places 1, 2 and 3 |
| Report | Save as PDF and Write a build brief | The report, page by page, with the HTML file and the ideas file above it |

The key figures show the run before anything plays; the decision strikes the old value through beside
the new one, and Top score names the first pick.

A live run uses the same steps: the Start step becomes Vici's drop zone under the public-information
notice, with the number of ideas and the optional company, sector, focus and constraints; then Vici's
live-run dialog. While an agent works, its step names the agent and what it does, with the time, the
spend so far and Stop; the Session cost tile shows the spend against the cap. A stop says why, keeps
what is done and offers the report so far. After the report, Save run as simulation stands with the two
files.

## 4. Colour

Colour never carries meaning alone: each state also has a mark and a word.

| Colour | Means |
|---|---|
| Merlot (Vici's accent) | You: your turn, your choice, the shortlist's cells, rows and markers, the pressed language |
| Lilac (Vici's feature colour) | The AI: what it wrote, proposed or estimated, the idea cells before you choose, and the AI notice |
| Ink | Everything else |

The chart marks the shortlist with filled hexagons and its place, the other ideas with outlines, and
names every idea, so the difference holds in print and without colour. The page starts light until a
visitor chooses dark: rooms are lit.

## 5. Two languages

English opens every first visit; German switches every word in place and has its own guide. The agents
of a live run write in the language the run started in, and its report follows them. German's long words
break at their hyphens and, in the report's tables, between syllables.

## 6. The shape of the report

- **Job:** after the run, the customer gets a document to keep, forward and vote on. Read mode.
- **Outcome:** Save as PDF prints the report alone on A4 with the footer on every page; the HTML file and
  the ideas file download beside it, and a build brief copies into a new Claude project.
- **Direction:** Vici's report: light sheets in either theme, a cover with the honeycomb of scored ideas,
  one heading per page, an idea on a sheet of its own, the footer in the margins, as the SWOT and PESTEL
  Challengers print theirs.
- **Constraints:** the strict security policy, nothing kept, a live run's report in the run's language,
  tables that break between rows, the stability check whole on one sheet, the honeycomb in the columns
  the screen shows; on screen, 1920 × 1080 to 1280 × 720 without page scroll, no text cut, targets of at
  least 40 px, nothing round.
