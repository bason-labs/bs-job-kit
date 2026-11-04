// Fake figma-console-mcp for tests: newline-delimited JSON-RPC over stdio. FAKE_MODE picks the
// behaviour: ok, two-pages, offline, drafts, notpdf.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const mode = process.env.FAKE_MODE ?? "ok";
const pdf = (f) => readFileSync(new URL(f, import.meta.url)).toString("base64");
const send = (m) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...m })}\n`);
const text = (body, isError = false) => ({ content: [{ type: "text", text: JSON.stringify(body) }], isError });

const execute = () => {
  if (mode === "drafts") return text({ success: false, error: "BRIDGE:NOT_IN_DRAFTS:node 1:2 is on page Resume" });
  const base64 = mode === "notpdf" ? Buffer.from("hello").toString("base64") : pdf(mode === "two-pages" ? "two-page.pdf" : "one-page.pdf");
  return text({ success: true, result: { base64, name: "ACME_FE_EN_v1", width: 595, height: 842, pageName: "Drafts" }, fileContext: { fileKey: "ACME_KEY_123" } });
};

createInterface({ input: process.stdin }).on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.id === undefined) return;
  if (msg.method === "initialize") return send({ id: msg.id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "fake", version: "0" } } });
  if (msg.method === "tools/call" && msg.params.name === "figma_get_status") {
    return send({ id: msg.id, result: text({ setup: { valid: mode !== "offline", probeResult: { success: mode !== "offline" } } }) });
  }
  if (msg.method === "tools/call" && msg.params.name === "figma_execute") return send({ id: msg.id, result: execute() });
  send({ id: msg.id, error: { code: -32601, message: "unknown" } });
});
