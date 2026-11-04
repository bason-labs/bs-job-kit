// A · Classic single column. Safest for systems that read CVs automatically.
import { contactList, identity, page, section, splitSections, summary } from "./lib.mjs";

const css = `
.contact { list-style: none; padding: 0; margin-top: 1.5mm; color: var(--muted) }
.contact li { display: inline }
.contact li + li::before { content: "  |  "; white-space: pre; color: #b4b8c2 }
header { padding-bottom: 1mm; border-bottom: 1.5pt solid var(--accent) }
h2 { border-bottom: .5pt solid #d6d9df; padding-bottom: .8mm }
.items li { display: inline }
.items li + li::before { content: " · "; color: var(--muted) }
`;

export default function render(cv) {
  const { main, side } = splitSections(cv);
  return page(cv, css, `<header>${identity(cv)}${contactList(cv)}</header>
<main>${summary(cv)}${main.map((s) => section(s)).join("")}${side.map((s) => section(s)).join("")}</main>`);
}
