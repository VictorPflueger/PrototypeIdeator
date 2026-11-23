// The data contracts (brief §10) and each agent's output schema, as modules: the page can't load JSON
// under its security policy. Two kinds live here.
//
// Contracts describe what code holds and checks: Document, IssueMap, Issue, Idea, KeyFigure, Rating,
// Weights, Score, Stability, Shortlist, Recommendation, BuildBrief, Scenario, RunEvent and AuditEvent.
// They use every keyword js/schema.js knows (ranges, lengths, counts). Those that the ideas file carries
// come from schemas/prototype-ideas-1.json through its module twin, so the file and the code can't drift;
// the handoff file the tool reads has its own shared schema, schemas/strategy-challenge-1.json.
//
// Output schemas go to the API in output_config.format and stay inside what structured outputs accept
// (PLAN.md §8.3): every object closed with additionalProperties false and every property required, so no
// optional parameter; union types only where a value may be missing (four, all in the Reader's schema);
// no minimum, maximum, minLength, maxLength or maxItems; minItems only 0 or 1. Code holds every bound the
// schema can't, in js/guards.js; the cap on ideas also stands in the array's description and the prompt.
// tests/schemas.mjs counts the optional and union-typed parameters and fails on any other keyword.

import IDEAS_FILE from "../schemas/prototype-ideas-1.js";
import HANDOFF_FILE from "../schemas/strategy-challenge-1.js";
import { CRITERIA } from "./engine.js";
import { SECTOR_IDS } from "../data/kpis.js";
import { LIMITS } from "./config.js";

export { IDEAS_FILE, HANDOFF_FILE };

const D = IDEAS_FILE.$defs;
const str = { type: "string" };
const strOrNull = { type: ["string", "null"] };
const numOrNull = { type: ["number", "null"] };
const strings = { type: "array", items: str };
const closed = (properties, required = Object.keys(properties)) => ({ type: "object", additionalProperties: false, required, properties });
const STEPS = ["start", "read", "ideate", "score", "shortlist", "report"];

// ---- contracts --------------------------------------------------------------------------------------------

/** A document held in this tab's memory; its text or bytes stay in js/session.js and never in an export. */
const Document = closed({
  id: str,
  name: { type: "string", minLength: 1 },
  kind: { enum: ["pdf", "markdown", "text", "csv", "handoff"] },
  bytes: { type: "integer", minimum: 0 },
  pages: { type: ["integer", "null"], minimum: 1 },
  stand_in: { type: "boolean" },
  fictional: { type: "boolean" },
  from: { enum: ["upload", "scenario"] }
});

/** A quotation of a source, at most 150 characters; text sources are checked word for word (D9). */
const Quote = closed({
  file: str,
  where: str,
  text: { type: "string", minLength: 1, maxLength: LIMITS.quoteMaxChars },
  checked: { enum: ["word-for-word", "not-checked", "failed"] }
});

const IssueKpi = closed({
  id: strOrNull,
  name: { type: "string", minLength: 1 },
  unit: strOrNull,
  today: strOrNull,
  direction: { enum: ["up", "down", null] },
  change_low: numOrNull,
  change_high: numOrNull,
  basis: strOrNull
}, ["id", "name", "unit", "today"]);

/** An issue as the session holds it, from the Reader or a handoff file, with what the person decided. */
const IssueRecord = closed({
  id: { type: "string", minLength: 1 },
  title: { type: "string", minLength: 1 },
  description: str,
  area: str,
  kpis: { type: "array", items: { $ref: "#/$defs/IssueKpi" } },
  money_as_stated: strOrNull,
  eur_year_low: numOrNull,
  eur_year_high: numOrNull,
  eur_year_expected: numOrNull,
  eur_basis: strOrNull,
  estimate: { type: "boolean" },
  quotes: { type: "array", items: { $ref: "#/$defs/Quote" } },
  evidence: { type: "array", items: { $ref: "#/$defs/Source" } },
  confidence: { enum: ["low", "medium", "high"] },
  response: { anyOf: [{ type: "null" }, closed({ id: str, title: str, kind: { enum: ["mitigate", "advantage", "accept", "monitor"] }, chosen: { type: "boolean" }, first_step: str, owner: str, effort: str, time_to_impact: str })] },
  source: closed({
    kind: { enum: ["document", "handoff"] },
    file: strOrNull,
    issue: strOrNull,
    tool: { anyOf: [{ type: "null" }, closed({ id: str, name: str, version: str, url: str, type: { enum: ["bmc", "swot", "pestel"] } })] }
  }),
  status: { enum: ["kept", "merged", "parked"] },
  merged_into: strOrNull,
  park_reason: strOrNull,
  type: str,
  areas: strings,
  impact: { type: "integer", minimum: 1, maximum: 5 },
  likelihood: { type: "integer", minimum: 1, maximum: 5 },
  band: str,
  horizon: str
}, ["id", "title", "description", "area", "kpis", "money_as_stated", "eur_year_low", "eur_year_high", "eur_year_expected", "eur_basis", "estimate", "quotes", "evidence", "confidence", "response", "source", "status", "merged_into", "park_reason"]);

