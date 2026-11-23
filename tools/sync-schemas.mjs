// Writes this tool's own JSON schema, schemas/prototype-ideas-1.json, as a module twin beside it
// (prototype-ideas-1.js), because the page's security policy refuses JSON modules (connect-src holds only
// api.anthropic.com). The JSON file is the source; with --check this tool changes nothing and exits 1
// when the twin differs from what it would write, which tests/schemas.mjs runs. The shared handoff schema
// and its twin come unchanged from the SWOT Challenger, with the tool that writes it there
// (tools/schema-module.mjs), so all four tools hold the same bytes.
// Usage: node tools/sync-schemas.mjs [--check]
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "schemas");
const check = process.argv.includes("--check");
const HEADER = (name) => `// The module twin of ${name}: a page under a strict security policy can't import JSON, so it imports
// this file. Written from the JSON by tools/sync-schemas.mjs; never edit it by hand.
`;

let differ = 0;
const OWN = ["prototype-ideas-1.json"];
for (const file of readdirSync(DIR).filter((f) => OWN.includes(f)).sort()) {
  const twin = path.join(DIR, file.replace(/\.json$/, ".js"));
  const schema = JSON.parse(readFileSync(path.join(DIR, file), "utf8"));
  const text = `${HEADER(file)}export default ${JSON.stringify(schema, null, 2)};\n`;
  const now = existsSync(twin) ? readFileSync(twin, "utf8") : null;
  if (now === text) { console.log(`same  ${path.basename(twin)}`); continue; }
  if (check) { console.log(`DIFFERS  ${path.basename(twin)} is not what ${file} gives`); differ += 1; continue; }
  writeFileSync(twin, text);
  console.log(`wrote ${path.basename(twin)}`);
}
if (check && differ) process.exit(1);
if (check) console.log("SCHEMA TWINS OK");
