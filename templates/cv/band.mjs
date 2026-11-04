// C · Header band: a dark band across the top with the name and contact, then a wide main
// column and a narrow side column. Side sections come last in the DOM; grid areas place them.
import { contactList, identity, page, section, splitSections, summary } from "./lib.mjs";

const css = `
body { padding: 0 }
.cv { display: grid; grid-template-columns: 1fr 58mm; grid-template-areas: "head head" "main side" }
header { grid-area: head; background: var(--dark); color: white; padding: 11mm var(--pad) 8mm;
  border-bottom: 2mm solid var(--accent) }
header .name { color: white }
header .headline { color: #cfd3dc }
.contact { list-style: none; padding: 0; margin-top: 3mm; color: #cfd3dc; font-size: 9pt }
.contact li { display: inline }
.contact li + li::before { content: "  ·  "; white-space: pre }
main { grid-area: main; padding: 2mm 7mm var(--pad) var(--pad) }
aside { grid-area: side; padding: 2mm var(--pad) var(--pad) 0 }
aside .items li { margin-bottom: .8mm }
`;

export default function render(cv) {
  const { main, side } = splitSections(cv);
  return page(cv, css, `<div class="cv">
<header>${identity(cv)}${contactList(cv)}</header>
<main>${summary(cv)}${main.map((s) => section(s)).join("")}</main>
<aside>${side.map((s) => section(s)).join("")}</aside>
</div>`);
}
