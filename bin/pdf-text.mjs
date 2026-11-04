#!/usr/bin/env node
// Print a PDF's page count and text, or check that expected phrases appear in order.
//   node bin/pdf-text.mjs <pdf>                      -> {"pages":n,"text":"..."}
//   node bin/pdf-text.mjs <pdf> --expect "A|B|C"     -> {"pages":n,"inOrder":bool,"missing":[...],"outOfOrder":[...]}
// Exits 1 when not in order, or with {"error":"pdf-unreadable","detail":"..."} when the file cannot be read.
import { readFileSync } from "node:fs";
import { pdfFacts, pdfText, textOrder } from "./lib/pdf.mjs";

const args = process.argv.slice(2);
const at = args.indexOf("--expect");
const expect = at >= 0 ? args.splice(at, 2)[1] : undefined;
const [file] = args;
if (!file || (at >= 0 && expect === undefined)) {
  console.error('usage: node bin/pdf-text.mjs <pdf> [--expect "A|B|C"]');
  process.exit(2);
}

const print = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

let pages;
let text;
try {
  const bytes = readFileSync(file);
  pages = pdfFacts(bytes).pages;
  if (!pages) throw new Error("no pages found");
  text = pdfText(bytes).join("\n\n");
} catch (err) {
  print({ error: "pdf-unreadable", detail: err.message });
  process.exit(1);
}

if (expect === undefined) {
  print({ pages, text });
} else {
  const result = textOrder(text, expect.split("|").filter((s) => s.trim()));
  print({ pages, ...result });
  if (!result.inOrder) process.exitCode = 1;
}
