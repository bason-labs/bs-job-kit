import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTree } from "./check.mjs";

const fx = (p) => fileURLToPath(new URL(`fixtures/check/${p}`, import.meta.url));

test("a clean tree has no findings", () => {
  assert.deepEqual(checkTree(fx("good")), []);
});

test("a dirty tree has one finding per problem", () => {
  const found = checkTree(fx("bad")).map((f) => `${f.path}:${f.line}:${f.rule}`).sort();
  assert.deepEqual(found, [
    ".claude/agents/job-cv-evaluator.md:1:frontmatter",
    ".claude/skills/job/SKILL.md:11:owner-wording",
    ".claude/skills/job/SKILL.md:7:leftover",
    ".claude/skills/job/SKILL.md:9:link",
  ]);
});

test("a tree with Windows (CRLF) line endings has no findings", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-check-crlf-"));
  cpSync(fx("good"), dir, { recursive: true });
  const crlf = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) crlf(p);
      else if (p.endsWith(".md")) writeFileSync(p, readFileSync(p, "utf8").replace(/\r?\n/g, "\r\n"));
    }
  };
  crlf(dir);
  assert.deepEqual(checkTree(dir), []);
});
