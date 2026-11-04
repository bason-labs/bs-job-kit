# Files

## A job: `jobs/<id>/`

`<id>` = `<yyyy-mm-dd found>-<company slug>-<title slug>`, lowercase ASCII with dashes.

`README.md` starts with this frontmatter (one `key: value` per line; values are plain, `null`, or a
one-line `{ k: v, ... }`; `bs-job jobs` reads exactly this):

```yaml
---
id: 2026-10-22-novapay-senior-frontend
company: NovaPay
title: Senior Frontend Engineer
source: topcv
url: https://www.topcv.vn/viec-lam/x/123.html
location: <city>, <country>
workMode: hybrid
salary: null
language: en
status: ready
fit: { score: 72, criteria: fit-v1 }
cv: { score: 84, criteria: cv-v1, flagged: false, en: jobs/<id>/cv-en.pdf, vi: null }
found: 2026-10-22
applied: null
injection: false
cost: { tokens: 0, usd: null }
---
```

Then these sections: `## Fit` (each criterion with points and its reason, then `Gaps:`),
`## CV` (what the route produced: Figma frame names, or `cv-<lang>.json` and `.html` for the pdf route, or whatever the custom route made; the fact ids used; what was emphasised), `## CV evaluation` ([cv.md](cv.md)),
`## Notes` (anything else, dated). `jd.md` holds the full JD text as captured. `cv-<lang>.pdf` and
`evidence/` appear when made.

Statuses: `ready` (fit ≥ threshold), `below-threshold`, `applied`, `rejected` (the company turned
them down after they applied; `applied` keeps its date), `skipped`, `cv-failed`.
"I applied to X" → `status: applied`, `applied: <today>`. "X rejected me" → `status: rejected` and
a dated note with what the company said. "Skip X" → `status: skipped` and a dated
note with their reason. After any change: `bs-job jobs board` (rewrites `jobs/index.md`;
never edit that file by hand), then commit.

## Context

`context/` holds what was said or learned that is not a job, a fact about the owner, a search wish or a
criterion:

- `index.md`: one line per file.
- `environment.md`: what this machine can and cannot run (Chrome connected, Figma bridge, a source
  blocked or changed layout), one dated line per fact; replace a line a newer fact makes wrong.
- `notes.md`: the owner's preferences about reports and the search that are not settings.
- `Q-n.md` / `D-n.md`: open questions with the option taken, and their answers
  ([never-stop.md](never-stop.md)).
