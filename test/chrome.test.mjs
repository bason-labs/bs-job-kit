import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome, printToPdf } from "../bin/lib/chrome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fake = join(here, "fixtures", "fake-chrome.mjs");
const has = (...ps) => (p) => ps.includes(p);

test("override wins when it exists", () =>
  assert.equal(findChrome({ platform: "darwin", env: {}, exists: has("/x/chrome"), override: "/x/chrome" }), "/x/chrome"));
test("macOS Chrome", () =>
  assert.equal(findChrome({ platform: "darwin", env: {}, exists: has("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") }),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"));
test("Windows Chrome under Program Files", () => {
  const p = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  assert.equal(findChrome({ platform: "win32", env: { PROGRAMFILES: "C:\\Program Files" }, exists: has(p) }), p);
});
test("Windows falls back to Edge", () => {
  const p = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  assert.equal(findChrome({ platform: "win32", env: { "PROGRAMFILES(X86)": "C:\\Program Files (x86)" }, exists: has(p) }), p);
});
test("CHROME_PATH env is used", () =>
  assert.equal(findChrome({ platform: "win32", env: { CHROME_PATH: "D:\\c.exe" }, exists: has("D:\\c.exe") }), "D:\\c.exe"));
test("env keys are matched case-insensitively", () => {
  const p = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  assert.equal(findChrome({ platform: "win32", env: { ProgramFiles: "C:\\Program Files" }, exists: has(p) }), p);
});
test("nothing found", () => assert.equal(findChrome({ platform: "linux", env: {}, exists: () => false }), null));

async function run(mode) {
  const dir = mkdtempSync(join(tmpdir(), "chrome-test-"));
  const prev = process.env.FAKE_CHROME;
  process.env.FAKE_CHROME = mode;
  try {
    const out = join(dir, "o.pdf");
    const result = await printToPdf({ chrome: fake, htmlPath: join(dir, "a b.html"), out });
    return { result, out, written: existsSync(out) ? readFileSync(out) : null };
  } finally {
    if (prev === undefined) delete process.env.FAKE_CHROME; else process.env.FAKE_CHROME = prev;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("printToPdf with the fake writes the PDF", async () => {
  const { result, written } = await run("ok");
  assert.deepEqual(result, { ok: true });
  assert.equal(written.subarray(0, 4).toString(), "%PDF");
});
test("printToPdf reports print-failed", async () => {
  const { result, written } = await run("fail");
  assert.equal(result.error, "print-failed");
  assert.equal(typeof result.detail, "string");
  assert.equal(written, null);
});
test("printToPdf removes a stale out file and reports print-failed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chrome-test-"));
  const prev = process.env.FAKE_CHROME;
  process.env.FAKE_CHROME = "fail";
  try {
    const out = join(dir, "o.pdf");
    writeFileSync(out, "stale");
    const result = await printToPdf({ chrome: fake, htmlPath: join(dir, "a.html"), out });
    assert.equal(result.error, "print-failed");
    assert.equal(existsSync(out), false);
  } finally {
    if (prev === undefined) delete process.env.FAKE_CHROME; else process.env.FAKE_CHROME = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});
