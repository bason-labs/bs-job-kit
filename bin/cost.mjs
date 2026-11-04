// Token and cost recorder for one job-search run. Reads the host's own session logs; no install.
//   node bin/cost.mjs --host claude|codex --since <ISO> [--until <ISO>] [--project <dir>]
//     [--home <dir>] [--marker <text>] [--record <dir>] [--log <dir>] [--request <text>] [--tickets <job id,job id>]
// --log writes the run's totals, per model and per role, to <dir>/<marker>.json.
// --marker keeps only the Claude Code session whose log contains that text (the run prints it at
// its start), plus that session's subagents, so other sessions in the same folder are not counted.
// Prints JSON totals. With --record, appends a row to <project-dir>/cost.md and splits the run's
// tokens and dollars evenly across the jobs' `cost:` lines. Missing logs: {"measured":false}.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

// API-equivalent prices in USD per million tokens, keyed by model id prefix (longest match wins).
// Editable. On a subscription these are what the same tokens would cost on the API.
// cacheWrite is the 1-hour cache-write rate (2x input); 5-minute writes cost 1.25x input. Claude
// Code logs which kind each write was; an unsplit write is priced at the 1-hour rate.
// Codex (OpenAI) models are not listed: add them here to price Codex runs.
const PRICES = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 20 },
  "claude-fable-5": { input: 10, output: 50, cacheRead: 1, cacheWrite: 20 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 8 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 10 },
  "claude-opus-4": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 10 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 4 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 4 },
  "claude-sonnet-4": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 6 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.2 },
  "claude-haiku-4": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 2 },
};

const usage = (msg) => {
  console.error(msg);
  console.error(
    "usage: node bin/cost.mjs --host claude|codex --since <ISO> [--until <ISO>] [--project <dir>] [--home <dir>] [--marker <text>] [--record <dir> --request <text> --tickets <id,id>]",
  );
  process.exit(2);
};

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  if (!argv[i].startsWith("--")) usage(`unexpected argument: ${argv[i]}`);
  args[argv[i].slice(2)] = argv[i + 1];
}
if (!["claude", "codex"].includes(args.host)) usage("--host must be claude or codex");
const since = Date.parse(args.since);
if (Number.isNaN(since)) usage("--since must be an ISO time");
const until = args.until ? Date.parse(args.until) : Date.now();
if (Number.isNaN(until)) usage("--until must be an ISO time");
const project = resolve(args.project ?? process.cwd());
const home = args.home ?? homedir();
const inWindow = (ts) => {
  const t = Date.parse(ts);
  return t >= since && t <= until;
};

const jsonl = (dir, keep) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true })
        .map((p) => join(dir, String(p)))
        .filter((p) => keep(p) && statSync(p).isFile())
    : [];
const lines = (file) =>
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .flatMap((l) => {
      try {
        return l ? [JSON.parse(l)] : [];
      } catch {
        return [];
      }
    });

