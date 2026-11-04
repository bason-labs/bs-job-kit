# CV layouts

The automatic PDF route turns a CV's data (`jobs/<id>/cv-<lang>.json`) into HTML with a layout
and prints it to an A4 PDF with headless Chrome or Edge:

```bash
bs-job cv-pdf --data jobs/<id>/cv-en.json --out jobs/<id>/cv-en.pdf [--layout sidebar] [--chrome <path>]
```

The layout defaults to `cvLayout` and the browser to `chromePath` in `profile.yaml`. The HTML is
kept next to the PDF (`cv-en.html`) so it can be opened in a browser. Open `previews.html` to see
the four layouts side by side.

| `cvLayout` | Look |
| --- | --- |
| `classic` | A. One column top to bottom. Safest for systems that read CVs automatically. |
| `sidebar` | B. A tinted left column with photo, name, contact, skills and links; experience on the right. |
| `band` | C. A dark name band across the top, experience wide on the left, skills narrow on the right. |
| `timeline` | D. A centred header and jobs on a vertical timeline. |
| `./my-cv.mjs` | Your own layout, a path relative to the repo root (see below). |

## The data

```json
{
  "lang": "en",
  "name": "Jane Nguyễn",
  "headline": "Senior Frontend Engineer",
  "contact": ["jane@example.com", "+84 90 000 0000", "Da Nang, Vietnam", "github.com/jn-example"],
  "photo": null,
  "accent": "#2f5fb3",
  "summary": "…",
  "sections": [
    { "heading": "Experience", "side": false,
      "entries": [ { "title": "Senior Engineer, Lotus Ledger", "meta": "2022 – present", "text": "…", "bullets": ["…"] } ] },
    { "heading": "Skills", "side": true, "items": ["React", "TypeScript"] }
  ]
}
```

- `name` is required. Everything else is optional.
- `contact`: a list of text. An email or web address becomes a link.
- `photo`: a file path, relative to the JSON file, or `null`. Only `sidebar` shows it.
- `accent`: a hex colour for headings and rules.
- `summaryHeading`: the summary's heading, `"Summary"` when left out. Set it for other languages.
- Each section has a `heading` and `entries` (each with a `title`, and optional `meta`, `text`,
  `bullets`) or `items` (a list of text), or both.
- `side: true` marks a short section (skills, languages, links). `sidebar` and `band` put these
  in their narrow column; `classic` and `timeline` put them at the end.

`bs-job cv-pdf` checks the data first and reports every problem as `bad-data`.

## Reading order

Job sites and HR systems read the PDF's text in the order Chrome writes it, which follows the
HTML. Every layout therefore writes: name, headline, contact, summary, main sections, side
sections, whatever the order in the data. Columns are placed with CSS grid areas, never by moving
side sections earlier in the HTML. Check a PDF with:

```bash
bs-job pdf-text cv-en.pdf --expect "Jane Nguyễn|Summary|Experience|Skills"
```

## Writing your own layout

A layout is a module whose default export takes the CV data and returns a whole HTML document:

```js
// my-cv.mjs, at the repo root; set cvLayout: ./my-cv.mjs in profile.yaml
import { esc, splitSections } from "./templates/cv/lib.mjs";

export default function render(cv) {
  const { main, side } = splitSections(cv);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0 } body { margin: 0; padding: 13mm; font: 9.5pt/1.4 "Segoe UI", Inter, Arial, sans-serif }
  </style></head><body><h1>${esc(cv.name)}</h1>…</body></html>`;
}
```

Rules that keep the PDF readable by machines:

- Escape every piece of text with `esc`.
- Keep a heading's title and meta (dates, place) in one element.
- Keep the HTML in reading order; place columns with grid areas.
- Avoid `position: absolute/relative` and floats for text: Chrome paints positioned boxes last,
  which moves their text out of order in the PDF.
- Use `@page { size: A4; margin: 0 }` and pad the page yourself, 12–14 mm.
- Body text at least 9 pt.

`lib.mjs` also has the blocks the built-in layouts use (`identity`, `contactList`, `summary`,
`section`, `entry`, `page`, `baseCss`); reading `classic.mjs` is the quickest start.
