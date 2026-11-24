// The report a run ends in (brief §9 and §9.1, PLAN.md §11), on Vici's report pattern
// (components/report.html, ViciDesign 64044bd): an article.vc-report of pages, the cover first, that reads
// as light sheets on screen, prints on A4 with the prototype's footer on every page and leaves as an HTML
// file of its own. Code assembles it from the run; no model writes its layout. It is written in the run's
// language, and what the AI wrote, suggested or estimated keeps its lilac tag. A printed page has no
// pointer, so nothing in it is a button, a field or a tooltip that holds a fact.

import { h } from "./dom.js";
import { t, tn } from "./i18n/index.js";
import { fmtScore, fmtEur, fmtEurCompact, fmtEurRange, fmtInt, fmtDate } from "./format.js";
import { renderFacts } from "./facts.js";
import { CRITERIA, DEFAULT_WEIGHTS } from "./engine.js";
import { honeycomb, scoreChart } from "./charts.js";
import { ideaPage } from "./views/ideate.js";
import { namesOf, uncheckedTag, uncheckedNote } from "./views/common.js";
import { APP } from "./config.js";
import { SECTORS } from "../data/kpis.js";

const LINKEDIN = "https://www.linkedin.com/in/victorpflueger";
const WEBSITE = "https://victorpflueger.github.io/VIP/index.html";

/** Why a live run stopped, for the notice on every page: budget, repair, abort or error. */
export function stopReason(stop) {
  const key = String(stop?.key || "");
  if (key.startsWith("live.budget.")) return "budget";
  if (/^live\.(failed|declined|cut)\./.test(key)) return "repair";
  if (key === "live.stopped") return "abort";
  return "error";
}

/**
 * The report of a run. meta: { lang, mode (simulation or live), date (an ISO day), model and setting (a
 * live run's, in words), files (how many documents were read), stopped ({ agent, reason } when a live run
 * stopped early), unchecked ({ issues, ideas, report }: what the fact audit refused twice), cutoff (true
 * when no web research ran), level (the title's heading level: 3 inside the Report step's panel, whose
 * title is an h2), id (a prefix for the ids inside), reportId (the article's own id) }.
 */