const Source = closed({ url: { type: "string", pattern: "^https?://" }, title: str, read_on: { type: "string", format: "date" } });
const Merge = closed({ keep: { type: "string", minLength: 1 }, merged: { type: "array", minItems: 1, items: str }, why: str });

/** The issue map after reading: the company, its issues and the merges proposed or made. */
const IssueMap = closed({
  company: closed({ name: strOrNull, sector: { enum: [...SECTOR_IDS, "other"] }, goals: strings, targets: strings, fictional: { type: "boolean" } }),
  issues: { type: "array", items: { $ref: "#/$defs/IssueRecord" } },
  merges: { type: "array", items: { $ref: "#/$defs/Merge" } }
});

/** The Writer's four texts for the report's summary, every figure a {{fact:key}} placeholder. */
const Recommendation = closed({
  headline: { type: "string", minLength: 1 },
  looked_at: { type: "string", minLength: 1 },
  found: { type: "string", minLength: 1 },
  needed: { type: "string", minLength: 1 }
});

/** The idea's own part of a build brief; the fixed parts come from the template in code. */
const BuildBrief = closed({
  idea: { type: "string", minLength: 1 },
  builds: { type: "string", minLength: 1 },
  steps: { type: "array", minItems: 3, maxItems: 7, items: str },
  key_figures: { type: "array", minItems: 2, maxItems: 4, items: closed({ name: str, measures: str }) },
  data: strings,
  tools: { type: "array", minItems: 1, items: closed({ name: str, does: str }) },
  guardrails: { type: "array", minItems: 1, items: str },
  golden_cases: { type: "array", minItems: 2, maxItems: 3, items: closed({ name: str, given: str, expect: str }) }
});

/** What the person chose in a recorded run, so playback can follow it or take another path. */
const Choices = closed({
  issues: { type: "array", items: closed({ id: str, action: { enum: ["keep", "merge", "park"] }, into: strOrNull, reason: strOrNull }) },
  weights: { anyOf: [{ type: "null" }, { $ref: "#/$defs/Weights" }] },
  shortlist: { type: "array", maxItems: 3, items: str },
  brief_idea: strOrNull
});

/** A recorded run in one language: every agent's answer as its output schema defines it. */
const Answers = closed({
  reader: { anyOf: [{ type: "null" }, { type: "object" }] },
  merges: { anyOf: [{ type: "null" }, { type: "object" }] },
  ideas: { type: "object" },
  recommendation: { $ref: "#/$defs/Recommendation" },
  brief: { anyOf: [{ type: "null" }, { type: "object" }] }
});

/** A scenario: one of the three fictional companies, its documents and a recorded run in both languages. */
const Scenario = closed({
  schema: { const: "pi-scenario/1" },
  id: { enum: ["s1", "s2", "s3"] },
  source: { enum: ["authored", "recorded"] },
  as_of: { type: "string", format: "date" },
  company: closed({ name: str, sector: { enum: SECTOR_IDS }, country: { type: "string", pattern: "^[A-Z]{2}$" }, fictional: { const: true } }),
  documents: { type: "array", minItems: 1, items: { $ref: "#/$defs/Document" } },
  answers: closed({ en: { $ref: "#/$defs/Answers" }, de: { $ref: "#/$defs/Answers" } }),
  choices: { $ref: "#/$defs/Choices" }
});

/** One event of a run, in the order it happened; js/run.js sorts them into the six steps. */
const RunEvent = closed({
  type: { enum: ["run_start", "documents", "request", "answer", "repair", "refusal", "issue_map", "decision", "ideas", "scores", "shortlist", "recommendation", "brief", "budget_stop", "error", "abort", "run_end"] },
  step: { enum: [...STEPS, null] },
  at: { type: "number", minimum: 0 },
  detail: { type: "object" }
});

/** Who did what: every approval and decision is logged with who made it. */
const AuditEvent = closed({
  at: { type: "number", minimum: 0 },
  who: { enum: ["person", "agent", "engine"] },
  action: { type: "string", minLength: 1 },
  detail: { anyOf: [{ type: "null" }, { type: "object" }] }
});

/** Every schema a $ref may name, by its name. */
export const REGISTRY = Object.freeze({
  ...D,
  Document, Quote, IssueKpi, IssueRecord, Source, Merge, IssueMap, Recommendation, BuildBrief, Choices, Answers, Scenario, RunEvent, AuditEvent
});

