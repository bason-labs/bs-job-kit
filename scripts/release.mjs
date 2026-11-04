// Build the release: one compiled `bs-job` program per platform, packed with the readable files.
//   node scripts/release.mjs [--targets darwin-arm64,darwin-x64,windows-x64]
// Needs Bun on PATH (it compiles bin/bs-job.mjs and everything it imports into one program).
// Writes release/bs-job-kit-<version>-<target>/ and a .zip of each. The scripts in bin/, the
// tests and this file are left out; everything else tracked by git ships as readable files.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const ALL = {
  "darwin-arm64": { bun: "bun-darwin-arm64", exe: "bs-job", label: "macos-apple-silicon" },
  "darwin-x64": { bun: "bun-darwin-x64", exe: "bs-job", label: "macos-intel" },
  "windows-x64": { bun: "bun-windows-x64", exe: "bs-job.exe", label: "windows-x64" },
};

const i = process.argv.indexOf("--targets");
const targets = i > 0 ? process.argv[i + 1].split(",") : Object.keys(ALL);
for (const t of targets) if (!ALL[t]) throw new Error(`unknown target ${t}; use ${Object.keys(ALL).join(", ")}`);

// Paths that stay out of a release: the source of the program, the tests, the build tooling.
export const isShipped = (file) =>
  !/^(bin|test|scripts|docs)\//.test(file) && !["package.json", ".gitignore"].includes(file);

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const shipped = tracked.filter(isShipped);

const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: ["ignore", "inherit", "inherit"] });

const outRoot = path.join(root, "release");
mkdirSync(outRoot, { recursive: true });
const made = [];
for (const t of targets) {
  const { bun, exe, label } = ALL[t];
  const name = `bs-job-kit-${pkg.version}-${label}`;
  const dir = path.join(outRoot, name);
  rmSync(dir, { recursive: true, force: true });
  rmSync(`${dir}.zip`, { force: true });
  for (const f of shipped) {
    mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    cpSync(path.join(root, f), path.join(dir, f));
  }
  // Settings call the program instead of node scripts.
  const settings = path.join(dir, ".claude", "settings.json");
  if (existsSync(settings)) {
    const s = JSON.parse(readFileSync(settings, "utf8"));
    s.permissions.allow = s.permissions.allow.filter((a) => !a.startsWith("Bash(node bin/"));
    s.permissions.allow.unshift(exe === "bs-job" ? "Bash(./bs-job:*)" : "Bash(.\\bs-job.exe:*)", "Bash(bs-job:*)");
    writeFileSync(settings, `${JSON.stringify(s, null, 2)}\n`);
  }
  run("bun", ["build", path.join(root, "bin", "bs-job.mjs"), "--compile", `--target=${bun}`, "--minify", "--outfile", path.join(dir, exe)]);
  rmSync(path.join(dir, `${exe}.bun-build`), { force: true });
  // Bun leaves cross-compile scratch files in the working folder.
  for (const f of readdirSync(root)) if (f.endsWith(".bun-build")) rmSync(path.join(root, f), { force: true });
  // zip keeps the folder name inside the archive; -X drops macOS extra attributes.
  run("zip", ["-qrX", `${name}.zip`, name], outRoot);
  made.push(`${name}.zip`);
}
console.log(JSON.stringify({ version: pkg.version, release: path.relative(root, outRoot), zips: made }));
