import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../bin/figma-pdf.mjs", import.meta.url));
const fake = fileURLToPath(new URL("fixtures/fake-figma-mcp.mjs", import.meta.url));
const onePage = readFileSync(new URL("fixtures/one-page.pdf", import.meta.url));

const run = (mode) => {
  const out = join(mkdtempSync(join(tmpdir(), "job-lite-pdf-")), "cv-en.pdf");
  const started = Date.now();
  const r = spawnSync(process.execPath, [script, "--frame", "1:2", "--file-key", "TESTKEY", "--out", out, "--wait-ms", "500", "--server", `node ${fake}`], {
    encoding: "utf8", env: { ...process.env, FAKE_MODE: mode }, timeout: 30000,
  });
  return { ...r, out, ms: Date.now() - started, json: r.stdout ? JSON.parse(r.stdout) : null };
};

test("exports a one-page PDF and reports its facts", () => {
  const r = run("ok");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(r.out));
  assert.equal(r.json.pages, 1);
  assert.equal(r.json.name, "ACME_FE_EN_v1");
  assert.equal(r.json.bytes, onePage.length);
  assert.equal(r.json.sha256, createHash("sha256").update(onePage).digest("hex"));
});

test("a two-page export is written and reports 2 pages", () => {
  const r = run("two-pages");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.json.pages, 2);
  assert.ok(existsSync(r.out));
});

test("Figma not connected fails fast with figma-unavailable", () => {
  const r = run("offline");
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "figma-unavailable");
  assert.ok(r.ms < 25000);
  assert.ok(!existsSync(r.out));
});

test("a frame outside Drafts writes no file", () => {
  const r = run("drafts");
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "not-in-drafts");
  assert.ok(!existsSync(r.out));
});

test("an export that is not a PDF writes no file", () => {
  const r = run("notpdf");
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "not-pdf");
  assert.ok(!existsSync(r.out));
});

test("no --file-key and no figmaFileKey in settings fails with no-file-key", () => {
  const root = mkdtempSync(join(tmpdir(), "job-kit-root-"));
  const out = join(root, "x.pdf");
  const r = spawnSync(process.execPath, [script, "--frame", "1:2", "--out", out, "--root", root, "--wait-ms", "500", "--server", `node ${fake}`], {
    encoding: "utf8", env: { ...process.env, FAKE_MODE: "ok" }, timeout: 30000,
  });
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).error, "no-file-key");
  assert.ok(!existsSync(out));
});
