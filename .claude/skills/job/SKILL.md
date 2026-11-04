---
name: job
description: "bs-job-kit: first-use setup (the owner's CV, what they look for, sources, how CVs are made); find and score jobs; tailor up to maxCvs CVs per run (automatic PDF, Figma, or the owner's own way) and have a fresh evaluator score each; also status, list jobs below threshold, make a CV for a job, I applied to a job, apply to a job for me, change the criteria, cost. Use for every request in this repository."
---

# Job search

This repository is the owner's job search in plain files: their facts (`master-cv.yaml`), what they
look for (`profile.yaml`), how jobs and CVs are scored (`criteria.md`), every job found
(`jobs/`), what was learned (`context/`) and what each run cost (`cost.md`). There is no app: the
chat is the interface. Read only the reference a step needs.

## Setup comes first

For **every** request, before anything else: if `master-cv.yaml` has no facts, or `profile.yaml`
`setupDone` is not `true`, run setup ([setup.md](references/setup.md)) instead, whatever was asked.
It resumes where it stopped.

## A run ("find jobs ...")

0. **Start the clock first**, before reading anything: run `node bin/clock.mjs` (it prints
   `{"marker","start"}`: the run marker and the start time); keep both for the cost step.
1. **Read memory:** `profile.yaml`, `criteria.md`, `context/index.md`, `jobs/index.md`.
2. **Capture what the owner said** ([capture.md](references/capture.md)) before anything else.
3. **Scan and score** every source in `profile.yaml` ([scan.md](references/scan.md)); store every
   relevant job ([files.md](references/files.md)).
4. **Tailor** the best `maxCvs` `ready` jobs without a CV, plus any job the owner named
   ([cv.md](references/cv.md)).
5. **Evaluate** each CV with the `job-cv-evaluator` agent in a fresh context ([cv.md](references/cv.md)).
6. **End:** learned facts, cost, report, commit ([end.md](references/end.md)).

Never skipped: capturing what the owner said, the evaluator for every CV, recording what the run learned,
the cost step. A step whose tool is missing (Claude in Chrome not connected, `bin/figma-pdf.mjs`
answering `figma-unavailable`) is skipped and reported, and the run continues with the rest: a
scheduled run with nobody watching still stores what it could.

Throughout: never stop to ask; record guesses ([never-stop.md](references/never-stop.md)).
Applying is the exception: it never guesses.

## Other requests

- **Status:** read `jobs/index.md`; summarise by status, best first.
- **List below threshold:** the `Below threshold` section, each with its fit score and the gaps from
  its README. Never re-scan for this.
- **Make a CV for X:** step 0, then steps 4–6 for that job, whatever its status.
- **I applied to X / skip X / X rejected me:** set `status` (and `applied` with today's date) in its README, run the
  board, commit ([files.md](references/files.md)).
- **Apply to X for me:** [apply.md](references/apply.md), only for the job the owner named.
- **Change the criteria / threshold / maxCvs / sources:** [capture.md](references/capture.md).
- **Cost:** read `cost.md`; per role from `logs/`.
- **Answer Q-...:** [never-stop.md](references/never-stop.md).

## Hosts

- **Claude Code** (terminal or the Desktop app's Code tab): the evaluator is the subagent
  `job-cv-evaluator`; Figma tools come from `.mcp.json`; the browser is Claude in Chrome.
- **Codex:** do the evaluator's work as a separate step reading only its inputs
  (`.claude/agents/job-cv-evaluator.md`); skip steps whose tools are missing and say so.
