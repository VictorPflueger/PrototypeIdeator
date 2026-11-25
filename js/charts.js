// The two pictures of the run (brief §8): the honeycomb of ideas, one flat-top hexagon cell per idea as on
// the reference report's cover, and the chart of score against build effort. Both are built from the
// engine's results only. The chart follows the dataviz method (PLAN.md §10): one axis each, recessive
// grid, hexagon markers of 18 px with a 2 px surface ring, the build-effort range as a thin whisker, every
// idea labelled by name, a legend, a tooltip on hover and focus, and the score table beside it as its
// table view. Colour is the second channel, never the only one: the shortlist is filled merlot with its
// place inside (light #8f2f42, dark #de9b98), the other ideas are lilac outlines, since the AI wrote them
// (light #8d6aab, dark #6f4f89); both pairs were checked with the dataviz validator on 23 November 2026.
// Positions are SVG attributes and colours are classes, so the page's policy needs no style attribute.

import { h } from "./dom.js";
import { t, getLang } from "./i18n/index.js";
import { fmtScore, fmtInt } from "./format.js";

const SVG = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}, ...children) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) el.setAttribute(k, String(v));
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
};

/** The six corners of a flat-top hexagon of radius r around (x, y). */
export function hexPoints(x, y, r) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    pts.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/**
 * The longest word of a name, split at spaces and hyphens: a cell steps its font down for a long one, so
 * "Vulnerability" or "Leercontainer" stays whole where no hyphenation dictionary breaks it (review B7).
 */
const longWord = (name) => Math.max(0, ...String(name ?? "").split(/[\s\-\u2010\u2011]+/u).map((w) => w.length));

/**
 * The honeycomb: a list of hexagon cells, one per idea, each a button that opens the idea's page.
 * ideas: [{ id, name }]; picks: ids of the shortlist (their cells carry their place); onOpen(id). still:
 * for the report, cells that are text, not buttons, each with its score (scores: id → score in words).
 */
export function honeycomb(ideas, { picks = [], onOpen, still = false, scores = null, label = null, lang = getLang() } = {}) {
  const n = ideas.length;
  // Up to six ideas sit in one zigzag row; seven or eight fill two rows of four, nine or ten two rows of six.
  // Vici's honeycomb drops every second cell, which is every second column only in a single row or in rows of
  // an even length: two rows of three or five would lay one cell over another.
  const cols = n <= 6 ? Math.max(1, n) : n <= 8 ? 4 : 6;
  // The comb sits in a box that sizes its cells (css/app.css: .ideas-comb-wrap), so a wide comb fits its room.
  return h("div", { class: "ideas-comb-wrap" }, h("ul", { class: ["vc-honeycomb", "ideas-comb", `ideas-comb--${cols}`, still ? "ideas-comb--still" : ""], "aria-label": label || t("ideate.comb", null, lang) },
    ideas.map((idea) => {
      const place = picks.indexOf(idea.id);
      const inner = [
        place >= 0 ? h("span", { class: "comb-place" }, t("short.place", { n: place + 1 }, lang)) : null,
        h("span", { class: ["comb-name", longWord(idea.name) >= 15 ? "comb-name--longer" : longWord(idea.name) >= 12 ? "comb-name--long" : ""] }, idea.name),
        scores && scores[idea.id] ? h("span", { class: "comb-score" }, scores[idea.id]) : null
      ];
      const tone = ["vc-tile", place >= 0 ? "vc-tile--merlot comb-tile--pick" : "vc-tile--lilac", "comb-tile"];
      return h("li", { class: "comb-cell" }, still
        ? h("span", { class: tone, dataset: { idea: idea.id } }, inner)
        : h("button", {
          type: "button",
          class: tone,
          dataset: { idea: idea.id, action: "open-idea" },
          "aria-haspopup": "dialog",
          on: { click: () => onOpen?.(idea.id) }
        }, inner));
    })));
}

/**
 * A chart label's width in the chart's units for text of the given size: measured in the page's own font
 * where a canvas is at hand, with a little to spare for a font still loading; else about 0.55 of the size a
 * character.
 */
function labelWidth(size = 11.5) {
  let ctx = null;
  try {
    ctx = document.createElement("canvas").getContext("2d");
    if (ctx) ctx.font = `${size}px ${getComputedStyle(document.body).fontFamily || "sans-serif"}`;
  } catch { ctx = null; }
  return (text) => (ctx ? ctx.measureText(text).width * 1.04 + 1 : text.length * size * 0.55);
}

