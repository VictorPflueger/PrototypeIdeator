# Vici, copied into this prototype

These files come unchanged from Vici, Victor Pflüger's design system
(<https://victorpflueger.github.io/ViciDesign/index.html>), as it stands on main at commit **`d04a318`**
(25 November 2026). That main carries what the prototype brief asks for: the How it works guide in two
languages, the byline, the key-figure rules (answer first, a figure on part of the data says so), Presenting
step by step with Play, Your turn and `vc-attention`, the AI notice, names, not record ids, the session-only
data rule (Nothing is kept), a blank starter that runs under a strict security policy, the framework view,
the risk matrix and the report, which prints alone with its footer on every page. Vici's version number
stays 1.0.0 until 2.0 is released. The page loads these files from here rather than from a CDN, so
everything it needs comes from this site alone.

| File here | What it is |
|---|---|
| `dist/vici.min.css` | Vici's stylesheet: tokens, light and dark theme, components, icons |
| `dist/vici.js` | Vici's small script: theme toggle, tooltips, the How it works guide and the behaviours of its components |
| `dist/vici-theme.js` | Applies the remembered theme before the first paint, as a file of its own, so a page whose policy runs only its own scripts can use it |
| `dist/tokens.json` | Vici's token values, light and dark, for scripts and tests (the colour checks read it) |
| `assets/fonts/*.woff2` | Bricolage Grotesque, Inter, JetBrains Mono and Vici Mask, as the stylesheet expects them |
| `assets/fonts/OFL-*.txt` | The SIL Open Font License of each font family |
| `assets/marks/linkedin.png` | LinkedIn's [in] logo, as LinkedIn publishes it |
| `assets/marks/README.md` | Where the marks come from and how they may be used (it also names marks this copy leaves out) |
| `assets/brand/portrait-96.jpg` | Victor's portrait, 96 × 96 px, for the byline |
| `LICENSE` | Vici's licence |

Keep the folder structure: the stylesheet finds the fonts at `../assets/fonts/`. Never edit these files;
a fix belongs in Vici and comes here from its main. `tests/vici.mjs` compares every file with a ViciDesign
checkout at the commit above, which the GitHub Actions workflow names too.

**Licence.** `LICENSE` covers all of it: Vici's code and its Vici Mask font are MIT-licensed; Bricolage
Grotesque, Inter and JetBrains Mono are under the SIL Open Font License; Victor Pflüger's name, portrait and
logo are reserved for his own use; LinkedIn's logo belongs to LinkedIn.

**Updating.** Run `node tools/update-vici.mjs` with a ViciDesign checkout beside this repository: it copies
the same files from ViciDesign's main, names the new commit here and in the workflow. Then run the tests and
look at the page in light and dark, since a change may rename a class or change a token.
