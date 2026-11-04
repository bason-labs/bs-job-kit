// The job board and the dedupe keys, read from jobs/<id>/README.md frontmatter. No dependencies.
//   node bin/jobs.mjs board [--root <dir>]   rewrite jobs/index.md, print the count per status
//   node bin/jobs.mjs known [--root <dir>]   print {"urls":[...],"keys":[...]} of every stored job
//   node bin/jobs.mjs known --check <url> <company> <title>   print {"known":true,"by","job"} or {"known":false}
// Frontmatter lines are `key: value`, where a value is a plain scalar, null, or a one-line flow
// map `{ k: v, k: v }`. A README without readable frontmatter, or with a status outside the six
// below, is listed under "Unreadable".
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SECTIONS = [
  { status: "ready", title: "Ready", cols: ["Fit", "CV", "Found"] },
  { status: "below-threshold", title: "Below threshold", cols: ["Fit", "Found"] },
  { status: "applied", title: "Applied", cols: ["Fit", "Applied"] },
  { status: "rejected", title: "Rejected", cols: ["Fit", "Applied"] },
  { status: "skipped", title: "Skipped", cols: ["Fit", "Found"] },
  { status: "cv-failed", title: "CV failed", cols: ["Fit", "Found"] },
];

const STATUSES = new Set(SECTIONS.map((s) => s.status));

const scalar = (v) => {
  const s = v.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  const q = /^(["'])(.*)\1$/.exec(s);
  return q ? q[2] : s;
};

export const parseFrontmatter = (text) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(text);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const flow = /^\{(.*)\}$/.exec(kv[2].trim());
    if (flow) {
      const map = {};
      for (const part of flow[1].split(",")) {
        const i = part.indexOf(":");
        if (i > 0) map[part.slice(0, i).trim()] = scalar(part.slice(i + 1));
      }
      out[kv[1]] = map;
    } else out[kv[1]] = scalar(kv[2]);
  }
  return out;
};

const TRACKING = /^(utm_.*|gh_src|ref|refid|trk|trackingid|tracking_id|source|src|fbclid|gclid|ta_source|u_sr_id|lever-source.*|position|pagenum)$/i;

export const urlKey = (url) => {
  try {
    const u = new URL(url);
    const params = [...u.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    const query = params.length ? `?${new URLSearchParams(params)}` : "";
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${query}`;
  } catch {
    return String(url).trim().toLowerCase();
  }
};

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const jobKey = (company, title) => `${norm(company)}|${norm(title)}`;

export const readJobs = (root) => {
  const dir = join(root, "jobs");
  const jobs = [];
  const unreadable = [];
  if (!existsSync(dir)) return { jobs, unreadable };
  for (const name of readdirSync(dir).sort()) {
    const readme = join(dir, name, "README.md");
    if (!statSync(join(dir, name)).isDirectory()) continue;
    const fm = existsSync(readme) ? parseFrontmatter(readFileSync(readme, "utf8")) : null;
    if (!fm || !STATUSES.has(fm.status) || !fm.company || !fm.title) unreadable.push(name);
    else jobs.push({ ...fm, folder: name });
  }
  return { jobs, unreadable };
};

const num = (v) => (typeof v === "number" ? v : -1);
const cell = (v) => (v === null || v === undefined ? "–" : String(v));
const byFound = (a, b) => String(b.found ?? "").localeCompare(String(a.found ?? ""));
const SORT = {
  ready: (a, b) => num(b.fit?.score) - num(a.fit?.score) || byFound(a, b),
  "below-threshold": (a, b) => num(b.fit?.score) - num(a.fit?.score) || byFound(a, b),
  applied: (a, b) => String(b.applied ?? "").localeCompare(String(a.applied ?? "")),
  rejected: (a, b) => String(b.applied ?? "").localeCompare(String(a.applied ?? "")),
};

const row = (job, cols) => {
  const link = `[${job.company} · ${job.title}](${job.folder}/README.md)`;
  const values = cols.map((c) => {
    if (c === "Fit") return cell(job.fit?.score);
    if (c === "CV") return job.cv?.score == null ? "–" : `${job.cv.score}${job.cv.flagged ? " ⚠" : ""}`;
    if (c === "Applied") return cell(job.applied);
    return cell(job.found);
  });
  return `| ${[link, ...values].join(" | ")} |`;
};

export const renderBoard = ({ jobs, unreadable }) => {
  const parts = ["# Jobs\n"];
  for (const s of SECTIONS) {
    const list = jobs.filter((j) => j.status === s.status).sort(SORT[s.status] ?? byFound);
    parts.push(`## ${s.title} (${list.length})\n`);
    if (list.length) {
      const head = ["Job", ...s.cols];
      parts.push([`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...list.map((j) => row(j, s.cols))].join("\n") + "\n");
    }
  }
  parts.push(`## Unreadable (${unreadable.length})\n`);
  if (unreadable.length) parts.push(["| Folder |", "|---|", ...unreadable.map((f) => `| ${f} |`)].join("\n") + "\n");
  return parts.join("\n");
};

export const main = (argv) => {
  const cmd = argv[0];
  const i = argv.indexOf("--root");
  const root = resolve(i > 0 ? argv[i + 1] : ".");
  const data = readJobs(root);
  if (cmd === "board") {
    writeFileSync(join(root, "jobs", "index.md"), renderBoard(data));
    const counts = Object.fromEntries(SECTIONS.map((s) => [s.status, data.jobs.filter((j) => j.status === s.status).length]));
    console.log(JSON.stringify({ ...counts, unreadable: data.unreadable.length }));
  } else if (cmd === "known" && argv.includes("--check")) {
    const [url, company, title] = argv.slice(argv.indexOf("--check") + 1);
    const byUrl = url && data.jobs.find((j) => j.url && urlKey(j.url) === urlKey(url));
    const byKey = !byUrl && company && title && data.jobs.find((j) => jobKey(j.company, j.title) === jobKey(company, title));
    const hit = byUrl ?? byKey;
    console.log(JSON.stringify(hit ? { known: true, by: byUrl ? "url" : "company-title", job: hit.folder } : { known: false }));
  } else if (cmd === "known") {
    console.log(JSON.stringify({
      urls: data.jobs.filter((j) => j.url).map((j) => urlKey(j.url)),
      keys: data.jobs.map((j) => jobKey(j.company, j.title)),
    }));
  } else {
    console.error("usage: bs-job jobs board|known [--root <dir>]");
    process.exit(2);
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
