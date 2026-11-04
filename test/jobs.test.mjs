import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { jobKey, parseFrontmatter, urlKey } from "../bin/jobs.mjs";

const script = fileURLToPath(new URL("../bin/jobs.mjs", import.meta.url));
const fixture = fileURLToPath(new URL("fixtures/jobs", import.meta.url));
const copy = () => {
  const dir = mkdtempSync(join(tmpdir(), "job-lite-jobs-"));
  cpSync(fixture, dir, { recursive: true });
  return dir;
};
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

test("board writes the sections in order with counts and prints them", () => {
  const dir = copy();
  const r = run("board", "--root", dir);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), {
    ready: 2, "below-threshold": 1, applied: 1, rejected: 0, skipped: 0, "cv-failed": 0, unreadable: 2,
  });
  const board = readFileSync(join(dir, "jobs/index.md"), "utf8");
  const headings = board.match(/^## .*$/gm);
  assert.deepEqual(headings, [
    "## Ready (2)", "## Below threshold (1)", "## Applied (1)", "## Rejected (0)", "## Skipped (0)", "## CV failed (0)",
    "## Unreadable (2)",
  ]);
  assert.ok(board.indexOf("Acme · React Developer") < board.indexOf("NovaPay · Senior Frontend Engineer"), "fit 81 before 72");
  assert.match(board, /\| \[Acme · React Developer\]\(2026-10-21-acme-react-dev\/README\.md\) \| 81 \| 88 \| 2026-10-21 \|/);
  assert.match(board, /\| 72 \| 74 ⚠ \| 2026-10-20 \|/);
  assert.match(board, /\| broken-folder \|/);
  assert.match(board, /\| 2026-10-21-typo-status \|/, "an unknown status is unreadable, not lost");
  assert.match(board, /## Skipped \(0\)\n\n## CV failed/);
});

test("board is idempotent", () => {
  const dir = copy();
  run("board", "--root", dir);
  const first = readFileSync(join(dir, "jobs/index.md"), "utf8");
  run("board", "--root", dir);
  assert.equal(readFileSync(join(dir, "jobs/index.md"), "utf8"), first);
});

test("urlKey ignores case of the host, www, query, hash and a trailing slash", () => {
  const k = "topcv.vn/viec-lam/x/123.html";
  assert.equal(urlKey("https://www.TopCV.vn/viec-lam/x/123.html?utm_source=a#apply"), k);
  assert.equal(urlKey("https://topcv.vn/viec-lam/x/123.html/"), k);
});

test("urlKey keeps parameters that identify the job and drops tracking ones", () => {
  assert.notEqual(urlKey("https://careers.x.com/job?id=1"), urlKey("https://careers.x.com/job?id=2"));
  assert.equal(urlKey("https://careers.x.com/job?utm_source=li&id=1&gh_src=abc&ref=x"), "careers.x.com/job?id=1");
  assert.equal(urlKey("https://careers.x.com/job?b=2&a=1"), urlKey("https://careers.x.com/job?a=1&b=2"));
});

test("known --check answers whether a posting is already stored", () => {
  const dir = copy();
  const check = (...a) => JSON.parse(run("known", "--root", dir, "--check", ...a).stdout);
  assert.deepEqual(check("https://topcv.vn/viec-lam/x/123.html?utm_source=z", "Someone", "Else"), { known: true, by: "url", job: "2026-10-20-novapay-senior-frontend" });
  assert.deepEqual(check("https://other.site/9", " blue corp ", "Backend  Engineer"), { known: true, by: "company-title", job: "2026-10-21-blue-backend" });
  assert.deepEqual(check("https://other.site/9", "New Co", "Dev"), { known: false });
});

test("jobKey trims, lowercases and collapses spaces", () => {
  assert.equal(jobKey(" NovaPay ", "Senior  Frontend Engineer"), "novapay|senior frontend engineer");
});

test("known lists the url and job keys of readable jobs", () => {
  const r = run("known", "--root", copy());
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.urls.length, 4);
  assert.equal(out.keys.length, 4);
  assert.ok(out.urls.includes("topcv.vn/viec-lam/x/123.html"));
  assert.ok(out.keys.includes("blue corp|backend engineer"));
});

test("parseFrontmatter reads scalars, null and flow maps, and returns null without frontmatter", () => {
  const fm = parseFrontmatter("---\nid: a\nfit: { score: 72, criteria: fit-v1 }\ncv: null\n---\nbody\n");
  assert.deepEqual(fm, { id: "a", fit: { score: 72, criteria: "fit-v1" }, cv: null });
  assert.equal(parseFrontmatter("# none\n"), null);
});
