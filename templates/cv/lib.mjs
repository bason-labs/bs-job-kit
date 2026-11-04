// Shared pieces for the CV layouts: validation, escaping, the page shell and the blocks every
// layout reuses. A layout decides placement only; DOM order is always reading order:
// name, headline, contact, summary, main sections, side sections.

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const isText = (v) => typeof v === "string" && v.trim() !== "";
const isTextList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

export function validateCv(cv) {
  if (!cv || typeof cv !== "object" || Array.isArray(cv)) return ["the CV must be a JSON object"];
  const out = [];
  if (!isText(cv.name)) out.push("name is required");
  for (const k of ["lang", "headline", "summary", "summaryHeading"]) {
    if (cv[k] != null && typeof cv[k] !== "string") out.push(`${k} must be text`);
  }
  if (cv.contact != null && !isTextList(cv.contact)) out.push("contact must be a list of text");
  if (cv.photo != null && !isText(cv.photo)) out.push("photo must be a file path or null");
  if (cv.accent != null && !HEX.test(cv.accent)) out.push("accent must be a hex colour such as #2f5fb3");
  if (cv.sections != null && !Array.isArray(cv.sections)) out.push("sections must be a list");
  (Array.isArray(cv.sections) ? cv.sections : []).forEach((s, i) => {
    const at = `sections[${i}]`;
    if (!s || typeof s !== "object") return out.push(`${at} must be an object`);
    if (!isText(s.heading)) out.push(`${at}.heading is required`);
    const hasEntries = Array.isArray(s.entries);
    const hasItems = Array.isArray(s.items);
    if (!hasEntries && !hasItems) out.push(`${at} needs entries or items`);
    if (hasItems && !isTextList(s.items)) out.push(`${at}.items must be a list of text`);
    if (hasEntries) {
      s.entries.forEach((e, j) => {
        const ea = `${at}.entries[${j}]`;
        if (!e || typeof e !== "object") return out.push(`${ea} must be an object`);
        if (!isText(e.title)) out.push(`${ea}.title is required`);
        for (const k of ["meta", "text"]) if (e[k] != null && typeof e[k] !== "string") out.push(`${ea}.${k} must be text`);
        if (e.bullets != null && !isTextList(e.bullets)) out.push(`${ea}.bullets must be a list of text`);
      });
    }
  });
  return out;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Main sections first, then side sections, each group in data order.
export function splitSections(cv) {
  const all = Array.isArray(cv.sections) ? cv.sections : [];
  return { main: all.filter((s) => !s.side), side: all.filter((s) => s.side) };
}

// An email or web address becomes a link; anything else stays text.
export function contactItem(c) {
  const t = String(c).trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return `<a href="mailto:${esc(t)}">${esc(t)}</a>`;
  if (/^https?:\/\/\S+$/i.test(t)) return `<a href="${esc(t)}">${esc(t)}</a>`;
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/\S*$/i.test(t)) return `<a href="https://${esc(t)}">${esc(t)}</a>`;
  return esc(t);
}

export const contactList = (cv, cls = "contact") =>
  (cv.contact?.length ? `<ul class="${cls}">${cv.contact.map((c) => `<li>${contactItem(c)}</li>`).join("")}</ul>` : "");

export const identity = (cv) =>
  `<h1 class="name">${esc(cv.name)}</h1>${cv.headline ? `<p class="headline">${esc(cv.headline)}</p>` : ""}`;

export const summary = (cv) => (cv.summary
  ? `<section class="summary"><h2>${esc(cv.summaryHeading || "Summary")}</h2><p>${esc(cv.summary)}</p></section>`
  : "");

// A heading line: title and meta in one element, so they stay one run of text.
export function entry(e) {
  const head = `<h3 class="entry-head"><b>${esc(e.title)}</b>${e.meta ? `<span class="meta"> · ${esc(e.meta)}</span>` : ""}</h3>`;
  const text = e.text ? `<p>${esc(e.text)}</p>` : "";
  const bullets = e.bullets?.length ? `<ul class="bullets">${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
  return `<div class="entry">${head}${text}${bullets}</div>`;
}

export function section(s, { entriesClass = "entries" } = {}) {
  const body = [];
  if (s.entries?.length) body.push(`<div class="${entriesClass}">${s.entries.map(entry).join("")}</div>`);
  if (s.items?.length) body.push(`<ul class="items">${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`);
  return `<section class="${s.side ? "side" : "main"}"><h2>${esc(s.heading)}</h2>${body.join("")}</section>`;
}

const ACCENT = "#2f5fb3";

// The shared base: A4 with no printer margin, 13 mm page padding (layouts may override it),
// body text at 9.5 pt, system fonts, accent as a CSS variable.
export const baseCss = (cv) => `
@page { size: A4; margin: 0 }
:root { --accent: ${HEX.test(cv.accent ?? "") ? cv.accent : ACCENT}; --ink: #23262d; --dark: #3b3f4a; --muted: #5d6270; --pad: 13mm;
  --tint: color-mix(in srgb, var(--accent) 10%, white) }
* { box-sizing: border-box }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact }
body { margin: 0; padding: var(--pad); font: 9.5pt/1.4 "Segoe UI", Inter, Arial, sans-serif; color: var(--ink) }
h1, h2, h3, p, ul { margin: 0 }
a { color: inherit; text-decoration: none }
.name { font-size: 22pt; line-height: 1.15; font-weight: 700; color: var(--dark) }
.headline { font-size: 11pt; color: var(--muted); margin-top: 1mm }
h2 { font-size: 11pt; font-weight: 650; color: var(--accent); margin: 5mm 0 1.8mm }
.entry { margin-bottom: 3mm; break-inside: avoid }
.entry-head { font-size: 10pt; font-weight: 400 }
.entry-head b { font-weight: 650 }
.meta { color: var(--muted) }
.entry p { margin-top: .6mm }
.bullets { padding-left: 4.5mm; margin-top: .8mm }
.bullets li { margin-bottom: .4mm }
.items { list-style: none; padding: 0 }
`;

export const page = (cv, css, body) => `<!doctype html>
<html lang="${esc(cv.lang || "en")}">
<head>
<meta charset="utf-8">
<title>${esc(cv.name)}</title>
<style>${baseCss(cv)}${css}</style>
</head>
<body>
${body}
</body>
</html>
`;
