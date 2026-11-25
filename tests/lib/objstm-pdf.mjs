// A PDF 1.5 whose page objects sit in a compressed object stream, as qpdf --object-streams=generate and
// many PDF writers save them, made here so the intake's tests need no binary fixture (review A2). The
// catalog, the page tree and every page are objects inside one Flate object stream; a cross-reference stream
// points at them. Blank pages, A4. qpdf --check passes it (checked by hand on 25 November 2026).
import { deflateSync } from "node:zlib";

/**
 * pages: how many pages. broken: the object stream's bytes are not Flate data, as in a PDF whose page
 * objects can't be read (an encrypted file looks alike to the page). Returns the file's bytes.
 */
export function objectStreamPdf(pages, { broken = false } = {}) {
  const enc = new TextEncoder();
  const parts = [];
  let size = 0;
  const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); size += b.length; };
  push("%PDF-1.5\n");
  push(Uint8Array.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  // Objects 2 (catalog), 3 (page tree) and 4.. (pages) go into object stream 1.
  const kids = Array.from({ length: pages }, (_, k) => `${k + 4} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 3 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${pages} /MediaBox [0 0 595 842] >>`,
    ...Array.from({ length: pages }, () => "<< /Type /Page /Parent 3 0 R >>")
  ];
  let body = "";
  const header = [];
  for (const [k, o] of objects.entries()) {
    header.push(`${k + 2} ${body.length}`);
    body += `${o}\n`;
  }
  const head = `${header.join(" ")}\n`;
  const raw = enc.encode(head + body);
  const data = broken ? enc.encode("not flate data at all, as an encrypted stream would read").map((b, i) => b ^ (i * 37)) : deflateSync(raw);
  const objStmAt = size;
  push(`1 0 obj\n<< /Type /ObjStm /N ${objects.length} /First ${head.length} /Filter /FlateDecode /Length ${data.length} >>\nstream\n`);
  push(data);
  push("\nendstream\nendobj\n");
  // The cross-reference stream: object 0 free, 1 at its offset, 2.. in stream 1, and itself.
  const xrefNo = objects.length + 2;
  const xrefAt = size;
  const rows = [];
  const row = (type, a, b) => rows.push(type, (a >>> 24) & 255, (a >>> 16) & 255, (a >>> 8) & 255, a & 255, (b >>> 8) & 255, b & 255);
  row(0, 0, 65535);
  row(1, objStmAt, 0);
  for (let k = 0; k < objects.length; k += 1) row(2, 1, k);
  row(1, xrefAt, 0);
  const xref = deflateSync(Uint8Array.from(rows));
  push(`${xrefNo} 0 obj\n<< /Type /XRef /Size ${xrefNo + 1} /W [1 4 2] /Root 2 0 R /Filter /FlateDecode /Length ${xref.length} >>\nstream\n`);
  push(xref);
  push(`\nendstream\nendobj\nstartxref\n${xrefAt}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
