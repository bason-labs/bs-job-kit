# Company career site

Read-only. Only the company's own career site (never follow links off it, e.g. to a separate apply portal on another domain). Never fill the application form that is often on the same page. Selectors are **hints observed 2026-10** (from a Greenhouse board).

## 1. Limits
- **Job limit:** at most `maxPerSource` postings (`profile.yaml`). At most 3 listing pages.
- Use `source: "career_site"` for every job.

## 2. Finding the openings
Start from the career page URL the owner gives (or a URL in `sources`), or the company's own site. Look for "Careers", "Jobs", "Open positions", "Tuyển dụng", "Cơ hội nghề nghiệp". Common platforms:

| Platform | Openings list | One job |
|---|---|---|
| Greenhouse (`job-boards.greenhouse.io/<co>`) | rows `tr.job-post`: title (`p.body--medium`), location (`p.body--metadata`); filter by office with the page's own filter links | `/<co>/jobs/<id>` |
| Lever (`jobs.lever.co/<co>`) | `.posting`: title `h5`, location `.location` | `/<co>/<uuid>` |
| Workable (`apply.workable.com/<co>`) | `[data-ui="job"]` | `/<co>/j/<code>` |
| Custom | the list of links to individual postings | — |

Prefer postings whose location matches `locations` in `profile.yaml` (or Remote).

### Public APIs (read with `curl`, no browser)
Plain `curl` reads these; Python's urllib can fail on SSL, so use `curl`.

- **Greenhouse:** `https://boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true` (full JDs); add `?questions=true` on one job to list its required form questions.
- **Lever:** `https://api.lever.co/v0/postings/<company>?mode=json`. Quote the URL in zsh (`?` is a glob).
- **Ashby:** `https://api.ashbyhq.com/posting-api/job-board/<company>` (`descriptionPlain`, `publishedAt`).
- **Eightfold** (`<company>.eightfold.ai`): the newer PCSX API is `/api/pcsx/search?domain=<domain>&query=<q>&location=<place>&start=<0,10,...>` (10 per page, `count`) and `/api/pcsx/position_details?position_id=<id>&domain=<domain>` (404 "Position not found" once closed). The older `/api/apply/v2/jobs?domain=...` list answers 403 "Not authorized for PCSX"; `/api/apply/v2/jobs/<id>?domain=<domain>` still returns a closed job's JD (`job_description` HTML), so it does not prove the job is open.
- **Employment Hero** career pages list roles on their own ATS: `ats-cdn.ehrocks.com/ats/api/v1/embedded/widget/organisations/<org id>/jobs?page_index=<n>` (10 per page); the `<org id>` is in the career page's HTML. Job pages (`employmenthero.com/jobs/position/<slug>/`) give the full JD as schema.org JobPosting with `applicantLocationRequirements`.
- Other boards (Workable and so on) are read like [job-board.md](job-board.md).

## 3. Job page
- Title: `h1`. Location: `.job__location` (Greenhouse), `.location` (Lever), or the line under the title.
- **Full JD:** the description block (`.job__description`, `[data-ui="job-description"]`, or the main article), with headings and bullets. Stop before the application form ("Apply for this job", "First Name*").
- Company: the career site's company name. `companyWebsite`: the company's main site if linked.
- Posting date and salary: only if the page states them; otherwise null.

## 4. What to capture
- `url`: the posting URL without tracking parameters (`utm_*`, `gh_src`, `source`, `ref`, `lever-source`) and without `#…`.
- `language`: detect from the JD (ISO 639-1, e.g. `en`).

## 5. Blocked / layout changed / no results
- Login wall or CAPTCHA → report it as blocked, with the site's host, return what you have.
- The page has no recognisable openings list or job description → report: `Layout changed: <what is missing> on <page URL>`.
- No openings → empty list, note `No results: the page says 0 jobs`.
