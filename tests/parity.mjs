// The parts the four tools share (brief §4.1) are the same files in every repository: the KPI library,
// the handoff file's schema and its module twin, js/risk.js (whose money format the Ideator imports), the
// live client (anthropic.js, sse.js, cost.js) and the key store held in memory. Each is compared byte for
// byte with every sibling whose checkout sits beside this repository and has the file: the first tool to
// merge a shared file is its source, and every other copies it unchanged, so all of them must agree. A
// part no sibling has yet is this tool's to set: the result names it, and the next tool copies it.
// js/anthropic.js can be identical in all four because it names the tool through config.js.
// Siblings are looked for in SIBLINGS_DIR, else next to this repository (../BMC-challenger and so on).
// Without any checkout the suite says so and passes, unless --require-siblings is given.
// Prints PARITY OK.
// Usage: node tests/parity.mjs [--require-siblings]
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { APP_ROOT } from "./lib/harness.mjs";
import { createReport } from "./lib/report.mjs";

const SIBLINGS = [
  { id: "bmc", name: "Business Model Canvas Challenger", repo: "BMC-challenger" },
  { id: "swot", name: "SWOT Challenger", repo: "SWOT-challenger" },
  { id: "pestel", name: "PESTEL Challenger", repo: "PESTEL-challenger" }
];
const SHARED = ["data/kpis.js", "schemas/strategy-challenge-1.json", "schemas/strategy-challenge-1.js", "js/risk.js", "js/anthropic.js", "js/sse.js", "js/cost.js", "js/keystore.js"];
const REQUIRE = process.argv.includes("--require-siblings");
const r = createReport("parity");

const roots = [process.env.SIBLINGS_DIR, path.resolve(APP_ROOT, "..")].filter(Boolean);
const found = SIBLINGS.map((s) => {
  const dir = roots.map((d) => path.join(d, s.repo)).find((d) => existsSync(path.join(d, ".git")) || existsSync(path.join(d, "README.md")));
  return { ...s, dir: dir || null };
});
const present = found.filter((s) => s.dir);

// The control: the comparison catches a changed byte.
const a = Buffer.from("export const X = 1;\n");
r.control(!a.equals(Buffer.from("export const X = 2;\n")) && a.equals(Buffer.from("export const X = 1;\n")), "the byte comparison tells a changed file from the same file");

for (const f of SHARED) r.check(existsSync(path.join(APP_ROOT, f)), `this tool has the shared part ${f}`);

if (!present.length) {
  r.check(!REQUIRE, `no sibling checkout in ${roots.join(" or ")}: nothing to compare${REQUIRE ? " (--require-siblings)" : ""}`);
} else {
  console.log(`Siblings found: ${present.map((s) => `${s.name} (${s.dir})`).join(", ")}`);
  for (const f of SHARED) {
    const ours = path.join(APP_ROOT, f);
    if (!existsSync(ours)) continue;
    const holders = present.filter((s) => existsSync(path.join(s.dir, f)));
    if (!holders.length) {
      r.check(true, `${f}: no sibling has it yet, so this tool sets it`);
      continue;
    }
    for (const h of holders) r.check(readFileSync(ours).equals(readFileSync(path.join(h.dir, f))), `${f}: the same bytes as the ${h.name}'s`);
  }
}

r.finish("PARITY OK");