/** The brief's section 10, name by name. */
export const CONTRACTS = Object.freeze({
  Document,
  IssueMap,
  Issue: IssueRecord,
  Idea: D.Idea,
  KeyFigure: D.KeyFigure,
  Rating: D.Rating,
  Weights: D.Weights,
  Score: D.Score,
  Stability: D.Stability,
  Shortlist: D.Shortlist,
  Recommendation,
  BuildBrief,
  Scenario,
  RunEvent,
  AuditEvent
});

// ---- output schemas, for output_config.format -------------------------------------------------------------

const ratingWire = closed({ score: { type: "integer", enum: [1, 2, 3, 4, 5] }, reason: str });

/** The Reader's answer from documents: the company, its issues with KPIs and sources, and merges. */
export function readerSchema() {
  return closed({
    company: closed({
      name: { type: "string", description: "The company's name as the documents write it; empty when they don't say" },
      sector: { enum: [...SECTOR_IDS, "other"] },
      goals: strings,
      targets: { type: "array", items: str, description: "Published targets, as the documents state them" }
    }),
    issues: {
      type: "array",
      items: closed({
        id: { type: "string", description: "I1, I2 and on" },
        title: str,
        area: { type: "string", description: "The unit or function the issue sits in" },
        description: str,
        money_as_stated: { type: "string", description: "The money at stake as the document states it, in its words; empty when it states none" },
        eur_year_low: numOrNull,
        eur_year_high: numOrNull,
        eur_year_expected: numOrNull,
        eur_basis: { type: "string", description: "How the euros a year follow from the document; empty when they are null" },
        kpis: { type: "array", items: closed({ name: str, library_id: strOrNull, today: { type: "string", description: "Today's value as stated; empty when not stated" }, unit: str }) },
        sources: { type: "array", minItems: 1, items: closed({ file: str, where: { type: "string", description: "The page for a PDF, else the section" }, quote: { type: "string", description: "Word for word, at most 150 characters" } }) },
        confidence: { enum: ["low", "medium", "high"] }
      })
    },
    merges: { type: "array", items: closed({ keep: str, merged: strings, why: str }) }
  });
}

/** The Reader's short answer when only handoff files from several challengers came in: merges only. */
export function mergesSchema() {
  return closed({ merges: { type: "array", items: closed({ keep: str, merged: strings, why: str }) } });
}

/** The Ideator's answer: at most `count` ideas (the cap is in the description and enforced in code). */
export function ideasSchema(count = LIMITS.ideasDefault) {
  const v = Number(count);
  const n = Number.isFinite(v) ? Math.max(LIMITS.ideasMin, Math.min(LIMITS.ideasMax, Math.round(v))) : LIMITS.ideasDefault;
  return closed({
    ideas: {
      type: "array",
      minItems: 1,
      description: `At most ${n} ideas ({maxItems: ${n}})`,
      items: closed({
        name: { type: "string", description: "One to three words" },
        what_it_does: { type: "string", description: "One sentence, at most 25 words" },
        issues: { type: "array", minItems: 1, items: str, description: "Ids of kept issues this idea answers" },
        audience: { type: "string", description: "The unit or audience it is for" },
        room: { type: "array", minItems: 1, items: str, description: "What the room sees: three to five steps" },
        how: closed({ spot: str, check: str, calculate: str, propose: str, prepare: str, decision: str }),
        key_figures: {
          type: "array",
          minItems: 1,
          description: "Two or three",
          items: closed({
            name: str,
            today: { type: "string", description: "Today's value as a source states it; empty when not public" },
            source: { type: "string", description: "Where today's value comes from; empty when not public" },
            public: { type: "boolean" },
            demo: { type: "string", description: "What the demo shows" }
          })
        },
        data: { type: "array", items: str, description: "Public or synthetic sources" },
        risks: { type: "array", items: str, description: "At most three" },
        effort_days: closed({ low: { type: "integer" }, high: { type: "integer" } }),
        live_inputs: closed({ model_calls: { type: "integer" }, web_searches: { type: "integer" } }),
        ratings: closed(Object.fromEntries(CRITERIA.map((c) => [c, ratingWire]))),
        why: { type: "string", description: "One sentence for the recommendation" }
      })
    }
  });
}

/** The Writer's answer: four texts, every figure a placeholder. */
export function recommendationSchema() {
  return closed({ headline: str, looked_at: str, found: str, needed: str });
}

/** The Brief writer's answer: the idea's part of the build brief. */
export function briefSchema() {
  return closed({
    builds: str,
    steps: strings,
    key_figures: { type: "array", items: closed({ name: str, measures: str }) },
    data: strings,
    tools: { type: "array", items: closed({ name: str, does: str }) },
    guardrails: strings,
    golden_cases: { type: "array", items: closed({ name: str, given: str, expect: str }) }
  });
}

/** Every agent's output schema, for the tests and the estimate. */
export const OUTPUT_SCHEMAS = Object.freeze({
  reader: readerSchema,
  merges: mergesSchema,
  ideator: ideasSchema,
  writer: recommendationSchema,
  brief: briefSchema
});
