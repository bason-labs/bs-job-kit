# First-use setup

The one interactive part of the skill. Ask one thing per message, wait for the answer, and never
guess a fact: anything unclear is a question to the person, not an entry in `master-cv.yaml`. Save
what they say as [capture.md](capture.md) describes. Work in this order.

**Resuming.** Setup can stop at any point. Start at the first step whose answer is missing: step 2
if `master-cv.yaml` has no facts or no `contact.name`/`contact.email`; step 3 if `profile.yaml`
`roles` is empty; step 4 if `sources` is only the starter value and they have not confirmed it
(ask once); step 5 if `contact.links` is empty and they have not said they have none; step 6 if
the `cvRoute` is not set to what the route needs (`figma` needs `figmaFileKey` and
`figmaTemplateFrame`, `custom` needs `cvCustom`); step 7 if the design is missing (`pdf` with
`cvLayout` still the starter `classic` and no answer yet counts as missing: ask); step 8 if
`cvLanguages` is empty; step 9 if `criteria.md` has no `## Changes` line beyond the first
version. When unsure whether a step was answered, ask it again briefly. Done means `setupDone: true`.

1. **Say that setup comes first**: "Before I can search I need to learn about you: your CV, what
   you look for, where to look and how your CVs should look. It takes a few minutes."
2. **Their CV or job title.** Ask for their CV (any format: PDF, Word, text, a LinkedIn export, or
   just pasted) and/or the job title they want. Save the original under `references/` (a file
   verbatim, a paste as text). Read it into facts in `master-cv.yaml`: only what the CV states,
   each with `id`, `type`, `text`, `tags`, `org`, `dates` (the shape in capture.md). Also
   fill `contact.name`, `contact.email`, `contact.phone` and `contact.location` in `master-cv.yaml`
   from the CV, asking one at a time for anything it does not state (never guessing), and seed
   `headlineOptions` from the CV's own headline or the target title they gave. Anything
   unclear (a date, a number, a role's scope) is a question to them, never a fact. With only a job
   title and no CV, ask for their experience one job at a time instead.
3. **What they look for.** From the facts and the title, propose `roles`, `includeKeywords`,
   `seniority`, `locations`, `workModes`, `languages` and `timezoneOverlap` as one short list.
   They confirm or change it; write it to `profile.yaml`. Ask for `minSalary` and `currency` too,
   and leave them null if they decline.
4. **Where to look.** Suggest boards from where they live and what they do, as a table, and let
   them confirm. They can add any job-board URL; it goes into `sources` as a URL entry.

   | Board | `sources` entry | For whom |
   | --- | --- | --- |
   | LinkedIn | `linkedin` | everyone |
   | A company's career page | `career_site` (its guide is `sources/career-site.md`), or its URL | named companies |
   | Wellfound | `wellfound` | startups and tech |
   | Upwork | `upwork` | freelance |
   | ITviec | `itviec` | tech jobs in Vietnam |
   | TopCV, VietnamWorks | `topcv`, `vietnamworks` | Vietnam |
   | StepStone (DE), Reed and Totaljobs (UK), Indeed (US), Seek (AU), MyCareersFuture (SG) | its search URL | examples elsewhere |

5. **Their links.** One question: "Send any links you have (LinkedIn, portfolio, GitHub, website)."
   Put each in `contact.links` of `master-cv.yaml`.
6. **How CVs are made** (`cvRoute`). Ask which they want:
   - **Automatic PDF** (default, `pdf`): needs Chrome or Edge. Check it by running
     `node bin/cv-pdf.mjs --data templates/cv/sample.json --out <a temporary pdf>`; on
     `chrome-not-found` ask for the browser's path and set `chromePath`.
   - **Figma** (`figma`): ask for the file key (`figmaFileKey`, the part of the file URL after
     `/design/`) and the name of the template frame. Explain that tailored CVs are made on the
     file's Drafts page and need the Figma Desktop Bridge plugin running (Plugins, Development,
     Figma Desktop Bridge) with the file open. Look the frame up by name with `figma_execute` (find
     the frame by that name on its page, passing `fileKey`) and store its **node id** in
     `figmaTemplateFrame`; if the name matches none or several, ask which one. The text-node map
     is recorded in step 7, not here.
     **Windows:** the Figma MCP server in `.mcp.json` must start through `cmd`; change it to
     `"command": "cmd", "args": ["/c","npx","-y","figma-console-mcp@1.40.9"]`.
   - **Their own way** (`custom`): ask how they want their CVs made, and put their words verbatim
     into `cvCustom`.
7. **The design.** Depends on the route from step 6.
   - **`figma`:** the template frame was collected in step 6, so do not ask again. Inspect it
     (by its id) and write into `cv-rules.md`, under their own rules, which text node holds the
     name, the contact, the summary and each section, so [cv.md](cv.md) can fill them. No layout
     file, no `cvLayout`.
   - **`custom`:** no layout choice. Record any design notes they give, together with their
     `cvCustom` instruction.
   - **`pdf`:** ask: "Do you have a CV design to copy? Any file works (PDF, image, Figma link)."
     - **Yes:** write `cv-template.mjs` recreating its look (the custom layout shape is in
       `templates/cv/README.md`), set `cvLayout: ./cv-template.mjs`, render
       `templates/cv/sample.json` with it, show them the PDF, and adjust until they are happy.
     - **No:** ask them to open `templates/cv/previews.html` (give its absolute path), pick A
       classic, B sidebar, C band or D timeline, and set `cvLayout`. For B or C add the ATS note:
       two-column and banded layouts can be read out of order by automatic CV screening, so
       classic is safer when most applications go through such systems ([cv-playbook.md](cv-playbook.md)).
       Whatever they pick is the layout used from then on.
8. **CV languages.** Two messages. First ask which languages their CVs need (`cvLanguages`). Then,
   after the answer, ask for which job languages to also make a CV in the job's language
   (`cvJdLanguages`).
9. **The scoring rules.** Show them the starter `criteria.md` in plain words and offer
   field-specific tweaks (weights, must-haves, dealbreakers). Record each change as a version bump
   with a `## Changes` line ([capture.md](capture.md)).
10. **Finish.** Set `setupDone: true` in `profile.yaml`. Commit `setup: done`, show a short summary (facts read, what they look for,
    sources, CV route and design, languages), and offer the first search: "Say 'find jobs' when
    you are ready."
