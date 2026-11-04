# Criteria

How jobs and CVs are scored. Change them by asking in chat; each change bumps the rubric's version
and is listed under Changes. Jobs keep the version they were scored with.

## Job fit (fit-v1)

Scores a job against `master-cv.yaml`, 0–100. A job is `ready` at `fitThreshold` (in
`profile.yaml`) or above, else `below-threshold`.

| Criterion | Points | What earns them |
|---|---|---|
| Must-have skills | 40 | the JD's required skills and experience that facts cover |
| Seniority | 20 | the level and years asked against the owner's facts |
| Location and work mode | 15 | inside the owner's `locations` and `workModes` |
| Nice-to-haves | 15 | the JD's preferred skills that facts cover |
| Language | 10 | the JD's working language is one the owner works in |

Every reason cites fact ids; every gap names a JD requirement no fact covers.

## CV evaluation (cv-v1)

Scores a tailored CV against its JD, the facts and the company type, 0–100. Pass mark: **80**.
The company types and the tailoring rules are in `.claude/skills/job/references/cv-playbook.md`.

| Criterion | Points | What earns them |
|---|---|---|
| Keyword coverage | 30 | each JD must-have that a fact covers appears in the JD's own words (both spellings where they differ, e.g. "React (ReactJS)"), in Skills and backed by a bullet; then the nice-to-haves. Must-haves no fact covers are gaps, not deductions. Stuffing (a term repeated without support) loses points |
| Title and summary match | 10 | the headline uses the JD's title words the facts support; the 2–3 line summary names the JD's title, the owner's years (unless omitted at the owner's request) and the strongest must-have matches |
| Company-type fit | 20 | the CV follows the emphasis and format of the company's type in the playbook's company-type table |
| Format and ATS | 20 | one page; one reading order (a single column for an ATS application); plain section headings; PDF text in reading order with every section |
| Clarity and voice | 20 | concrete bullets (what the owner did + scope or a number from the facts + how), must-have bullets first; minus 2 per generic AI-style phrase ("spearheaded", "leveraged", "passionate", "results-driven", "cutting-edge", "dynamic", "seamless", "synergy" and the like), down to 0 |

Hard fails (any one fails the CV whatever the score): invented claim, wrong language, wrong
company, over one page, unreadable PDF text, text out of reading order, missing section.

## Changes

- first versions, from bs-job-kit's starter rubric
