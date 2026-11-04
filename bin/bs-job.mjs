#!/usr/bin/env node
// One entry point for every bs-job-kit script, so they can ship as a single compiled program
// (`bs-job` on macOS, `bs-job.exe` on Windows) at the repo root.
//   bs-job <command> [args...]      commands: cv-pdf, pdf-text, figma-pdf, cost, jobs, clock, version
// From a source checkout without the program: node bin/bs-job.mjs <command> [args...]
import path from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "../package.json" with { type: "json" };

const COMMANDS = {
  "cv-pdf": () => import("./cv-pdf.mjs"),
  "pdf-text": () => import("./pdf-text.mjs"),
  "figma-pdf": () => import("./figma-pdf.mjs"),
  cost: () => import("./cost.mjs"),
  jobs: async () => (await import("./jobs.mjs")).main(process.argv.slice(2)),
  clock: async () => console.log(JSON.stringify((await import("./clock.mjs")).clock(new Date()))),
  version: async () => console.log(pkg.version),
};

// The repo root the program serves: next to the compiled program, or the parent of bin/ when run
// from source. Scripts read it to find templates/cv/ on disk.
export const kitRoot = () => {
  const self = fileURLToPath(import.meta.url);
  // Bun's compiled programs load their own code from a virtual drive: /$bunfs/ or B:\~BUN\.
  const compiled = /\$bunfs|~BUN/i.test(self);
  return compiled ? path.dirname(process.execPath) : path.resolve(path.dirname(self), "..");
};

const [cmd, ...rest] = process.argv.slice(2);
if (!COMMANDS[cmd]) {
  console.error(`usage: bs-job <${Object.keys(COMMANDS).join("|")}> [args...]`);
  process.exit(2);
}
globalThis.BS_JOB_KIT = kitRoot();
// Each script reads its own arguments from process.argv.slice(2).
process.argv = [process.argv[0], `bs-job ${cmd}`, ...rest];
await COMMANDS[cmd]();
