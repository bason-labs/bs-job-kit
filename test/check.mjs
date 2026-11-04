// Content check for bs-job-lite: leftover wording from bs-job-agents (orchestrator, bots, tokens,
// spec ids), skill and agent frontmatter, and broken relative links.
// Usage: node test/check.mjs [--root <dir>]. Prints `path:line rule message`; exit 0 clean, 1 findings.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LEFTOVERS = [
  /orchestrator/i,
  /\bLead\b/,
  /approval token/i,
  /\bguard\b/i,
  /\bW\d[a-z]?\b/,
  /§\s?\d/,
  /\bUC-\d/,
  /outputSchema|selfCheck/,
  /mcp:orchestrator/,
  /Master CV screen/,
  /\b[A-Z][a-z]+'s review\b/,
];

// The engine speaks of "the owner" and "they": a gendered pronoun or the first owner's name is a leak.
const OWNER_WORDING = /\b([Hh]e|[Hh]is|[Hh]im|Ba)\b/;

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? walk(p) : [p];
      })
    : [];

const frontmatter = (text) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return fields;
};

export const checkTree = (root) => {
  const findings = [];
  const add = (path, line, rule, message) => findings.push({ path, line, rule, message });
  const files = [
    ...walk(join(root, ".claude")),
    ...["README.md", "CLAUDE.md", "AGENTS.md"].map((f) => join(root, f)).filter(existsSync),
  ].filter((p) => p.endsWith(".md"));

  for (const file of files) {
    const rel = relative(root, file);
    const text = readFileSync(file, "utf8");

    const isAgent = /^\.claude\/agents\/[^/]+\.md$/.test(rel);
    const isSkill = /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(rel);
    if (isAgent || isSkill) {
      const fm = frontmatter(text);
      const need = isAgent ? ["name", "description", "model", "tools"] : ["name", "description"];
      const missing = need.filter((k) => !fm?.[k]);
      if (missing.length) add(rel, 1, "frontmatter", `frontmatter lacks ${missing.join(", ")}`);
    }

    let fenced = false;
    text.split("\n").forEach((line, i) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      if (fenced || line.trimStart().startsWith("Sources:")) return;
      const hit = LEFTOVERS.find((re) => re.test(line));
      if (hit) add(rel, i + 1, "leftover", `matches ${hit}: ${line.trim().slice(0, 80)}`);
      const who = OWNER_WORDING.exec(line);
      if (who) add(rel, i + 1, "owner-wording", `says "${who[1]}": ${line.trim().slice(0, 80)}`);
      for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = m[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        if (!existsSync(resolve(dirname(file), target))) add(rel, i + 1, "link", `broken link: ${m[1]}`);
      }
    });
  }
  return findings;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--root");
  const root = resolve(i > 0 ? process.argv[i + 1] : ".");
  const findings = checkTree(root);
  for (const f of findings) console.log(`${f.path}:${f.line} ${f.rule} ${f.message}`);
  process.exit(findings.length ? 1 : 0);
}
