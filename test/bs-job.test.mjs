import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("../bin/bs-job.mjs", import.meta.url));
const fx = (p) => fileURLToPath(new URL(`fixtures/${p}`, import.meta.url));
const run = (...args) => spawnSync(process.execPath, [entry, ...args], { encoding: "utf8" });

test("clock prints marker and start", () => {
  const r = run("clock");
  assert.equal(r.status, 0, r.stderr);
  assert.match(JSON.parse(r.stdout).marker, /^\d{8}T\d{6}Z$/);
});

test("version matches package.json", () => {
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(run("version").stdout.trim(), version);
});

test("subcommand gets its own arguments", () => {
  const r = run("pdf-text", fx("pdf/order.pdf"), "--expect", "Skills|Summary");
  assert.equal(r.status, 1);
  assert.deepEqual(JSON.parse(r.stdout).outOfOrder, ["Summary"]);
});

test("jobs dispatches to main", () => {
  const r = run("jobs", "nope");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: bs-job jobs/);
});

test("unknown command prints usage and exits 2", () => {
  const r = run("nope");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: bs-job </);
});
