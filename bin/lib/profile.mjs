// Read profile.yaml's flat lines: `key: scalar` and `key: [a, b]`. Not a YAML parser; nested
// blocks and multi-line values are ignored. Returns {} when the file is missing.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const unquote = (s) => (/^(["']).*\1$/.test(s) ? s.slice(1, -1) : s);

function scalar(raw) {
  const s = raw.trim();
  if (s === "" || s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return unquote(s);
}

// Drop a ` # comment` that is outside quotes.
function stripComment(s) {
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote) quote = null; } else if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}

export function readProfile(root) {
  const file = path.join(root, "profile.yaml");
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^([A-Za-z_][\w-]*):(.*)$/.exec(line);
    if (!m) continue;
    const value = stripComment(m[2]).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      out[m[1]] = inner ? inner.split(",").map((x) => scalar(x)).filter((x) => x !== null).map(String) : [];
    } else if (value !== "") {
      out[m[1]] = scalar(value);
    } else {
      out[m[1]] = null;
    }
  }
  return out;
}
