// Prints scenario S3's annual-report excerpt (tools/s3-annual-report.html) to PDF, once in English and once
// in German, with Chromium through Playwright. The PDFs are committed under data/scenarios/, so the page
// itself needs no build step; run this again only after the HTML source changes, then update the bytes
// and pages that data/scenarios/s3.js freezes (it prints them). tests/scenarios.mjs checks that every
// quote the Reader cites is on the page it names.
//
// Usage: node tools/build-s3-pdf.mjs   (with Playwright, as tests/README.md describes)

import path from "node:path";
import { statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { APP_ROOT, launchBrowser } from "../tests/lib/harness.mjs";
import { pdfPages } from "../tests/lib/pdf-text.mjs";

const SOURCE = path.join(APP_ROOT, "tools", "s3-annual-report.html");
const OUT = {
  en: path.join(APP_ROOT, "data", "scenarios", "s3-annual-report-en.pdf"),
  de: path.join(APP_ROOT, "data", "scenarios", "s3-annual-report-de.pdf")
};

const browser = await launchBrowser();
try {
  for (const [lang, file] of Object.entries(OUT)) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(SOURCE).href);
    await page.evaluate((l) => { document.documentElement.lang = l; }, lang);
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, tagged: false, outline: false });
    writeFileSync(file, pdf);
    await page.close();
    const pages = pdfPages(pdf);
    console.log(`${path.relative(APP_ROOT, file)}: ${statSync(file).size} bytes, ${pages.length} pages`);
  }
} finally {
  await browser.close();
}
