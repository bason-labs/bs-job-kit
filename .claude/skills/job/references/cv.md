# Tailor a CV, then evaluate it

Before tailoring, read [cv-playbook.md](cv-playbook.md): what to change per JD and per company
type (keywords, title, summary, bullet order, projects, format). Read `cv-rules.md` too: the
owner's own CV rules override the playbook.

## Truth (master facts only)

- Every bullet and the summary rest on facts in `master-cv.yaml`; keep the fact ids each one uses in
  the job README's CV notes. Rewording and shortening are fine; adding is not.
- No number, skill, tool, title, employer or date the facts do not contain. Never attach a
  technology-specific duration ("5 years of React") unless a fact states it; overall years do not
  carry over to one technology.
- A JD requirement the facts lack is left out and becomes a question for the owner in the report
  (and a `Q-` file); carry on without it.

## Language

- Always make a CV in each language of `cvLanguages` (profile.yaml). Also make one in the JD's
  language when that language is in `cvJdLanguages`.
- Write the whole CV in that language; technology names stay as they are. For a non-English CV set
  `summaryHeading` and the section headings in the CV language (see `templates/cv/README.md`). Facts in Vietnamese come
  from `textVi`; any other language from `text_<lang>` when it exists; otherwise translate
  faithfully.
- Example: `cvLanguages: [en]` with `cvJdLanguages: [vi]` gives a Vietnamese JD a Vietnamese and an
  English CV, and an English JD an English CV only.

## Route

`cvRoute` in `profile.yaml` picks how the CV is made. The Layout rules and the Order check below
apply to every route.

### `pdf`

- Write `jobs/<id>/cv-<lang>.json` (shape in `templates/cv/README.md`), one per language. `name`
  and `contact` come from `master-cv.yaml` `contact` (`name`; `contact` is email, phone, location,
  then `contact.links`), never from memory. The layout is `cvLayout` (a name or a `./path.mjs`).
- Run `node bin/cv-pdf.mjs --data jobs/<id>/cv-<lang>.json --out jobs/<id>/cv-<lang>.pdf`. It
  prints `{out, html, bytes, pages, sha256, name}` or `{error, detail}`. Keep its JSON for the
  evaluator.
- `chrome-not-found`: skip the CV step and report it (`chromePath` in profile.yaml can name the
  browser). `bad-data`: fix the JSON. Other errors: report them.
- Fix a layout problem (over one page) by trimming words in the JSON, then run it again.

### `figma`

- Tools: `figma_get_status`, `figma_execute`, `figma_capture_screenshot` only.
- Start with `figma_get_status` (`probe: true`; it can take ~15 s). Not connected: skip the CV step
  for this run, say so in the report, and go on.
- Pass `fileKey` (`profile.yaml` `figmaFileKey`) on **every** `figma_execute` call.
- Find the Drafts page with `figma.root.children.find((p) => p.name === "Drafts")`; call
  `await figma.setCurrentPageAsync(drafts)` before creating or cloning. Never create, rename or
  delete a page.
- Templates are the A4 frames on the other pages; never change them. Clone one by id into Drafts
  (`const copy = (await figma.getNodeByIdAsync(id)).clone(); drafts.appendChild(copy);`) and edit
  only the copy. Never walk a template's node tree; inspect the copy instead.
- **Start point:** clone the frame whose node id is in `figmaTemplateFrame` (the owner's template). Setup
  records in `cv-rules.md` once which text nodes hold the name, contact, summary and each section;
  use that. Never edit it; edit only the clone.
- Name the copy `<COMPANY>_<ROLE>_<LANG>_v<n>`, `n` one more than any Drafts frame with that
  prefix. Never edit an earlier version's frame.
- Keep each `figma_execute` call under 30 s and write at most ~6 texts per call. Load every font
  explicitly as `{family, style}` before changing text. Normalise whitespace in the text you write.
  A `bad-reply` error means retry after a few seconds.
- Check with `figma_capture_screenshot` before exporting.
- Export: `node bin/figma-pdf.mjs --frame <frame id> --out jobs/<id>/cv-<lang>.pdf` prints the
  file's facts (`pages`, `bytes`, `sha256`, `name`) or an error; keep its output for the evaluator.
  `figma-unavailable`: skip and report. `not-in-drafts`: you edited the wrong frame; fix that first.
  `no-file-key`: set `figmaFileKey` in `profile.yaml`.

### `custom`

- Follow the instruction in `cvCustom` (profile.yaml) in plain words. End with a PDF at
  `jobs/<id>/cv-<lang>.pdf`.
- Get its facts with `node bin/pdf-text.mjs jobs/<id>/cv-<lang>.pdf` (it prints `bytes`, `sha256`,
  `pages` and the text); keep that for the evaluator.
- If the instruction cannot be followed with the tools at hand, skip the CV step and report it.

## Layout

- Fixed: **one A4 page** (portrait), body text at least 9 pt, the contact line present, no hidden,
  clipped or overflowing text. ATS-safe: all content as real text, plain section headings, text in
  one reading order (top to bottom, left column before right). A heading and its dates or
  technologies are one text node (styles by range), never separate boxes.
- You may change section order, emphasis and which projects appear; fonts, colours and spacing
  follow the layout or `cv-rules.md`. The owner's chosen `cvLayout` is always used. The requirement is one
  reading order, checked with `node bin/pdf-text.mjs --expect` (see the Order check), not one
  column ([cv-playbook.md](cv-playbook.md)).

## Order check (every route)

After the PDF exists, run
`node bin/pdf-text.mjs <pdf> --expect "<name>|<summary start>|<first heading>|…"`
with the strings in reading order. It exits 1 with `outOfOrder` or `missing` when the text does not
read in order: fix the CV and export again. `pdf-unreadable` counts as a failed export.

## Evaluate (fresh context, every CV)

Run the `job-cv-evaluator` agent with only: the paths `jobs/<id>/jd.md`, `jobs/<id>/cv-<lang>.pdf`,
`master-cv.yaml`, `criteria.md`, `cv-rules.md` (when it exists),
`.claude/skills/job/references/cv-playbook.md`, the target language, the company name and the
export's JSON.
Never pass your tailoring notes or reasoning. On Codex, do its work as a separate step that reads
only those inputs.

Then:
- **Fixes:** apply the evaluator's fixes that the facts support, once (a new Figma version
  `_v<n+1>`, or edited CV data), re-export, and note what changed. Do not re-run the evaluator in a
  loop.
- **Hard fail** that the fix pass cannot remove (an invented claim you cannot reword, over one page
  after the fix): `status: cv-failed` with the reason.
- **Under the pass mark** with no hard fail: keep `ready`, set `cv.flagged: true`, and report the
  weakest criterion.
- Write the evaluation into the job README (`## CV evaluation`: total, each criterion with its
  justification, hard fails, fixes applied, the `cv-v<n>` version) and set the `cv:` frontmatter.
