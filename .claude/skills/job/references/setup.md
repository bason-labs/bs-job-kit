# First-use setup

The one interactive part of the skill. Ask one thing per message, wait for the answer, and never
guess a fact: anything unclear is a question to the person, not an entry in `master-cv.yaml`. Save
what they say as [capture.md](capture.md) describes. Work in this order.

1. **Say that setup comes first**: "Before I can search I need to learn about you: your CV, what
   you look for, where to look and how your CVs should look. It takes a few minutes."
2. **Their CV or job title.** Ask for their CV (any format: PDF, Word, text, a LinkedIn export, or
   just pasted) and/or the job title they want. Save the original under `references/` (a file
   verbatim, a paste as text). Read it into facts in `master-cv.yaml`: only what the CV states,
   each with `id`, `type`, `text`, `tags`, `org`, `dates` (the shape in capture.md). Anything
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
   | A company's career page | `career_site`, or its URL | named companies |
   | Wellfound | `wellfound` | startups and tech |
   | Upwork | `upwork` | freelance |
   | ITviec | `itviec` | tech jobs in Vietnam |
   | TopCV, VietnamWorks | `topcv`, `vietnamworks` | Vietnam |
   | StepStone (DE), Reed and Totaljobs (UK), Indeed (US), Seek (AU), MyCareersFuture (SG) | its search URL | examples elsewhere |

5. **Their links.** Ask once: "Send any links you have (LinkedIn, portfolio, GitHub, website)." Or
   ask for one link per message. Put each in `contact.links` of `master-cv.yaml`.
6. **How CVs are made** (`cvRoute`). Ask which they want:
   - **Automatic PDF** (default, `pdf`): needs Chrome or Edge. Check it by running
     `node bin/cv-pdf.mjs --data templates/cv/sample.json --out <a temporary pdf>`; on
     `chrome-not-found` ask for the browser's path and set `chromePath`.
   - **Figma** (`figma`): ask for the file key (`figmaFileKey`, the part of the file URL after
     `/design/`) and the name of the template frame (`figmaTemplateFrame`). Explain that tailored
     CVs are made on the file's Drafts page and need the Figma Desktop Bridge plugin running
     (Plugins, Development, Figma Desktop Bridge) with the file open. Inspect the template frame
     and write into `cv-rules.md`, under their own rules, which text node holds the name, the
     contact, the summary and each section, so [cv.md](cv.md) can fill them.
   - **Their own way** (`custom`): ask how they want their CVs made, and put their words verbatim
     into `cvCustom`.
7. **The design.** Depends on the route from step 6.
   - **`figma`:** the template frame was collected in step 6, so do not ask again. Record the
     text-node map in `cv-rules.md`; no layout file, no `cvLayout`.
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
8. **CV languages.** Two messages. First ask which languages their CVs need (`cvLanguages`). Then,
   after the answer, ask for which job languages to also make a CV in the job's language
   (`cvJdLanguages`).
9. **The scoring rules.** Show them the starter `criteria.md` in plain words and offer
   field-specific tweaks (weights, must-haves, dealbreakers). Record each change as a version bump
   with a `## Changes` line ([capture.md](capture.md)).
10. **Finish.** Commit `setup: done`, show a short summary (facts read, what they look for,
    sources, CV route and design, languages), and offer the first search: "Say 'find jobs' when
    you are ready."
