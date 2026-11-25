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
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
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
        h("span", { class: "comb-name" }, idea.name),
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

/** Round numbers for an axis from lo to hi: about `count` ticks on a step of 1, 2 or 5 times a power of ten. */
function ticks(lo, hi, count = 5) {
  const span = Math.max(hi - lo, 1e-9);
  const raw = span / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= raw) || 10 * p;
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
  const xt = ticks(xDomain[0], xDomain[1], 6).values;
  const yt = ticks(yDomain[0], yDomain[1], 4).values;

  const grid = s("g", { class: "chart-grid", "aria-hidden": "true" },
    yt.map((v) => s("line", { x1: m.left, x2: W - m.right, y1: y(v), y2: y(v) })));
  const axes = s("g", { class: "chart-axis", "aria-hidden": "true" },
    s("line", { x1: m.left, x2: W - m.right, y1: H - m.bottom, y2: H - m.bottom }),
    xt.map((v) => s("text", { x: x(v), y: H - m.bottom + 18, "text-anchor": "middle" }, fmtInt(v, lang))),
    yt.map((v) => s("text", { x: m.left - 8, y: y(v) + 4, "text-anchor": "end" }, fmtScore(v, lang))),
    s("text", { class: "chart-axis-title", x: (m.left + W - m.right) / 2, y: H - 6, "text-anchor": "middle" }, tr("score.chart.x")),
    s("text", { class: "chart-axis-title", x: 14, y: (m.top + H - m.bottom) / 2, "text-anchor": "middle", transform: `rotate(-90 14 ${(m.top + H - m.bottom) / 2})` }, tr("score.chart.y")));

  // Labels, greedily from the highest score down: beside the marker on the right, else on the left, else a
  // line or two above or below; a label is never drawn over another label, another marker or the plot's
  // edge. An idea whose label finds no room keeps its marker, its tooltip and its row in the table.
  const CHAR = 6.3;
  const LINE = 13;
  const boxes = [];
  const marker = (cx, cy) => ({ x1: cx - 10, x2: cx + 10, y1: cy - 9, y2: cy + 9 });
  const base = rows.map((r) => ({ r, cx: x((r.low + r.high) / 2), cy: y(r.value) }));
  const markers = base.map((b) => marker(b.cx, b.cy));
  const hits = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  const label = new Map();
  for (const b of [...base].sort((p, q) => q.r.value - p.r.value || p.cx - q.cx)) {
    const w = b.r.name.length * CHAR + 4;
    const own = markers[base.indexOf(b)];
    const tries = [];
    for (const dy of [0, -LINE, LINE, -2 * LINE, 2 * LINE]) for (const right of [true, false]) tries.push({ right, dy });
    for (const { right, dy } of tries) {
      const lx = right ? b.cx + 14 : b.cx - 14;
      const ly = b.cy + 4 + dy;
      const box = { x1: right ? lx : lx - w, x2: right ? lx + w : lx, y1: ly - 10, y2: ly + 3 };
      const inside = box.x1 >= m.left && box.x2 <= W - 4 && box.y1 >= 2 && box.y2 <= H - m.bottom - 2;
      if (!inside || boxes.some((o) => hits(o, box)) || markers.some((o) => o !== own && hits(o, box))) continue;
      boxes.push(box);
      label.set(b.r.id, { lx, ly, right });
      break;
    }
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
    pick ? s("text", { class: "chart-place", x: p.cx, y: p.cy + 3.5, "text-anchor": "middle" }, String(p.place + 1)) : null,
    p.label ? s("text", { class: "chart-label", x: p.label.lx, y: p.label.ly, "text-anchor": p.label.right ? "start" : "end" }, p.r.name) : null);
    if (!still) for (const [ev, on] of [["pointerenter", true], ["pointerleave", false], ["focus", true], ["blur", false]]) g.addEventListener(ev, () => show(p, on));
    return g;
  }));

  const svg = s("svg", { class: "score-chart", viewBox: `0 0 ${W} ${H}`, role: still ? "img" : "group", "aria-labelledby": `${idPrefix}-title` }, grid, axes, marks);
  // One series needs no legend; once there is a shortlist, the legend tells its filled markers from the rest.
  const legend = picks.length === 0 ? null : h("ul", { class: "vc-legend chart-legend" },
    h("li", {}, h("span", { class: "legend-hex legend-hex--pick", "aria-hidden": "true" }), tr("score.chart.picks")),
    h("li", {}, h("span", { class: "legend-hex", "aria-hidden": "true" }), tr("score.chart.others")));
  return h("figure", { class: "score-figure" },
    h("figcaption", { class: "score-figure__title", id: `${idPrefix}-title` }, tr("score.chart.title")),
    h("div", { class: "score-figure__plot" }, svg, still ? null : tip),
    legend);
}
