# Wellfound (wellfound.com)

Read-only. Role and job pages load as a guest, with plain `curl` or the browser. Never apply ("Apply", "Apply Now"), save, message a founder, edit the owner's profile or accept any prompt. Hints **observed 2026-10** on the real pages.

## 1. Limits
- **At most 30 page views per scan**, with **a random pause of 3–8 s between page loads**: be gentle: it is a bot-checked site.
- **Job limit:** at most `maxPerSource` postings (`profile.yaml`).
- **Searches:** one per role (the city is ignored: Wellfound is a remote board), at most 6; at most 2 result pages each.

## 2. Search URL
`https://wellfound.com/role/r/<role-slug>` — remote jobs for the role. `<role-slug>`: lowercase with hyphens, without any "(…)" part ("Frontend Engineer" → `frontend-engineer`, "Full Stack Engineer" → `full-stack-engineer`).

Company job pages (`/company/<slug>/jobs`) answer `curl` with a Cloudflare "Security Check" challenge: do not rely on them; use role pages and job pages (`/jobs/<id>-<slug>`).

## 3. Listing page
- The header states the count: "**553** results total".
- One card per company (`[data-testid="startup-header"]` with the company name in `h2`), and in it one row per job (`div.mb-4.w-full.px-4 > div`): the title links to `/jobs/<id>-<slug>`; small text gives the salary ("$80k – $105k • 0.25% – 0.75%") and the place ("Remote only • Everywhere", "Remote • New York City", "In office • …"); the age ("1 week ago").
- Skip "In office" rows. Pick rows that match the criteria before opening any.

## 4. Job page (`https://wellfound.com/jobs/<id>-<slug>`)
- Title `h1`; under it "Remote (Everywhere) • Berlin", years of experience and employment type; "Posted: 2 days ago"; "Hires remotely in …" (where applicants may live).
- **Full JD:** `#job-description` ("About the job"). The page also embeds a schema.org JobPosting (title, company, datePosted, description) that holds the full description for `curl`.

## 5. Remote rules (search profile)
- Role pages embed `apolloState` JobListings with `acceptedRemoteLocationNames`: the regions the company hires from (often few listings accept a given region). The job page's HTML says "Hires remotely in Everywhere" even when that list is empty; the JSON-LD `applicantLocationRequirements` says when a job is limited to a country. Trust those two fields over the visible text.
- Ignore the city filter. Keep a job only when its "Hires remotely in" region overlaps `timezoneOverlap` (`profile.yaml`) (e.g. "Asia", "UTC+7 ±3h"); "Everywhere" always fits; skip clearly elsewhere ("United States only"). No `timezoneOverlap` → no region filter.
- Salary: with a USD minimum (`currency` USD in `profile.yaml`), drop a job only when even the top of its range, per month (yearly ÷ 12), is under it; with any other `currency`, do not filter on salary.

## 6. What to capture
- `url`: `https://wellfound.com/jobs/<id>-<slug>` (nothing after `?`).
- `location`: "Remote" plus the place as shown, e.g. "Remote (Everywhere)". `workMode`: `remote` (or `hybrid` for "Onsite or remote").
- `postedAt`: the JobPosting's `datePosted`, else "N days ago" → today minus N (ISO, the owner's local UTC offset). `salaryText`: as shown, else null.

## 7. Stop at once (blocked)
- A "Log In" / "Sign up" page, `/login`, or a job page that asks to sign in → report it as blocked (needs login, wellfound.com).
- A CAPTCHA / bot check ("Just a moment…", "Verify you are human") → `blocked: { reason: "captcha", site: "wellfound.com" }`.
Return the jobs already read and close your tab. Never sign in yourself.

## 8. Layout changed
The header says N results but no job rows, or a posting without `#job-description` → stop and report: `Layout changed: <what is missing> on <page URL>`.

## 9. No results
Return an empty list with the note `No results: the page says 0 jobs` in the report.
