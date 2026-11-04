// Stand-in for Chrome in tests. FAKE_CHROME: ok | two-pages | notpdf | fail
import { copyFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const arg = process.argv.find((a) => a.startsWith("--print-to-pdf="));
const out = arg && arg.slice("--print-to-pdf=".length);
const mode = process.env.FAKE_CHROME || "ok";
if (mode === "fail" || !out) process.exit(3);
if (mode === "notpdf") writeFileSync(out, "hello");
else copyFileSync(join(here, mode === "two-pages" ? "two-page.pdf" : "one-page.pdf"), out);