export function reportDoc(run, meta) {
  const lang = meta.lang;
  const tr = (key, vars = null) => t(key, vars, lang);
  const L = meta.level || 3;
  const P = meta.id || "rep";
  const ideas = run.ideas || [];
  const ranked = run.ranked || [];
  const names = namesOf({ issues: run.issues, ideas });
  const fill = (text) => renderFacts(text, run.facts, lang);
  const marks = meta.unchecked || { issues: new Set(), ideas: new Set(), report: new Set() };
  const ai = () => h("span", { class: "vc-tag vc-tag--feature vc-tag--sm ai-tag" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), tr("ai.tag"));
  const kept = run.issues.filter((i) => i.status === "kept");
  const merged = run.issues.filter((i) => i.status === "merged");
  const parked = run.issues.filter((i) => i.status === "parked");
  const picks = ideas.length ? (run.shortlist?.picks || []).map((p) => p.idea) : [];
  const hasIdeas = ideas.length > 0 && ranked.length > 0;
  const company = run.company?.name || "";
  const ideaOf = (id) => ideas.find((i) => i.id === id);
  const cost = (id) => run.facts[`idea.${id}.cost`]?.value;

  /** A page: its heading one level below the title, then what it holds. */
  const page = (key, title, ...children) => h("section", { class: ["vc-report__page", "rep-page", `rep-page--${key}`], "aria-labelledby": `${P}-${key}` },
    h(`h${L + 1}`, { id: `${P}-${key}` }, title), ...children);
  const part = (title, ...children) => [h(`h${L + 2}`, { class: "rep-h" }, title), ...children];
  const table = (cls, caption, head, rows) => h("div", { class: "vc-table-wrap rep-table-wrap" },
    h("table", { class: ["vc-table", "vc-table--compact", "rep-table", cls] },
      h("caption", { class: "vc-visually-hidden" }, caption),
      h("thead", {}, h("tr", {}, head.map(([text, num]) => h("th", { scope: "col", class: num ? "vc-num" : null }, text)))),
      h("tbody", {}, rows)));
  const ideasFor = (issueId) => ideas.filter((idea) => idea.issues.some((id) => id === issueId || names.keptOf(id)?.id === issueId)).map((idea) => idea.name);

  // ---- The assumptions first: the issue map and the costs point to them by number -------------------
  const assumptions = [];
  const assume = (text) => { assumptions.push(text); return `A${assumptions.length}`; };
  const estimateRef = new Map();
  for (const i of kept.concat(merged)) {
    if (i.estimate && typeof i.eur_year_expected === "number") {
      estimateRef.set(i.id, assume(tr("rep.src.estimate", { title: i.title, amount: fmtEurCompact(i.eur_year_expected, lang), basis: i.eur_basis || "" }).trim()));
    }
  }
  const mergedRef = merged.length ? assume(tr("rep.src.merged")) : null;
  const ruleRef = hasIdeas ? assume(tr("rep.src.rule", { rule: tr("rep.built.basis") })) : null;
  assume(tr("rep.src.rate"));
  if (run.company?.fictional) assume(tr("rep.src.fictional"));
  const ref = (a) => (a ? h("span", { class: "rep-ref" }, a) : null);

  // ---- 1 Cover ----------------------------------------------------------------------------------------------
  const scores = Object.fromEntries(ranked.map((r) => [r.id, fmtScore(r.value, lang)]));
  const byRank = ranked.map((r) => ideaOf(r.id)).filter(Boolean);
  const sector = SECTORS.find((s) => s.id === run.company?.sector)?.name?.[lang] || "";
  const metaRows = [
    [tr("rep.meta.date"), fmtDate(meta.date, lang)],
    [tr("rep.meta.mode"), meta.mode === "live" ? tr("rep.meta.live", { model: meta.model || "", setting: meta.setting || "" }) : tr("rep.meta.sim")],
    sector ? [tr("rep.meta.sector"), sector] : null,
    meta.files ? [tr("rep.meta.read"), tn("read.files", meta.files, {}, lang)] : null,
    [tr("rep.meta.language"), tr(`rep.lang.${lang}`)]
  ].filter(Boolean);
  const cover = h("section", { class: "vc-report__page vc-report__cover rep-cover", "aria-labelledby": `${P}-title` },
    h("p", { class: "vc-report__brand" },
      h("span", { class: "vc-cell vc-cell--sm vc-cell--lilac", "aria-hidden": "true" }, h("span", { class: "vc-icon vc-icon--sparkle" })),
      h("span", {}, APP.name)),
    h("div", { class: "vc-report__heading" },
      h(`h${L}`, { class: "vc-report__title", id: `${P}-title` }, hasIdeas ? tn("rep.title", ideas.length, { company }, lang) : tr("rep.titleIssues", { company })),
      h("p", { class: "vc-report__subtitle" }, hasIdeas ? tr("rep.subtitle") : tr("rep.subtitleIssues")),
      h("p", { class: "rep-tags" },
        h("span", { class: "vc-tag vc-tag--feature" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), tr("rep.ai")),
        run.company?.fictional ? h("span", { class: "vc-tag" }, tr("fiction.tag")) : null),
      hasIdeas ? honeycomb(byRank, { picks, still: true, scores, label: tr("rep.comb"), lang }) : null),
    h("dl", { class: "vc-report__meta" }, metaRows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])));

  // ---- 2 The short version ----------------------------------------------------------------------------------
  const rec = run.recommendation;
  const sourceCount = new Set(run.issues.flatMap((i) => (i.evidence || []).map((e) => e.url).concat((i.quotes || []).map((q) => `${q.file}|${q.where}`)))).size;
  const stat = (label, value) => h("div", { class: "vc-stat rep-stat" }, h("p", { class: "vc-stat__label" }, label), h("p", { class: "vc-stat__value" }, value));
  const written = (field) => (rec
    ? h("p", {}, fill(rec[field]), " ", ai(), marks.report.has(field) ? uncheckedTag(lang) : null)
    : h("p", { class: "rep-muted" }, tr("rep.notWritten")));
  const recommendation = () => h("ol", { class: "rep-picks" }, (run.recommended || []).map((p) => h("li", {},
    h("p", { class: "rep-pick__head" }, h("strong", {}, p.name), " ", h("span", { class: "rep-muted" }, tr("report.pickLine", { score: fmtScore(p.value, lang), rank: p.rank }))),
    h("p", {}, fill(p.why), " ", ai()),
    h("p", { class: "rep-muted" }, tr("report.pickCost", { cost: fmtEur(p.cost, lang) }), " ", ref(ruleRef)))));
  const where = [
    tr("rep.map.title"),
    hasIdeas ? tr("rep.glance.title") : null,
    hasIdeas ? tr("rep.where.ideas", { names: byRank.map((i) => i.name).join(", ") }) : null,
    hasIdeas ? tr("rep.scored.title") : null,
    hasIdeas ? tr("rep.built.title") : null,
    hasIdeas ? tr("rep.vote.title") : null,
    tr("rep.src.title"),
    tr("rep.about.title")
  ].filter(Boolean);
  const unwritten = [...marks.report].length > 0;
  const short = page("short", tr("report.kicker"),
    unwritten ? uncheckedNote(lang) : null,
    rec ? h("p", { class: "rep-headline" }, fill(rec.headline), " ", ai(), marks.report.has("headline") ? uncheckedTag(lang) : null) : null,
    h("div", { class: "rep-stats" },
      stat(tr("report.stat.issues"), fmtInt(kept.length, lang)),
      stat(tr("report.stat.ideas"), fmtInt(ideas.length, lang)),
      stat(tr("report.stat.sources"), fmtInt(sourceCount, lang)),
      stat(tr("report.stat.top"), hasIdeas ? fmtScore(ranked[0].value, lang) : "…")),
    ...part(tr("report.lookedAt"), written("looked_at")),
    ...part(tr("report.found"), written("found")),
    ...(hasIdeas ? part(tr("report.recommend"), h("p", { class: "rep-muted" }, tr("report.byCode")), recommendation()) : []),
    ...part(tr("report.needed"), written("needed")),
    ...part(tr("rep.where"), h("ol", { class: "rep-where" }, where.map((x) => h("li", {}, x)))));

  // ---- 3 Issue map ------------------------------------------------------------------------------------------
  const stake = (issue) => {
    if (typeof issue.eur_year_expected !== "number") {
      return [h("span", { class: "rep-muted" }, tr("read.notStated")), issue.money_as_stated ? h("span", { class: "rep-sub" }, issue.money_as_stated) : null];
    }
    const group = run.facts[`issue.${issue.id}.eur`]?.value ?? null;
    const fromGroup = group !== null && group !== issue.eur_year_expected;
    return [
      h("strong", {}, fmtEurCompact(group ?? issue.eur_year_expected, lang)),
      fromGroup ? h("span", { class: "rep-sub" }, tr("read.largest"), " ", ref(mergedRef)) : null,
      !fromGroup && typeof issue.eur_year_low === "number" ? h("span", { class: "rep-sub" }, fmtEurRange(issue.eur_year_low, issue.eur_year_high, lang)) : null,
      issue.estimate ? h("span", { class: "rep-sub" }, h("span", { class: "vc-tag vc-tag--feature vc-tag--sm ai-tag" }, h("span", { class: "vc-icon vc-icon--sparkle", "aria-hidden": "true" }), tr("read.aiEstimate")), " ", ref(estimateRef.get(issue.id))) : null
    ];
  };
  const found = (issue) => {
    if (issue.source?.kind === "handoff") return issue.source.tool?.name || "";
    const q = issue.quotes?.[0];
    return q ? `${q.file}, ${q.where}` : issue.source?.file || "";
  };
  const mapPage = page("map", tr("rep.map.title"),
    h("p", { class: "rep-lead" }, tn("rep.map.lead", kept.length, {}, lang)),
    table("rep-map", tr("rep.map.title"),
      [[tr("rep.map.col.issue")], [tr("rep.map.col.stake"), true], [tr("rep.map.col.kpis")], [tr("rep.map.col.source")], [tr("rep.map.col.ideas")]],
      kept.map((issue) => {
        const members = merged.filter((m) => m.merged_into === issue.id);
        const kpis = (issue.kpis || []).map((k) => (k.today ? `${k.name}: ${k.today}` : k.name)).join("; ");
        const answered = ideasFor(issue.id);
        return h("tr", { dataset: { issue: issue.id } },
          h("th", { scope: "row" },
            h("span", { class: "rep-issue" }, issue.title, marks.issues.has(issue.id) ? uncheckedTag(lang) : null),
            issue.area ? h("span", { class: "rep-sub" }, issue.area) : null,
            members.length ? h("span", { class: "rep-sub" }, tr("rep.map.with", { titles: members.map((m) => m.title).join("; ") })) : null),
          h("td", { class: "vc-num" }, stake(issue)),
          h("td", {}, kpis),
          h("td", {}, found(issue)),
          h("td", {}, answered.length ? answered.join(", ") : h("span", { class: "rep-muted" }, tr("rep.map.noIdea"))));
      })),
    ...part(tr("rep.map.parked"), parked.length
      ? h("ul", { class: "rep-parked" }, parked.map((i) => h("li", {}, h("strong", {}, i.title), `: ${i.park_reason || tr("read.reason.scope")}`)))
      : h("p", { class: "rep-muted" }, tr("rep.map.parkedNone"))));

  // ---- 4 The ideas at a glance ------------------------------------------------------------------------------
  const glance = hasIdeas ? page("glance", tr("rep.glance.title"),
    h("p", { class: "rep-lead" }, tr("rep.glance.lead")),
    table("rep-glance", tr("rep.glance.title"),
      [[tr("score.col.rank"), true], [tr("score.col.idea")], [tr("rep.glance.col.answers")], [tr("rep.glance.col.what")], [tr("rep.glance.col.days"), true], [tr("rep.glance.col.cost"), true], [tr("rep.glance.col.score"), true]],
      ranked.map((r) => {
        const idea = ideaOf(r.id);
        const place = picks.indexOf(r.id);
        return h("tr", { class: place >= 0 ? "is-pick" : null, dataset: { idea: r.id } },
          h("td", { class: "vc-num" }, String(r.rank)),
          h("th", { scope: "row" }, idea.name, place >= 0 ? h("span", { class: "rep-sub" }, tr("rep.idea.place", { n: place + 1 })) : null),
          h("td", {}, [...new Set(idea.issues.map((id) => (names.keptOf(id) || names.issue(id))?.title).filter(Boolean))].join("; ")),
          h("td", {}, fill(idea.what_it_does)),
          h("td", { class: "vc-num" }, tr("rep.glance.days", { low: fmtInt(idea.effort_days.low, lang), high: fmtInt(idea.effort_days.high, lang) })),
          h("td", { class: "vc-num" }, fmtEur(cost(r.id), lang)),
          h("td", { class: "vc-num" }, h("strong", {}, fmtScore(r.value, lang))));
      })),
    h("div", { class: "rep-chart vc-report__keep" }, scoreChart(ranked.map((r) => {
      const idea = ideaOf(r.id);
      return { id: r.id, name: r.name, value: r.value, low: idea.effort_days.low, high: idea.effort_days.high };
    }), { picks, lang, still: true, idPrefix: `${P}-chart` }))) : null;

  // ---- 5 One page per idea ----------------------------------------------------------------------------------
  const ideaPages = hasIdeas ? ranked.map((r) => {
    const idea = ideaOf(r.id);
    const place = picks.indexOf(r.id);
    return h("section", { class: "vc-report__page rep-page rep-page--idea", "aria-labelledby": `${P}-idea-${r.id}`, dataset: { idea: r.id } },
      h(`h${L + 1}`, { id: `${P}-idea-${r.id}`, class: "rep-idea-title" }, `${r.rank}. ${idea.name}`),
      h("p", { class: "rep-idea-tags" }, ai(), place >= 0 ? h("span", { class: "vc-tag vc-tag--sm rep-place" }, tr("rep.idea.place", { n: place + 1 })) : null),
      ideaPage(idea, { run: { ...run, ideas }, lang, unchecked: marks.ideas.has(r.id), level: L + 2 }));
  }) : [];

  // ---- 6 How they were scored -------------------------------------------------------------------------------
  const weights = run.weights || DEFAULT_WEIGHTS;
  const stLabel = (l) => (l === "current" ? tr("score.st.current") : l === "equal" ? tr("score.st.equal") : tr("score.st.without", { criterion: tr(`crit.${l.split(":")[1]}`) }));
  const st = run.stability;
  const scored = hasIdeas ? page("scored", tr("rep.scored.title"),
    h("p", { class: "rep-lead" }, tr("rep.scored.lead")),
    ...part(tr("rep.scored.criteria"), table("rep-criteria", tr("rep.scored.criteria"),
      [[tr("rep.scored.col.criterion")], [tr("rep.scored.col.weight"), true], [tr("rep.scored.col.question")]],
      CRITERIA.map((c) => h("tr", {}, h("th", { scope: "row" }, tr(`crit.${c}`)), h("td", { class: "vc-num" }, `${weights[c]} %`), h("td", {}, tr(`crit.q.${c}`)))))),
    ...part(tr("rep.scored.scores"),
      table("rep-scores", tr("rep.scored.scores"),
        [[tr("score.col.rank"), true], [tr("score.col.idea")], ...CRITERIA.map((c) => [tr(`crit.short.${c}`), true]), [tr("rep.glance.col.score"), true]],
        ranked.map((r) => h("tr", { class: picks.includes(r.id) ? "is-pick" : null },
          h("td", { class: "vc-num" }, String(r.rank)),
          h("th", { scope: "row" }, ideaOf(r.id).name),
          CRITERIA.map((c) => h("td", { class: "vc-num" }, String(ideaOf(r.id).ratings[c].score))),
          h("td", { class: "vc-num" }, h("strong", {}, fmtScore(r.value, lang)))))),
      h("p", { class: "rep-note" }, CRITERIA.map((c) => `${tr(`crit.short.${c}`)}: ${tr(`crit.${c}`)}`).join(" · "))),
    ...part(tr("rep.scored.stability"),
      h("p", {}, run.sentence),
      h("div", { class: "rep-two" },
        table("rep-stability", tr("score.st.caption", { of: st.of }),
          [[tr("score.st.weights")], [tr("score.st.place", { n: 1 })], [tr("score.st.place", { n: 2 })], [tr("score.st.place", { n: 3 })]],
          st.rankings.map((row) => h("tr", {}, h("th", { scope: "row" }, stLabel(row.label)), row.order.slice(0, 3).map((id) => h("td", {}, names.ideaName(id)))))),
        table("rep-counts", tr("score.st.counts"),
          [[tr("score.col.idea")], [tr("score.st.firsts"), true], [tr("score.st.top3"), true]],
          st.order.map((id) => h("tr", {}, h("th", { scope: "row" }, names.ideaName(id)),
            h("td", { class: "vc-num" }, tr("score.st.of", { n: st.counts[id].firsts, of: st.of })),
            h("td", { class: "vc-num" }, tr("score.st.of", { n: st.counts[id].top3, of: st.of }))))))),
    ...part(tr("rep.scored.recommend"), recommendation())) : null;

  // ---- 7 How they would be built ----------------------------------------------------------------------------
  const built = hasIdeas ? page("built", tr("rep.built.title"),
    h("p", { class: "rep-lead" }, tr("rep.built.lead")),
    h("ul", { class: "rep-pattern" }, ["rep.built.p1", "rep.built.p2", "rep.built.p3"].map((k) => h("li", {}, tr(k)))),
    ...part(tr("rep.built.costs"),
      table("rep-costs", tr("rep.built.costs"),
        [[tr("score.col.idea")], [tr("rep.built.col.calls"), true], [tr("rep.built.col.searches"), true], [tr("rep.built.col.single"), true], [tr("rep.built.col.twenty"), true]],
        ranked.map((r) => {
          const idea = ideaOf(r.id);
          return h("tr", {},
            h("th", { scope: "row" }, idea.name),
            h("td", { class: "vc-num" }, fmtInt(idea.live_inputs.model_calls, lang)),
            h("td", { class: "vc-num" }, fmtInt(idea.live_inputs.web_searches, lang)),
            h("td", { class: "vc-num" }, fmtEur(cost(r.id), lang)),
            h("td", { class: "vc-num" }, fmtEur(cost(r.id) * 20, lang)));
        })),
      h("p", { class: "rep-note" }, tr("rep.built.basis"), " ", ref(ruleRef)))) : null;

  // ---- 8 Vote sheet -----------------------------------------------------------------------------------------
  // Boxes to write in by hand: a report holds no field, and Chromium keeps none in the PDF it saves.
  const box = (cls) => h("span", { class: ["rep-box", cls], "aria-hidden": "true" });
  const vote = hasIdeas ? page("vote", tr("rep.vote.title"),
    h("p", { class: "rep-lead" }, tr("rep.vote.lead")),
    table("rep-vote", tr("rep.vote.title"),
      [[tr("score.col.idea")], [tr("rep.glance.col.score"), true], [tr("rep.vote.col.rank")], [tr("rep.vote.col.why")]],
      ranked.map((r) => h("tr", {},
        h("th", { scope: "row" }, ideaOf(r.id).name),
        h("td", { class: "vc-num" }, fmtScore(r.value, lang)),
        h("td", { class: "rep-vote-rank" }, box("rep-box--rank")),
        h("td", { class: "rep-vote-why" }, box("rep-box--why"))))),
    h("div", { class: "rep-vote-lines vc-report__keep" },
      h("p", {}, h("span", { class: "rep-vote-label" }, tr("rep.vote.name")), box("rep-box--line")),
      h("p", {}, h("span", { class: "rep-vote-label" }, tr("rep.vote.room")), box("rep-box--lines")))) : null;

  // ---- 9 Assumptions and sources ----------------------------------------------------------------------------
  const evidence = new Map();
  for (const i of run.issues) for (const e of i.evidence || []) if (e.url && !evidence.has(e.url)) evidence.set(e.url, e);
  const docs = new Map();
  for (const i of run.issues) {
    if (i.source?.kind === "handoff" && i.source.file) docs.set(`report|${i.source.file}`, [tr("rep.src.report", { file: i.source.file })]);
    for (const q of i.quotes || []) {
      docs.set(`${q.file}|${q.where}|${q.text}`, [tr("rep.src.quote", { file: q.file, where: q.where, text: q.text }), q.checked === "not-checked" ? h("span", { class: "rep-muted" }, ` (${tr("read.notChecked")})`) : null]);
    }
  }
  const srcPage = page("sources", tr("rep.src.title"),
    ...part(tr("rep.src.assumptions"),
      h("p", { class: "rep-lead" }, tr("rep.src.assumptionsLead")),
      h("ol", { class: "rep-assumptions" }, assumptions.map((a, k) => h("li", {}, h("span", { class: "rep-a" }, `A${k + 1}`), h("span", {}, a))))),
    ...part(tr("rep.src.sources"),
      evidence.size || docs.size
        ? h("ul", { class: "rep-sources" },
          [...evidence.values()].map((e) => h("li", {}, h("a", { class: "vc-link", href: e.url }, e.title), e.read_on ? `, ${tr("rep.src.readOn", { date: fmtDate(e.read_on, lang) })}` : "")),
          [...docs.values()].map((d) => h("li", {}, d)))
        : h("p", { class: "rep-muted" }, tr("rep.src.none")),
      meta.cutoff ? h("p", { class: "rep-note" }, tr("report.cutoff")) : null));

  // ---- 10 About this report ---------------------------------------------------------------------------------
  const [toolBefore, toolAfter = ""] = tr("rep.about.tool").split("{url}");
  const about = page("about", tr("rep.about.title"),
    h("p", {}, tr("report.public")),
    h("p", {}, tr("p.public")),
    h("p", {}, tr("rep.about.made")),
    h("p", {}, toolBefore, h("a", { class: "vc-link", href: APP.url }, APP.url), toolAfter),
    h("p", { class: "vc-byline rep-byline" },
      h("span", { class: "vc-byline__label" }, tr("p.byline.label")),
      h("a", { class: "vc-byline__person", href: LINKEDIN, rel: "author noopener", target: "_blank" },
        h("span", { class: "vc-avatar vc-avatar--xs" }, h("img", { src: "vici/assets/brand/portrait-96.jpg", alt: "", width: "96", height: "96" })),
        h("span", { class: "vc-byline__name" }, "Victor Pflüger"),
        h("img", { class: "vc-platform-mark", src: "vici/assets/marks/linkedin.png", alt: "", width: "840", height: "779" }),
        h("span", { class: "vc-visually-hidden" }, tr("p.byline.linkedin"))),
      h("a", { class: "vc-byline__icon", href: WEBSITE, rel: "author noopener", target: "_blank", "aria-label": tr("p.byline.website") },
        h("span", { class: "vc-icon vc-icon--globe-hex", "aria-hidden": "true" }))));

  const notice = meta.stopped ? tr(`rep.stopped.${meta.stopped.reason}`, { agent: tr(`rep.agent.${meta.stopped.agent || "writer"}`) }) : null;
  return h("article", {
    class: "vc-report pi-report",
    id: meta.reportId || null,
    lang: lang === "de" ? "de" : "en-GB",
    "data-theme": "light",
    "data-vc-footer-start": tr("rep.footer.start"),
    "data-vc-footer-end": tr("rep.footer.end"),
    "data-vc-footer-of": tr("rep.footer.of"),
    "data-vc-notice": notice
  },
  notice ? h("p", { class: "vc-alert vc-alert--warning rep-stopped", role: "note" }, h("span", { class: "vc-icon vc-icon--warning", "aria-hidden": "true" }), h("span", {}, notice)) : null,
  cover, short, mapPage, glance, ...ideaPages, scored, built, vote, srcPage, about,
  h("footer", { class: "vc-report__footer" }, h("span", {}, tr("rep.footer.left")), h("span", {}, tr("rep.footer.right"))));
}
