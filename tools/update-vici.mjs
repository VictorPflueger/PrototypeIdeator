// Copies Vici's files from a ViciDesign checkout into vici/, unchanged, and names the checkout's commit in
// vici/README.md and in the GitHub Actions workflow, so tests/vici.mjs compares against the same commit.
// The files are the ones a prototype needs (Vici's prototype brief): the stylesheet, the script, the theme
// script that runs before the first paint and the token values from dist/, the fonts with their licences, the portrait for the byline, LinkedIn's mark
// with its notes, and the licence. Run it after a ViciDesign change is merged on main, then run the tests
// and look at the page in both themes.
// Usage: node tools/update-vici.mjs [path to ViciDesign]   (default: ../ViciDesign, else ../vicidesign)
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.resolve(process.argv[2] || ["ViciDesign", "vicidesign"].map((d) => path.join(APP, "..", d)).find((d) => existsSync(d)) || "");
if (!existsSync(path.join(from, "dist", "vici.min.css"))) {
  console.error(`No ViciDesign checkout at ${from}`);
  process.exit(1);
}
const commit = execFileSync("git", ["-C", from, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const date = execFileSync("git", ["-C", from, "log", "-1", "--format=%cs"], { encoding: "utf8" }).trim();
const fonts = readdirSync(path.join(from, "assets", "fonts")).filter((f) => /\.(woff2|txt)$/.test(f)).map((f) => `assets/fonts/${f}`);
const FILES = ["dist/vici.min.css", "dist/vici.js", "dist/vici-theme.js", "dist/tokens.json", ...fonts, "assets/brand/portrait-96.jpg", "assets/marks/linkedin.png", "assets/marks/README.md", "LICENSE"];
for (const f of FILES) {
  const to = path.join(APP, "vici", f);
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(path.join(from, f), to);
}
const readme = path.join(APP, "vici", "README.md");
if (existsSync(readme)) {
  const text = readFileSync(readme, "utf8")
    .replace(/commit \*\*`[0-9a-f]{7,40}`\*\*\s*\n?\(\d{1,2} \w+ \d{4}\)/, (m) => m.replace(/`[0-9a-f]{7,40}`/, `\`${commit.slice(0, 7)}\``).replace(/\(\d{1,2} \w+ \d{4}\)/, `(${new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })})`));
  writeFileSync(readme, text);
}
const workflow = path.join(APP, ".github", "workflows", "tests.yml");
if (existsSync(workflow)) {
  writeFileSync(workflow, readFileSync(workflow, "utf8").replace(/(repository: VictorPflueger\/ViciDesign\s+ref: )[0-9a-f]{7,40}/, `$1${commit}`));
}
console.log(`vici/ now holds ${FILES.length} files from ViciDesign ${commit.slice(0, 7)} (${date}).`);
