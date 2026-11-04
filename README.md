# bs-job-kit

Your job search in plain files, run from a chat. Ask Claude (or Codex) in this folder to find
jobs: it scans the job sites in your Chrome, scores every relevant job against your facts, makes a
tailored CV for the best ones, has a separate reviewer score each CV, and reports. No app, no
server, nothing to host.

## Start

Works on macOS and Windows.

1. Install **Node 22+**, **Git**, and **Chrome** (or Edge).
2. Open a terminal in this folder and start **Claude Code** there (`cd bs-job-kit`, then `claude`).
   Start it inside the folder, or the session misses `.mcp.json`. Accept the trust prompt once, so
   `.claude/settings.json` applies. (Codex: `codex` in the same folder; it does what its tools allow
   and says what it skipped.)
3. Connect **Claude in Chrome**, so the job sites you are logged in to can be read.
4. **Figma desktop** is needed only if you choose the Figma route for CVs: open your CV file and
   start **Plugins, Development, Figma Desktop Bridge**. The default route makes PDFs with Chrome
   and needs no Figma.

## First use

The first time, Claude runs setup ([`references/setup.md`](.claude/skills/job/references/setup.md)):
it asks for your CV or the job title you want, what you look for, which job sites to use, how your
CVs should look, and writes it all into `master-cv.yaml`, `profile.yaml` and `criteria.md`. Say
anything, for example "find jobs", and it begins there.

## Ask

| You say | It does |
|---|---|
| "find frontend React jobs in Berlin" | scans, scores and stores every relevant job, makes up to 3 CVs, reports |
| "status" | the board by status |
| "list the jobs below threshold" | jobs under the threshold with their scores and gaps |
| "make a CV for the Acme job" | tailors, exports and evaluates a CV for that job |
| "I applied to the Acme job" / "skip job X" | moves the job on the board |
| "apply to the Acme job for me" | applies in Chrome with that job's PDF, only that job |
| "raise the job match weight to 50" / "threshold 70" / "make 5 CVs per run" | edits `criteria.md` / `profile.yaml` |
| "I have 2 years of AWS at my old company" | adds the fact to `master-cv.yaml` and says so |
| "cost" | cost per run and per role |
| "tìm job frontend React ở HCM" | any language works: this one finds frontend React jobs in Ho Chi Minh City |

Runs never stop to ask: a guess is written to `context/Q-n.md` and listed in the report; answer it
any time in plain words. Applying is the exception: it asks.

## Where things are

| Path | What you check there |
|---|---|
| `jobs/index.md` | the board: ready, below threshold, applied, skipped, CV failed |
| `jobs/<id>/` | one job: JD, fit score and gaps, CV evaluation, `cv-<lang>.pdf`, apply evidence |
| `master-cv.yaml` | your facts; CVs use nothing else |
| `profile.yaml` | what you look for, threshold, CVs per run, sources, CV route and layout |
| `criteria.md` | how jobs and CVs are scored, with versions and a change log |
| `context/` | what was learned or said: environment, notes, open questions |
| `references/` | your words as given |
| `reports/` | one report per run |
| `logs/`, `cost.md` | tokens and cost per run and per role |

## Share it

To give someone a copy, copy this repo before you run setup in it. A copy made after setup carries
your facts, jobs and CVs.

## Windows check

Windows ran only through unit tests here. On a Windows machine, check by hand:

1. Install Node 22+, Git and Chrome (or Edge); open a terminal in this folder.
2. `npm test` passes.
3. `node bin/cv-pdf.mjs --data templates/cv/sample.json --out test.pdf` writes a one-page `test.pdf`.
4. Start `claude` in the folder and say "find jobs": it begins setup.

## Develop

```
npm test         # node --test, no dependencies
npm run check    # leftover wording, owner wording, frontmatter, broken links
```
