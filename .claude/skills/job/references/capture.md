# Capture what the owner said

Every message that carries context is written down before the work starts, so no later run asks
for it again. A bare command ("find jobs", "status", "continue") has nothing to capture.

1. **Keep the words.** Save the message verbatim to `references/<yyyy-mm-dd>-<slug>.md` (`-2`, `-3`
   on a collision). Files in `references/` are never edited.
2. **Write what it means** into the file that owns it:
   - **A fact about the owner** (a job, a project, a skill, a number, a date): add it to
     `master-cv.yaml` as a new fact in the file's existing shape (`id`, `type`, `text`, `tags`,
     `org`, `dates`), with only what they said. `text` is in the first language of `cvLanguages`;
     add a faithful translation for each other language the CVs need: `textVi` for `vi` (kept for
     existing files), `text_<lang>` for any other (`text_de`). Never change or delete an existing
     fact unless they ask for that fact by name. Every added or changed fact is listed in the
     report.
   - **What the owner looks for** (roles, locations, work modes, seniority, salary, sources,
     keywords, companies to avoid, `fitThreshold`, `maxCvs`, `maxPerSource`, `cvRoute`, `cvLayout`,
     `cvLanguages`, `cvJdLanguages`, `cvCustom`, `chromePath`, `figmaFileKey`,
     `figmaTemplateFrame`): edit `profile.yaml`. A `sources` entry is a known id or a board URL
     ([scan.md](scan.md)).
   - **How jobs or CVs are scored**: edit `criteria.md`. Bump the version of the rubric they changed
     (`fit-v1` → `fit-v2`, `cv-v1` → `cv-v2`) and add a line under `## Changes`: date, rubric, what
     changed, in their words. Jobs keep the version they were scored with; re-score only when they
     ask.
   - **A decision about a job** ("skip X", "I applied to X"): [files.md](files.md).
   - **Anything else** (how they want reports, a company they talked to, a fact about their machine):
     `context/` ([files.md](files.md#context)).
   Write only what they said or what follows from it with no other reading; anything you would have
   to guess is a `Q-` file ([never-stop.md](never-stop.md)), never a fact.
3. **Commit** the reference file and the edits together: `git commit -m "context: <slug>"`.
