// D · Modern timeline: a centred header and the entries of main sections on a vertical line.
// Side sections follow at the end, two to a row.
import { contactList, identity, page, section, splitSections, summary } from "./lib.mjs";

const css = `
header { text-align: center; padding-bottom: 1mm }
.contact { list-style: none; padding: 0; margin-top: 2mm; color: var(--muted) }
.contact li { display: inline }
.contact li + li::before { content: "  ·  "; white-space: pre; color: var(--accent) }
.timeline { border-left: 1.5pt solid var(--accent); margin-left: 1.5mm; padding-left: 5mm }
/* The dot is an inline box pulled onto the line, not a positioned one: positioned boxes paint
   last, which would move the entries after the side sections in the PDF's text order. */
.timeline .entry-head::before { content: ""; display: inline-block; width: 2.6mm; height: 2.6mm;
  border-radius: 50%; background: var(--accent); margin: 0 3.97mm 0 -6.57mm; vertical-align: 0 }
.sides { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm }
.items li { display: inline }
.items li + li::before { content: " · "; color: var(--muted) }
`;

export default function render(cv) {
  const { main, side } = splitSections(cv);
  return page(cv, css, `<header>${identity(cv)}${contactList(cv)}</header>
<main>${summary(cv)}${main.map((s) => section(s, { entriesClass: "timeline" })).join("")}</main>
${side.length ? `<div class="sides">${side.map((s) => section(s)).join("")}</div>` : ""}`);
}