const price = (model) => {
  const key = Object.keys(PRICES)
    .filter((p) => model.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : null;
};
const dollars = (model, t) => {
  const p = price(model);
  if (!p) return null;
  const w5 = t.cacheWrite5m ?? 0;
  return (
    ((t.input ?? 0) * p.input +
      (t.output ?? 0) * p.output +
      (t.cacheRead ?? 0) * p.cacheRead +
      w5 * p.input * 1.25 +
      ((t.cacheWrite ?? 0) - w5) * p.cacheWrite) /
    1e6
  );
};

const models = {};
const roles = {}; // "lead" for the main session, else the subagent's type
const add = (model, t, role = "lead", calls = 1) => {
  const cost = dollars(model, t);
  for (const [bucket, key] of [[models, model], [roles, role]]) {
    const m = (bucket[key] ??= { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0 });
    m.calls += calls;
    for (const k of ["input", "output", "cacheRead", "cacheWrite"]) m[k] += t[k] ?? 0;
    m.usd = cost === null || m.usd === null ? (bucket === models ? null : m.usd) : m.usd + cost;
  }
};
const roleOf = (file) => {
  const meta = file.replace(/\.jsonl$/, ".meta.json");
  if (!existsSync(meta)) return "lead";
  try {
    return (JSON.parse(readFileSync(meta, "utf8")).agentType ?? "subagent");
  } catch {
    return "subagent";
  }
};

const fromClaude = () => {
  const dir = join(home, ".claude/projects", project.replace(/[^a-zA-Z0-9]/g, "-"));
  let files = jsonl(dir, (p) => p.endsWith(".jsonl"));
  if (args.marker) {
    const sessions = files
      .filter((p) => dirname(p) === dir && readFileSync(p, "utf8").includes(args.marker))
      .map((p) => p.slice(0, -".jsonl".length));
    files = files.filter((p) => sessions.some((s) => p === `${s}.jsonl` || p.startsWith(`${s}/`)));
  }
  if (!files.length) return false;
  const byId = new Map();
  for (const f of files) {
    for (const d of lines(f)) {
      const u = d.message?.usage;
      if (d.type !== "assistant" || !u || !inWindow(d.timestamp)) continue;
      byId.set(d.message.id ?? `${f}:${d.timestamp}`, {
        role: roleOf(f),
        model: d.message.model ?? "unknown",
        input: u.input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
        cacheWrite5m: u.cache_creation?.ephemeral_5m_input_tokens ?? 0,
      });
    }
  }
  for (const t of byId.values()) add(t.model, t, t.role);
  return true;
};

const fromCodex = () => {
  const files = jsonl(join(home, ".codex/sessions"), (p) => /rollout-.*\.jsonl$/.test(p));
  let found = false;
  for (const f of files) {
    const ds = lines(f);
    const meta = ds.find((d) => d.type === "session_meta");
    if (!meta || resolve(meta.payload?.cwd ?? "") !== project) continue;
    found = true;
    let model = "unknown";
    let before = null;
    let last = null;
    let calls = 0;
    for (const d of ds) {
      if (d.type === "turn_context" && d.payload?.model) model = d.payload.model;
      const total = d.type === "event_msg" && d.payload?.type === "token_count" && d.payload.info?.total_token_usage;
      if (!total) continue;
      const t = Date.parse(d.timestamp);
      if (t < since) before = total;
      else if (t <= until) {
        last = total;
        calls += 1;
      }
    }
    if (!last) continue;
    const delta = (k) => (last[k] ?? 0) - (before?.[k] ?? 0);
    const cached = delta("cached_input_tokens");
    add(model, {
      input: delta("input_tokens") - cached,
      output: delta("output_tokens"),
      cacheRead: cached,
      cacheWrite: delta("cache_write_input_tokens"),
    }, "lead", calls);
  }
  return found;
};

if (!(args.host === "claude" ? fromClaude() : fromCodex())) {
  console.log(JSON.stringify({ measured: false }));
  process.exit(0);
}

const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const unpriced = [];
let usd = 0;
for (const [model, m] of Object.entries(models)) {
  for (const k of Object.keys(tokens)) tokens[k] += m[k];
  if (m.usd === null) unpriced.push(model);
  else usd += m.usd;
}
const result = {
  host: args.host,
  since: new Date(since).toISOString(),
  until: new Date(until).toISOString(),
  tokens,
  usd: Object.keys(models).length === unpriced.length ? null : usd,
  models,
  roles,
  unpriced,
};

if (args.log) {
  const run = args.marker ?? `run-${result.since.replace(/[-:]/g, "").slice(0, 15)}Z`;
  mkdirSync(args.log, { recursive: true });
  const tickets = (args.tickets ?? "").split(",").filter(Boolean);
  writeFileSync(
    join(args.log, `${run}.json`),
    `${JSON.stringify({ run, request: args.request ?? null, tickets, ...result }, null, 2)}\n`,
  );
}

if (args.record) {
  const total = tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite;
  const ids = (args.tickets ?? "").split(",").filter(Boolean);
  const money = (n) => (n === null ? "unpriced" : n.toFixed(4));
  const table = join(args.record, "cost.md");
  const header = "| Date | Request | Jobs | Tokens | USD (API price) | Host |\n|---|---|---|---|---|---|\n";
  const current = existsSync(table) ? readFileSync(table, "utf8") : "";
  if (!current.includes("| Date | Request |")) {
    writeFileSync(table, current ? `${current.replace(/\n*$/, "")}\n\n${header}` : header);
  }
  const request = (args.request ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
  appendFileSync(
    table,
    `| ${result.until.slice(0, 10)} | ${request} | ${ids.join(", ")} | ${total} | ${money(result.usd)} | ${args.host} |\n`,
  );
  ids.forEach((id, i) => {
    const file = join(args.record, "jobs", id, "README.md");
    if (!existsSync(file)) return;
    const share = Math.floor(total / ids.length) + (i < total % ids.length ? 1 : 0);
    // A job can get several runs (a CV, then another version): add to what its cost line holds.
    const before = readFileSync(file, "utf8");
    const prev = /^cost: \{ tokens: (\d+), usd: ([\d.]+|null) \}$/m.exec(before);
    const prevTokens = prev ? Number(prev[1]) : 0;
    const prevUsd = prev && prev[2] !== "null" ? Number(prev[2]) : null;
    const runUsd = result.usd === null ? null : result.usd / ids.length;
    const sumUsd = prevUsd === null && runUsd === null ? null : (prevUsd ?? 0) + (runUsd ?? 0);
    const text = before.replace(/^cost: .*$/m, `cost: { tokens: ${prevTokens + share}, usd: ${sumUsd === null ? "null" : sumUsd.toFixed(4)} }`);
    writeFileSync(file, text);
  });
}

console.log(JSON.stringify(result));
