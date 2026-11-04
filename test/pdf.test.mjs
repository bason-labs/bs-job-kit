import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pdfFacts, pdfText, textOrder } from "../bin/lib/pdf.mjs";

const fx = (p) => fileURLToPath(new URL(`fixtures/${p}`, import.meta.url));
const script = fileURLToPath(new URL("../bin/pdf-text.mjs", import.meta.url));

test("facts of the fake one-page PDF", () => {
  const f = pdfFacts(readFileSync(fx("one-page.pdf")));
  assert.equal(f.pages, 1);
  assert.equal(f.sha256.length, 64);
});

test("facts of the two-page PDF", () => assert.equal(pdfFacts(readFileSync(fx("two-page.pdf"))).pages, 2));

test("facts of a Chrome PDF", () => assert.equal(pdfFacts(readFileSync(fx("pdf/order.pdf"))).pages, 1));

test("text of a Chrome PDF keeps diacritics and order", () => {
  const [page] = pdfText(readFileSync(fx("pdf/order.pdf")));
  assert.match(page, /Jane Nguyễn/);
  assert.match(page, /Müller & Co · R&D/);
  assert.ok(page.indexOf("Summary") < page.indexOf("Experience"));
  assert.ok(page.indexOf("Experience") < page.indexOf("Skills"));
});

test("textOrder", () => {
  assert.deepEqual(textOrder("a  b\nc", ["a", "b c"]), { inOrder: true, missing: [], outOfOrder: [] });
  assert.deepEqual(textOrder("b a", ["a", "b"]), { inOrder: false, missing: [], outOfOrder: ["b"] });
  assert.deepEqual(textOrder("a", ["a", "z"]), { inOrder: false, missing: ["z"], outOfOrder: [] });
});

test("CLI prints pages and text", () => {
  const r = spawnSync(process.execPath, [script, fx("pdf/order.pdf")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.pages, 1);
  assert.match(out.text, /Jane Nguyễn/);
});

test("CLI --expect exits 1 when out of order", () => {
  const r = spawnSync(process.execPath, [script, fx("pdf/order.pdf"), "--expect", "Skills|Summary"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.deepEqual(JSON.parse(r.stdout).outOfOrder, ["Summary"]);
});

test("CLI --expect exits 0 when in order", () => {
  const r = spawnSync(process.execPath, [script, fx("pdf/order.pdf"), "--expect", "Summary|Experience|Skills"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { pages: 1, inOrder: true, missing: [], outOfOrder: [] });
});

test("CLI on a non-PDF reports pdf-unreadable", () => {
  const self = fileURLToPath(import.meta.url);
  const r = spawnSync(process.execPath, [script, self], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).error, "pdf-unreadable");
});
