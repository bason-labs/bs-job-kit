#!/usr/bin/env node
// Render a CV JSON through a layout and print it to PDF with headless Chrome or Edge.
//   node bin/cv-pdf.mjs --data <cv.json> --out <cv.pdf> [--layout <name|./path.mjs>] [--chrome <path>] [--root <dir>]
// The layout defaults to cvLayout and the browser to chromePath in <root>/profile.yaml.
// Writes <out minus .pdf>.html next to the PDF. Prints {"out","html","bytes","pages","sha256","name"}
// and exits 0, or {"error","detail"} and exits 1 leaving no PDF. Errors: bad-data,
// layout-not-found, chrome-not-found, print-failed, not-pdf.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome, printToPdf } from "./lib/chrome.mjs";
import { pdfFacts } from "./lib/pdf.mjs";
import { readProfile } from "./lib/profile.mjs";
import { validateCv } from "../templates/cv/lib.mjs";

// The repo root: set by bin/bs-job.mjs (next to the compiled program), else the parent of bin/.
const kit = globalThis.BS_JOB_KIT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
if (!args.data || !args.out) {
  console.error("usage: node bin/cv-pdf.mjs --data <cv.json> --out <cv.pdf> [--layout <name|./path.mjs>] [--chrome <path>] [--root <dir>]");
  process.exit(2);
}

const print = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);
let tmp = null;
const fail = (error, detail) => {
  if (tmp) rmSync(tmp, { force: true });
  print({ error, detail });
  process.exit(1);
};

// A bare name is a built-in layout; ./x, x/y or x\y is a file relative to root.
function layoutPath(value, root) {
  if (value.startsWith("./") || value.startsWith(".\\") || /[\\/]/.test(value) || path.isAbsolute(value)) {
    return path.resolve(root, value);
  }
  if (!/^[a-z0-9-]+$/i.test(value)) return null;
  return path.join(kit, "templates", "cv", `${value}.mjs`);
}

async function main() {
  const root = path.resolve(args.root ?? kit);
  const profile = readProfile(root);
  const out = path.resolve(args.out);
  const html = out.replace(/\.pdf$/i, "") + ".html";

  let cv;
  try {
    cv = JSON.parse(readFileSync(path.resolve(args.data), "utf8"));
  } catch (e) {
    return fail("bad-data", `cannot read ${args.data}: ${e.message}`);
  }
  const problems = validateCv(cv);
  if (problems.length) return fail("bad-data", problems.join("; "));
  // A relative photo path is relative to the data file.
  if (cv.photo && !/^(?:https?|file|data):/i.test(cv.photo)) {
    cv.photo = path.resolve(path.dirname(path.resolve(args.data)), cv.photo);
  }

  const layout = String(args.layout ?? profile.cvLayout ?? "classic");
  const file = layoutPath(layout, root);
  if (!file || !existsSync(file)) return fail("layout-not-found", `no layout "${layout}"${file ? ` at ${file}` : ""}`);
  let render;
  try {
    render = (await import(pathToFileURL(file).href)).default;
  } catch (e) {
    return fail("layout-not-found", `cannot load ${file}: ${e.message}`);
  }
  if (typeof render !== "function") return fail("layout-not-found", `${file} has no default export function`);

  let doc;
  try {
    doc = String(render(cv));
  } catch (e) {
    return fail("bad-data", `layout ${layout} failed: ${e.message}`);
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(html, doc);

  const override = args.chrome ? path.resolve(args.chrome) : profile.chromePath || null;
  const chrome = findChrome({ platform: process.platform, env: process.env, exists: existsSync, override });
  if (!chrome) return fail("chrome-not-found", "install Google Chrome or Microsoft Edge, or set chromePath in profile.yaml");

  tmp = `${out.replace(/\.pdf$/i, "")}.tmp-${process.pid}.pdf`;
  const printed = await printToPdf({ chrome, htmlPath: html, out: tmp });
  if (printed.error) return fail(printed.error, printed.detail);

  const bytes = readFileSync(tmp);
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return fail("not-pdf", `${chrome} did not write a PDF`);
  let facts;
  try {
    facts = pdfFacts(bytes);
  } catch (e) {
    return fail("not-pdf", `the PDF cannot be read: ${e.message}`);
  }
  renameSync(tmp, out);
  tmp = null;
  print({ out, html, bytes: facts.bytes, pages: facts.pages, sha256: facts.sha256, name: path.basename(out, path.extname(out)) });
}

main().catch((e) => fail("print-failed", String(e?.message || e)));
