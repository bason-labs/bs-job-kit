import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc, validateCv } from "../templates/cv/lib.mjs";
import { readProfile } from "../bin/lib/profile.mjs";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const script = at("../bin/cv-pdf.mjs");
const fake = at("fixtures/fake-chrome.mjs");
const sample = JSON.parse(readFileSync(at("../templates/cv/sample.json"), "utf8"));

for (const layout of ["classic", "sidebar", "band", "timeline"]) {
  test(`${layout} renders every section in reading order`, async () => {
    const html = (await import(`../templates/cv/${layout}.mjs`)).default(sample);
    const order = [sample.name, sample.contact[0], sample.summary.slice(0, 20), ...sample.sections.map((s) => s.heading)];
    let pos = -1;
    for (const t of order) { const i = html.indexOf(t, pos + 1); assert.ok(i > pos, `${t} after previous`); pos = i; }
    assert.match(html, /<meta charset="utf-8">/);
    assert.match(html, /@page\s*{\s*size:\s*A4/);
  });
}

test("side sections come after main sections in the DOM whatever the data order", async () => {
  const cv = { ...sample, sections: [...sample.sections].reverse() };
  for (const layout of ["classic", "sidebar", "band", "timeline"]) {
    const html = (await import(`../templates/cv/${layout}.mjs`)).default(cv);
    assert.ok(html.indexOf(">Experience<") < html.indexOf(">Skills<"), layout);
  }
});

test("photo is shown only in sidebar, only when set", async () => {
  const withPhoto = { ...sample, photo: "/tmp/me.jpg" };
  assert.match((await import("../templates/cv/sidebar.mjs")).default(withPhoto), /<img[^>]+me\.jpg/);
  assert.doesNotMatch((await import("../templates/cv/sidebar.mjs")).default({ ...sample, photo: null }), /<img/);
  assert.doesNotMatch((await import("../templates/cv/classic.mjs")).default(withPhoto), /<img/);
});

test("text is escaped", async () => {
  const html = (await import("../templates/cv/classic.mjs")).default({ ...sample, name: "R&D <Team>" });
  assert.match(html, /R&amp;D &lt;Team&gt;/);
  assert.equal(esc(`"a'`), "&quot;a&#39;");
});

test("validateCv lists problems", () => {
  assert.deepEqual(validateCv(sample), []);
  assert.deepEqual(validateCv({ sections: [{ heading: "X" }] }), ["name is required", "sections[0] needs entries or items"]);
  assert.deepEqual(validateCv({ name: "A", accent: "red;}" }), ["accent must be a hex colour such as #2f5fb3"]);
  assert.deepEqual(validateCv(null), ["the CV must be a JSON object"]);
});

test("readProfile reads flat scalars and lists, {} when missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "job-lite-profile-"));
  assert.deepEqual(readProfile(dir), {});
  writeFileSync(join(dir, "profile.yaml"),
    "# comment\ncvLayout: sidebar # trailing\nchromePath: null\nmaxCvs: 3\nok: true\ncvLanguages: [en, \"de\"]\nempty: []\nname: 'A B'\n");
  assert.deepEqual(readProfile(dir), {
    cvLayout: "sidebar", chromePath: null, maxCvs: 3, ok: true, cvLanguages: ["en", "de"], empty: [], name: "A B",
  });
});

// Runs cv-pdf in a fresh folder whose name has a space, with the fake Chrome.
const run = ({ mode = "ok", data = sample, layout = "classic", profile = null, files = {} } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "job lite x "));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  if (profile) writeFileSync(join(dir, "profile.yaml"), profile);
  const dataPath = join(dir, "cv-en.json");
  writeFileSync(dataPath, JSON.stringify(data));
  const out = join(dir, "cv-en.pdf");
  const args = [script, "--data", dataPath, "--out", out, "--chrome", fake, "--root", dir];
  if (layout) args.push("--layout", layout);
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env: { ...process.env, FAKE_CHROME: mode }, timeout: 30000 });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* left null */ }
  return { ...r, dir, out, json };
};

test("cv-pdf end to end with fake Chrome, in a folder with a space", () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(r.json.pages, 1);
  assert.equal(r.json.name, "cv-en");
  assert.equal(r.json.out, r.out);
  assert.equal(r.json.html, join(r.dir, "cv-en.html"));
  assert.ok(existsSync(r.out));
  assert.match(readFileSync(join(r.dir, "cv-en.html"), "utf8"), /Jane Nguyễn/);
  assert.match(r.json.sha256, /^[0-9a-f]{64}$/);
  assert.equal(r.json.bytes, readFileSync(r.out).length);
});

test("the layout defaults to cvLayout in profile.yaml", () => {
  const r = run({ layout: null, profile: "cvLayout: timeline\n" });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(readFileSync(r.json.html, "utf8"), /class="timeline/);
});

test("two-page result is reported, not hidden", () => {
  const r = run({ mode: "two-pages" });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(r.json.pages, 2);
});

test("bad data → bad-data, no PDF", () => {
  const r = run({ data: {} });
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "bad-data");
  assert.match(r.json.detail, /name is required/);
  assert.ok(!existsSync(r.out));
});

test("unknown layout → layout-not-found", () => {
  const r = run({ layout: "nope" });
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "layout-not-found");
  assert.ok(!existsSync(r.out));
});

test("not a PDF → not-pdf, no PDF", () => {
  const r = run({ mode: "notpdf" });
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "not-pdf");
  assert.ok(!existsSync(r.out));
});

test("Chrome failing → print-failed, no PDF", () => {
  const r = run({ mode: "fail" });
  assert.equal(r.status, 1);
  assert.equal(r.json.error, "print-failed");
  assert.ok(!existsSync(r.out));
});

test("custom layout path is loaded", () => {
  const r = run({
    layout: "./my.mjs",
    files: { "my.mjs": 'export default (cv) => `<!doctype html><meta charset="utf-8"><p class="mine">${cv.name}</p>`;\n' },
  });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(readFileSync(r.json.html, "utf8"), /class="mine"/);
});

test("no layout uses positioned boxes, which Chrome paints out of reading order", () => {
  for (const layout of ["lib", "classic", "sidebar", "band", "timeline"]) {
    assert.doesNotMatch(readFileSync(at(`../templates/cv/${layout}.mjs`), "utf8"), /position:\s*(absolute|relative|fixed|sticky)|float:/, layout);
  }
});
