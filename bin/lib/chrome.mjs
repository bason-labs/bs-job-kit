// Find a Chromium-family browser and print an HTML file to PDF with it.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

function candidates(platform, env) {
  if (platform === "darwin") {
    return ["Google Chrome", "Chromium", "Microsoft Edge"].map(
      (n) => `/Applications/${n}.app/Contents/MacOS/${n}`);
  }
  if (platform === "win32") {
    const w = path.win32.join;
    const chrome = ["PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"]
      .filter((k) => env[k]).map((k) => w(env[k], "Google", "Chrome", "Application", "chrome.exe"));
    const edge = ["PROGRAMFILES(X86)", "PROGRAMFILES"]
      .filter((k) => env[k]).map((k) => w(env[k], "Microsoft", "Edge", "Application", "msedge.exe"));
    return [...chrome, ...edge];
  }
  return ["google-chrome", "chromium", "chromium-browser"].map((n) => `/usr/bin/${n}`);
}

// Case-insensitive copy of env (a spread copy of process.env on Windows loses that).
function foldEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env || {})) out[k.toUpperCase()] = v;
  return out;
}

export function findChrome({ platform, env, exists, override = null }) {
  const e = foldEnv(env);
  const list = [override, e.CHROME_PATH, ...candidates(platform, e)];
  return list.find((p) => p && exists(p)) ?? null;
}

export async function printToPdf({ chrome, htmlPath, out, timeoutMs = 60000 }) {
  let profile;
  try {
    profile = mkdtempSync(path.join(tmpdir(), "bs-job-chrome-"));
    rmSync(out, { force: true }); // a stale file must not pass for a fresh print
    const flags = [
      "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      "--no-pdf-header-footer", `--user-data-dir=${profile}`, `--print-to-pdf=${out}`,
      pathToFileURL(path.resolve(htmlPath)).href,
    ];
    const [cmd, args] = chrome.endsWith(".mjs")
      ? [process.execPath, [chrome, ...flags]] : [chrome, flags];
    const detail = await new Promise((resolve) => {
      let stderr = "";
      let done = false;
      const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
      let child;
      const timer = setTimeout(() => { child?.kill(); finish(`timed out after ${timeoutMs} ms`); }, timeoutMs);
      try {
        child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
      } catch (e) { return finish(String(e.message || e)); }
      child.stderr.on("data", (d) => { if (stderr.length < 2000) stderr += d; });
      child.on("error", (e) => finish(String(e.message || e)));
      child.on("close", (code) => finish(code === 0 ? null : `exit code ${code}: ${stderr.trim().slice(0, 500)}`));
    });
    if (detail) return { error: "print-failed", detail };
    if (!existsSync(out)) return { error: "print-failed", detail: "Chrome exited without writing the PDF" };
    return { ok: true };
  } catch (e) {
    return { error: "print-failed", detail: String(e.message || e) };
  } finally {
    if (profile) {
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* best effort */ }
    }
  }
}
