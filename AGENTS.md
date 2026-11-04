# bs-job-kit

The owner's job search in plain files: their facts (`master-cv.yaml`), what they look for
(`profile.yaml`), how jobs and CVs are scored (`criteria.md`), every job found (`jobs/`), and what
each run cost (`cost.md`).

For every request here, read `.claude/skills/job/SKILL.md` and follow it; the files it links are
under `.claude/skills/job/`. When it runs the evaluator, read `.claude/agents/job-cv-evaluator.md`
and do that work as a separate step that reads only the evaluator's inputs. Skip a step whose tools
you do not have (browser, Figma) and say so in the report. Run `bin/cost.mjs` with `--host codex`.
