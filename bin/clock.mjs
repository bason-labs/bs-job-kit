// Print the current UTC time as {"marker":"20261103T101500Z","start":"2026-11-03T10:15:00Z"}.
// Replaces `date -u`, which Windows does not have.
import { fileURLToPath } from "node:url";

export function clock(date) {
  const start = date.toISOString().replace(/\.\d+Z$/, "Z");
  return { marker: start.replace(/[-:]/g, ""), start };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(clock(new Date())));
}
