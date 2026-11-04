import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const fx = (p) => fileURLToPath(new URL(`fixtures/${p}`, import.meta.url));
const window = ["--since", "2026-10-21T10:00:00Z", "--until", "2026-10-21T11:00:00Z", "--project", "/tmp/proj"];
const cost = (...args) => spawnSync("node", [join(repo, "bin/cost.mjs"), ...args], { encoding: "utf8" });
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const json = (r) => {
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test("claude dedupes streamed lines by message id, keeping the last", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), ...window));
  const sonnet = out.models["claude-sonnet-5-5"];
  assert.equal(sonnet.input, 10);
  assert.equal(sonnet.output, 5);
  assert.equal(sonnet.cacheRead, 100);
  assert.equal(sonnet.cacheWrite, 1000);
});

test("claude ignores lines outside the window and other projects", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), ...window));
  assert.equal(out.tokens.input, 37);
  assert.equal(out.tokens.output, 14);
});

test("claude counts subagent transcripts", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), ...window));
  assert.equal(out.models["claude-haiku-5-5"].input, 20);
});

test("claude prices tokens with the table", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), ...window));
  // sonnet-5-5: 10*$2 + 5*$10 + 100*$0.20 + 1000*$4 (1h cache write) per million
  assert.ok(Math.abs(out.models["claude-sonnet-5-5"].usd - 0.00409) < 1e-9);
  assert.ok(Math.abs(out.usd - 0.004093) < 1e-9);
});

test("an unknown model is unpriced but its tokens count", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), ...window));
  assert.equal(out.models["mystery-1"].usd, null);
  assert.deepEqual(out.unpriced, ["mystery-1"]);
  assert.equal(out.models["mystery-1"].output, 7);
});

test("codex subtracts the total before the window", () => {
  const out = json(cost("--host", "codex", "--home", fx("logs/codex"), ...window));
  assert.equal(out.tokens.input + out.tokens.cacheRead, 600);
  assert.equal(out.tokens.cacheRead, 300);
  assert.equal(out.tokens.output, 40);
  assert.ok(out.models["gpt-test"]);
});

test("missing logs print measured false and exit 0", () => {
  const empty = mkdtempSync(join(tmpdir(), "job-cost-"));
  const r = cost("--host", "claude", "--home", empty, ...window);
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout), { measured: false });
});

test("bad arguments exit 2", () => {
  assert.equal(cost("--host", "nope", "--since", "2026-10-21T10:00:00Z").status, 2);
  assert.equal(cost("--host", "claude").status, 2);
});

test("record appends a cost row and splits tokens across jobs", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-cost-"));
  cpSync(fx("work"), join(dir, "work"), { recursive: true });
  json(cost("--host", "claude", "--home", fx("logs/claude"), ...window,
    "--record", join(dir, "work"), "--request", "fix: sum of empty list", "--tickets", "t1,t2"));
  const table = read(join(dir, "work/cost.md"), "utf8");
  assert.match(table, /^\| Date \| Request \| Jobs \| Tokens \| USD \(API price\) \| Host \|\n\|/);
  assert.match(table, /\| fix: sum of empty list \| t1, t2 \| 1151 \| 0\.0041 \| claude \|/);
  const t1 = read(join(dir, "work/jobs/t1/README.md"), "utf8");
  assert.match(t1, /\ncost: \{ tokens: 576, usd: 0\.0020 \}\n/);
  assert.match(t1, /\ntitle: "T"\nstatus: done\n/);
});

test("record adds the table header to a cost.md that lacks one", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-cost-"));
  cpSync(fx("work"), join(dir, "work"), { recursive: true });
  writeFileSync(join(dir, "work/cost.md"), "# Cost\n");
  json(cost("--host", "claude", "--home", fx("logs/claude"), ...window,
    "--record", join(dir, "work"), "--request", "r", "--tickets", "t1"));
  const table = read(join(dir, "work/cost.md"), "utf8");
  assert.match(table, /^# Cost\n\n\| Date \| Request \| Jobs \| Tokens \| USD \(API price\) \| Host \|\n\|---\|---\|---\|---\|---\|---\|\n\| 2026-10-21 \| r \| t1 \|/);
});

test("cache writes are priced by their TTL when the log splits them", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"),
    "--since", "2026-10-21T10:00:00Z", "--until", "2026-10-21T11:00:00Z", "--project", "/split"));
  // 2M 5-minute writes at $2.50 + 1M 1-hour writes at $4 (sonnet-5-5)
  assert.ok(Math.abs(out.usd - 9) < 1e-9);
  assert.equal(out.tokens.cacheWrite, 3000000);
});

test("--marker counts only the session that printed it, with its subagents", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), "--since", "2026-10-21T10:00:00Z",
    "--until", "2026-10-21T11:00:00Z", "--project", "/marker", "--marker", "run-abc123"));
  assert.equal(out.tokens.input, 110);
});

test("tokens are split by role: the lead and each subagent type", () => {
  const out = json(cost("--host", "claude", "--home", fx("logs/claude"), "--since", "2026-10-21T10:00:00Z",
    "--until", "2026-10-21T11:00:00Z", "--project", "/marker", "--marker", "run-abc123"));
  assert.equal(out.roles.lead.input, 100);
  assert.equal(out.roles.lead.calls, 1);
  assert.equal(out.roles.reviewer.input, 10);
  assert.ok(Math.abs(out.roles.reviewer.usd - 10 * 2 / 1e6) < 1e-12);
});

test("--log writes the run's JSON to logs/<marker>.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-cost-"));
  json(cost("--host", "claude", "--home", fx("logs/claude"), "--since", "2026-10-21T10:00:00Z",
    "--until", "2026-10-21T11:00:00Z", "--project", "/marker", "--marker", "run-abc123",
    "--log", join(dir, "logs"), "--request", "fix: x", "--tickets", "t1"));
  const log = JSON.parse(readFileSync(join(dir, "logs/run-abc123.json"), "utf8"));
  assert.equal(log.run, "run-abc123");
  assert.equal(log.request, "fix: x");
  assert.deepEqual(log.tickets, ["t1"]);
  assert.equal(log.roles.reviewer.input, 10);
});

test("recording twice for the same job adds to its cost line", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-cost-"));
  cpSync(fx("work"), join(dir, "work"), { recursive: true });
  for (let i = 0; i < 2; i++) {
    json(cost("--host", "claude", "--home", fx("logs/claude"), ...window,
      "--record", join(dir, "work"), "--request", "r", "--tickets", "t1"));
  }
  const t1 = read(join(dir, "work/jobs/t1/README.md"), "utf8");
  assert.match(t1, /\ncost: \{ tokens: 2302, usd: 0\.0082 \}\n/);
});
