// Export one Figma frame on the Drafts page to a PDF file, without passing its bytes through the
// model. Starts its own figma-console-mcp (the Desktop Bridge plugin connects to every server on
// ports 9223–9232, so it coexists with the chat's), waits for the bridge, runs exportAsync.
//   node bin/figma-pdf.mjs --frame <nodeId> --out <path> [--file-key <key>] [--root <dir>] [--server "<cmd>"] [--wait-ms <n>]
// Prints {"out","bytes","pages","sha256","name"} and exits 0, or {"error","detail"} and exits 1
// without writing anything. Errors: no-file-key, figma-unavailable, not-in-drafts, not-found, not-pdf, bad-reply.
import { spawn } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { pdfFacts } from "./lib/pdf.mjs";
import { readProfile } from "./lib/profile.mjs";

const DEFAULT_SERVER = "npx -y figma-console-mcp@1.40.9";

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
if (!args.frame || !args.out) {
  console.error('usage: node bin/figma-pdf.mjs --frame <nodeId> --out <path> [--file-key <key>] [--root <dir>] [--server "<cmd>"]');
  process.exit(2);
}
const waitMs = Number(args["wait-ms"] ?? 20000);
const fileKey = args["file-key"] ?? readProfile(resolve(args.root ?? ".")).figmaFileKey ?? null;
if (!fileKey) {
  console.log(JSON.stringify({ error: "no-file-key", detail: "pass --file-key or set figmaFileKey in profile.yaml" }));
  process.exit(1);
}

const [cmd, ...cmdArgs] = (args.server ?? DEFAULT_SERVER).split(/\s+/).filter(Boolean);
const server = spawn(cmd, cmdArgs, { stdio: ["pipe", "pipe", "ignore"], env: { ...process.env, LOG_LEVEL: "warn" } });

const fail = (error, detail) => {
  console.log(JSON.stringify({ error, detail }));
  server.kill();
  process.exit(1);
};
server.on("error", (e) => fail("figma-unavailable", `could not start the Figma MCP server: ${e.message}`));

let nextId = 1;
const pending = new Map();
createInterface({ input: server.stdout }).on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const p = msg.id !== undefined && pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.error) p.reject(new Error(msg.error.message));
  else p.resolve(msg.result);
});
const send = (m) => server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...m })}\n`);
const request = (method, params, timeoutMs) =>
  new Promise((res, rej) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      rej(new Error(`${method} timed out`));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => (clearTimeout(timer), res(v)),
      reject: (e) => (clearTimeout(timer), rej(e)),
    });
    send({ id, method, params });
  });
const tool = (name, toolArgs, timeoutMs) => request("tools/call", { name, arguments: toolArgs }, timeoutMs);
const body = (result) => {
  try {
    return JSON.parse(result?.content?.[0]?.text ?? "null");
  } catch {
    return null;
  }
};

// The old app's export snippet (bs-job-agents bridges/figma/plugin-code.ts exportPdfCode).
const exportCode = (id) => `// bs-bridge:op=export-pdf
const id = ${JSON.stringify(id)};
const draftsName = "Drafts";
const node = await figma.getNodeByIdAsync(id);
if (!node) throw new Error("BRIDGE:NOT_FOUND:node " + id + " not found");
if (node.type === "PAGE" || node.type === "DOCUMENT" || typeof node.exportAsync !== "function") throw new Error("BRIDGE:NOT_FOUND:node " + id + " is a " + node.type);
let page = node.parent;
while (page && page.type !== "PAGE") page = page.parent;
if (!page || page.name !== draftsName) throw new Error("BRIDGE:NOT_IN_DRAFTS:node " + id + " is on page " + (page ? page.name : "(none)"));
const bytes = await node.exportAsync({ format: "PDF" });
return { base64: figma.base64Encode(bytes), name: node.name, width: node.width, height: node.height, pageName: page.name };`;

const connected = (b) => {
  const setup = b && typeof b.setup === "object" && b.setup ? b.setup : {};
  return setup.probeResult ? setup.probeResult.success === true : setup.valid === true;
};

const main = async () => {
  try {
    await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "bs-job-lite", version: "1" } }, 30000);
  } catch (e) {
    return fail("figma-unavailable", `the Figma MCP server did not start: ${e.message}`);
  }
  send({ method: "notifications/initialized" });

  const deadline = Date.now() + waitMs;
  let ready = false;
  while (!ready && Date.now() < deadline) {
    try {
      ready = connected(body(await tool("figma_get_status", { probe: true }, Math.max(1000, deadline - Date.now()))));
    } catch {
      ready = false;
    }
    if (!ready) await new Promise((r) => setTimeout(r, Math.min(1000, Math.max(0, deadline - Date.now()))));
  }
  if (!ready) return fail("figma-unavailable", "Figma desktop with the Desktop Bridge plugin is not connected");

  let reply;
  try {
    reply = body(await tool("figma_execute", { code: exportCode(args.frame), timeout: 30000, fileKey }, 45000));
  } catch (e) {
    return fail("bad-reply", e.message);
  }
  if (!reply || reply.success !== true) {
    const err = String(reply?.error ?? "no reply");
    if (err.includes("BRIDGE:NOT_IN_DRAFTS")) return fail("not-in-drafts", err);
    if (err.includes("BRIDGE:NOT_FOUND")) return fail("not-found", err);
    return fail("bad-reply", err);
  }
  const bytes = Buffer.from(String(reply.result?.base64 ?? ""), "base64");
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return fail("not-pdf", `the export of ${reply.result?.name} is not a PDF`);

  const out = resolve(args.out);
  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.tmp-${process.pid}`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, out);
  const facts = pdfFacts(bytes);
  console.log(JSON.stringify({ out, bytes: facts.bytes, pages: facts.pages, sha256: facts.sha256, name: reply.result?.name ?? null }));
  server.kill();
  process.exit(0);
};

main();