/**
 * Round numbers for an axis from lo to hi: about `count` ticks on a step of 1, 2, 2.5 or 5 times a power of
 * ten. A whole-number axis (person-days) never steps by 2.5 below 10, since its labels show no decimals.
 */
function ticks(lo, hi, count = 5, { whole = false } = {}) {
  const span = Math.max(hi - lo, 1e-9);
  const raw = span / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const steps = whole && p < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const step = steps.map((m) => m * p).find((x) => x >= raw && (!whole || Number.isInteger(x))) || 10 * p;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Math.round(v * 1000) / 1000);
  return { values: out, step };
}

/**
 * Score against build effort. rows: [{ id, name, value (score), low, high (person-days) }], in rank
 * order; picks: the shortlist's ids in order; height: the chart's height in its own units, 640 wide (the
 * report's is lower, so its page holds the table and the chart). Returns the figure with its legend and tooltip.
 */
export function scoreChart(rows, { picks = [], lang = getLang(), still = false, idPrefix = "score-chart", height = 320 } = {}) {
  const tr = (key, vars = null) => t(key, vars, lang);
  const W = 640;
  const H = height;
  const m = { top: 16, right: 24, bottom: 44, left: 52 };
  const days = rows.flatMap((r) => [r.low, r.high]);
  const scores = rows.map((r) => r.value);
  const xDomain = [Math.max(0, Math.floor((Math.min(...days) - 2) / 5) * 5), Math.ceil((Math.max(...days) + 2) / 5) * 5];
  const yLo = Math.max(1, Math.floor((Math.min(...scores) - 0.25) * 2) / 2);
  const yDomain = [yLo, 5];
  const x = (v) => m.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - m.left - m.right);
  const y = (v) => H - m.bottom - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - m.top - m.bottom);
  const xt = ticks(xDomain[0], xDomain[1], 6, { whole: true }).values;
  const yt = ticks(yDomain[0], yDomain[1], 4).values;

  const grid = s("g", { class: "chart-grid", "aria-hidden": "true" },
    yt.map((v) => s("line", { x1: m.left, x2: W - m.right, y1: y(v), y2: y(v) })));
  const axes = s("g", { class: "chart-axis", "aria-hidden": "true" },
    s("line", { x1: m.left, x2: W - m.right, y1: H - m.bottom, y2: H - m.bottom }),
    xt.map((v) => s("text", { x: x(v), y: H - m.bottom + 18, "text-anchor": "middle" }, fmtInt(v, lang))),
    yt.map((v) => s("text", { x: m.left - 8, y: y(v) + 4, "text-anchor": "end" }, fmtScore(v, lang))),
    s("text", { class: "chart-axis-title", x: (m.left + W - m.right) / 2, y: H - 6, "text-anchor": "middle" }, tr("score.chart.x")),
    s("text", { class: "chart-axis-title", x: 14, y: (m.top + H - m.bottom) / 2, "text-anchor": "middle", transform: `rotate(-90 14 ${(m.top + H - m.bottom) / 2})` }, tr("score.chart.y")));

  // Labels: each as near its marker as there is room (see near() for where), a line or more further out on a
  // thin leader where the crowd leaves no room beside it, and failing that the nearest free place in the plot,
  // on a leader. A label never covers another label, a marker or a range line (the gaps between its words
  // would show the line through it), nor leaves the plot, so every idea is named on paper, where no tooltip
  // helps. A crowd that leaves an idea unnamed is laid out again with the names a size smaller, twice at most.
  const base = rows.map((r) => ({ r, cx: x((r.low + r.high) / 2), cy: y(r.value) }));
  const markers = base.map((b) => ({ x1: b.cx - 10, x2: b.cx + 10, y1: b.cy - 9, y2: b.cy + 9 }));
  const ranges = base.map((b) => ({ x1: x(b.r.low) - 1, x2: x(b.r.high) + 1, y1: b.cy - 2, y2: b.cy + 2 }));
  const hits = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const crosses = (seg, box) => {
    const n = Math.max(2, Math.ceil(Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) / 2));
    for (let i = 0; i <= n; i++) {
      const px = seg.x1 + ((seg.x2 - seg.x1) * i) / n;
      const py = seg.y1 + ((seg.y2 - seg.y1) * i) / n;
      if (px > box.x1 + 0.5 && px < box.x2 - 0.5 && py > box.y1 + 0.5 && py < box.y2 - 0.5) return true;
    }
    return false;
  };
  const order = [...base].sort((p, q) => q.r.value - p.r.value || p.cx - q.cx);
  const placeAll = (size) => {
    const measure = labelWidth(size);
    const LINE = size + 3.5;
    const boxes = [];
    const leads = [];
    const label = new Map();
    // A label's box for its text's left end lx and its baseline ly: its letters reach about the text's size
    // above the baseline and a third of it below.
    const boxAt = (lx, ly, w) => ({ x1: lx - 2, x2: lx + w + 2, y1: ly - size, y2: ly + size * 0.3 });
    const free = (box) => box.x1 >= m.left + 2 && box.x2 <= W - 4 && box.y1 >= 2 && box.y2 <= H - m.bottom - 3
      && !boxes.some((o) => hits(o, box)) && !markers.some((o) => hits(o, box)) && !ranges.some((o) => hits(o, box))
      && !leads.some((seg) => crosses(seg, box));
    // A leader from the marker's edge to the nearest point of its label's box; none when the label touches it.
    const leader = (b, box) => {
      const px = Math.min(Math.max(b.cx, box.x1), box.x2);
      const py = Math.min(Math.max(b.cy, box.y1), box.y2);
      const d = Math.hypot(px - b.cx, py - b.cy);
      const r1 = (v) => Math.round(v * 10) / 10;
      return d < 16 ? null : { x1: r1(b.cx + ((px - b.cx) / d) * 12), y1: r1(b.cy + ((py - b.cy) / d) * 12), x2: r1(px), y2: r1(py) };
    };
    // A place whose box is free and whose leader, if it needs one, crosses no label and no other marker.
    const place = (b, own, lx, ly, w, lead) => {
      const box = boxAt(lx, ly, w);
      if (!free(box)) return null;
      const seg = lead ? leader(b, box) : null;
      if (seg && (boxes.some((o) => crosses(seg, o)) || markers.some((o, i) => i !== own && crosses(seg, o)))) return null;
      return { box, seg, lx, ly };
    };
    const take = (b, got) => { boxes.push(got.box); if (got.seg) leads.push(got.seg); label.set(b.r.id, { lx: got.lx, ly: got.ly, lead: got.seg }); };
    // Where a name may go, k lines out from its marker. Beside the marker (k = 0) it sits above its range line,
    // to the right, to the left or centred, or centred right under the marker, so it reads as its line's:
    // below the line and beside the marker it would sit on the next line down and read as that line's, so it
    // goes there only a line or more further out, on a leader.
    const near = (b, w, k) => {
      const up = b.cy - 6 - k * LINE;
      const down = b.cy + size + 4.5 + k * LINE;
      return k === 0
        ? [[b.cx + 12, up], [b.cx - 12 - w, up], [b.cx - w / 2, b.cy - 14], [b.cx - w / 2, b.cy + size + 12.5]]
        : [[b.cx + 12, up], [b.cx - 12 - w, up], [b.cx - w / 2, b.cy - 14 - k * LINE], [b.cx + 12, down], [b.cx - 12 - w, down], [b.cx - w / 2, b.cy + size + 12.5 + k * LINE]];
    };
    const tryNear = (b, from, to) => {
      const own = base.indexOf(b);
      const w = measure(b.r.name);
      for (let k = from; k <= to; k++) for (const [lx, ly] of near(b, w, k)) {
        const got = place(b, own, lx, ly, w, k > 0);
        if (got) { take(b, got); return true; }
      }
      return false;
    };
    // First every idea beside its marker, in score order; then, in score order, the ideas left a line or more
    // out on a leader; then any idea still left at the nearest free place in the plot.
    for (const b of order) tryNear(b, 0, 0);
    for (const b of order) if (!label.has(b.r.id)) tryNear(b, 1, 3);
    for (const b of order) {
      if (label.has(b.r.id)) continue;
      const own = base.indexOf(b);
      const w = measure(b.r.name);
      let best = null;
      for (let ly = 13; ly <= H - m.bottom - 6; ly += 2) for (let lx = m.left + 4; lx + w <= W - 6; lx += 3) {
        const d = Math.hypot(Math.max(lx - b.cx, 0, b.cx - lx - w), ly - 4 - b.cy);
        if (best && d >= best.d) continue;
        const p = place(b, own, lx, ly, w, true);
        if (p) best = { d, p };
      }
      if (best) take(b, best.p);
    }
    return label;
  };
  let size = 11.5;
  let label = placeAll(size);
  for (const smaller of [10.5, 9.5]) {
    if (label.size === base.length) break;
    const again = placeAll(smaller);
    if (again.size > label.size) { label = again; size = smaller; }
  }
  const points = base.map((b) => ({ ...b, label: label.get(b.r.id) || null, place: picks.indexOf(b.r.id) }));

  const tip = h("div", { class: "chart-tip", role: "status", hidden: true });
  const show = (p, on) => {
    if (!on) { tip.hidden = true; return; }
    tip.textContent = "";
    tip.append(
      h("strong", {}, `${fmtScore(p.r.value, lang)} `), h("span", {}, tr("score.chart.tipScore")),
      h("br"), h("span", {}, p.r.name), h("br"),
      h("span", { class: "chart-tip-sub" }, tr("score.chart.tipDays", { low: fmtInt(p.r.low, lang), high: fmtInt(p.r.high, lang) })),
      p.place >= 0 ? h("span", { class: "chart-tip-sub" }, ` · ${tr("short.placeLong", { n: p.place + 1 })}`) : null);
    // Placed through the CSS object model, which the policy allows (no style attribute is written as text).
    tip.dataset.side = p.cx > W / 2 ? "left" : "right";
    tip.style.left = `${((p.cx / W) * 100).toFixed(1)}%`;
    tip.style.top = `${((p.cy / H) * 100).toFixed(1)}%`;
    tip.hidden = false;
  };

  const marks = s("g", { class: "chart-marks" }, points.map((p) => {
    const pick = p.place >= 0;
    // Still, in the report, the chart is one picture named by its caption, and the table beside it holds
    // its values; on screen each marker is a picture of its own that the keyboard reaches.
    const g = s("g", {
      class: ["chart-point", pick ? "chart-point--pick" : ""].join(" ").trim(),
      tabindex: still ? null : "0",
      role: still ? null : "img",
      "aria-label": still ? null : `${p.r.name}: ${tr("score.chart.aria", { score: fmtScore(p.r.value, lang), low: fmtInt(p.r.low, lang), high: fmtInt(p.r.high, lang) })}${pick ? `, ${tr("short.placeLong", { n: p.place + 1 })}` : ""}`,
      "data-idea": p.r.id
    },
    s("line", { class: "chart-whisker", x1: x(p.r.low), x2: x(p.r.high), y1: p.cy, y2: p.cy }),
    s("polygon", { class: "chart-hit", points: hexPoints(p.cx, p.cy, 17) }),
    s("polygon", { class: "chart-hex", points: hexPoints(p.cx, p.cy, 9) }),
    pick ? s("text", { class: "chart-place", x: p.cx, y: p.cy + 3.5, "text-anchor": "middle" }, String(p.place + 1)) : null);
    if (!still) for (const [ev, on] of [["pointerenter", true], ["pointerleave", false], ["focus", true], ["blur", false]]) g.addEventListener(ev, () => show(p, on));
    return g;
  }));

  // The names over every marker and range line, so a later point never paints over an earlier name; the
  // markers carry the names for screen readers, so the labels are for the eye only.
  const names = s("g", { class: ["chart-labels", size < 11.5 ? `chart-labels--${size === 10.5 ? "small" : "smaller"}` : ""].join(" ").trim(), "aria-hidden": "true" }, points.filter((p) => p.label).map((p) => [
    p.label.lead ? s("line", { class: "chart-leader", ...p.label.lead }) : null,
    s("text", { class: "chart-label", x: Math.round(p.label.lx * 10) / 10, y: Math.round(p.label.ly * 10) / 10, "data-idea": p.r.id }, p.r.name)
  ]));
  const svg = s("svg", { class: "score-chart", viewBox: `0 0 ${W} ${H}`, role: still ? "img" : "group", "aria-labelledby": `${idPrefix}-title` }, grid, axes, marks, names);
  // One series needs no legend; once there is a shortlist, the legend tells its filled markers from the rest.
  const legend = picks.length === 0 ? null : h("ul", { class: "vc-legend chart-legend" },
    h("li", {}, h("span", { class: "legend-hex legend-hex--pick", "aria-hidden": "true" }), tr("score.chart.picks")),
    h("li", {}, h("span", { class: "legend-hex", "aria-hidden": "true" }), tr("score.chart.others")));
  return h("figure", { class: "score-figure" },
    h("figcaption", { class: "score-figure__title", id: `${idPrefix}-title` }, tr("score.chart.title")),
    h("div", { class: "score-figure__plot" }, svg, still ? null : tip),
    legend);
}
