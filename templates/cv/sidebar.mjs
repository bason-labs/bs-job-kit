// B · Sidebar: a tinted left column with the photo, name, contact and the side sections
// (skills, links); the wide right column holds the summary and experience. The side sections
// come last in the DOM and are placed in the left column with grid areas.
import { pathToFileURL } from "node:url";
import { contactList, esc, identity, page, section, splitSections, summary } from "./lib.mjs";

const css = `
html { background: linear-gradient(to right, var(--tint) 64mm, white 64mm) }
body { padding: 0 }
.cv { display: grid; grid-template-columns: 64mm 1fr; grid-template-rows: auto 1fr;
  grid-template-areas: "head main" "side main" }
header { grid-area: head; padding: var(--pad) 7mm 0 10mm }
main { grid-area: main; padding: calc(var(--pad) - 5mm) var(--pad) var(--pad) 8mm }
aside { grid-area: side; padding: 0 7mm var(--pad) 10mm }
.photo { display: block; width: 30mm; height: 30mm; border-radius: 50%; object-fit: cover; margin-bottom: 4mm }
.name { font-size: 18pt }
.headline { font-size: 10pt }
.contact { list-style: none; padding: 0; margin-top: 4mm; font-size: 9pt; overflow-wrap: anywhere }
.contact li { margin-bottom: 1mm }
.items li { margin-bottom: .8mm }
`;

const photoSrc = (p) => (/^(?:https?|file|data):/i.test(p) ? p : pathToFileURL(p).href);

export default function render(cv) {
  const { main, side } = splitSections(cv);
  const photo = cv.photo ? `<img class="photo" src="${esc(photoSrc(cv.photo))}" alt="">` : "";
  return page(cv, css, `<div class="cv">
<header>${photo}${identity(cv)}${contactList(cv)}</header>
<main>${summary(cv)}${main.map((s) => section(s)).join("")}</main>
<aside>${side.map((s) => section(s)).join("")}</aside>
</div>`);
}
