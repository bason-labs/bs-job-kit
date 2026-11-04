# Any job board or career page from a URL

Read-only. For a `sources` entry that is a URL with no guide of its own: a company career page, an
ATS board or a job site. Never fill a form, click apply, sign up, log in, save or message anyone, and
never follow links off the site (except to the same board's own job pages). Nothing here is known in
advance, so every selector is a **guess to check against the page**.

## 1. Limits
- **Job limit:** at most `maxPerSource` postings (`profile.yaml`). At most 3 listing pages.
- At most 30 page views, with a 3-8 s pause between page loads on a site that is not an API.
- Skip a card at once if its title or company matches `excludeKeywords` / `excludeCompanies`.
- Use the host name as `source` (`jobs.example.com`).

## 2. Finding the listings and job pages
1. Open the URL. If it is a search or listing page, read the cards; if it is a company page, look
   for "Careers", "Jobs", "Open positions" and follow it within the site.
2. Prefer the board's public data over the rendered page, in this order: a JSON API the page itself
   calls (look at the page's script data, `application/ld+json`, or a known ATS pattern from
   [career-site.md](career-site.md)), then plain `curl` on the HTML, then the browser.
3. Use the site's own search or filters (role, location) when the URL has them; otherwise filter the
   cards yourself against `roles`, `locations`, `workModes` and the exclusions.
4. A job page is the page for one posting. Its JD is the main description block, with headings and
   bullets, stopping before the application form. A schema.org `JobPosting` in the HTML often holds
   the whole description, the date and the location.

## 3. What to capture
- `url`: the posting URL without tracking parameters (`utm_*`, `ref`, `source`, `gh_src`) and without `#...`.
- Title, company, location, work mode, salary as shown, posting date: only what the page states,
  otherwise null. A deadline is not a posting date.
- `language`: detect from the JD (ISO 639-1). The same job twice (same id or URL) keeps one.
- Remote boards ignore the city filter: keep jobs whose region overlaps `timezoneOverlap` when set.

## 4. Blocked / layout changed / no results
- Login wall, CAPTCHA, Cloudflare challenge or a 403: report it as blocked (site host and reason),
  keep what you have, never try to get around it.
- No recognisable cards or job description: report `Layout changed: <what is missing> on <page URL>`
  and do not guess fields.
- No openings: return an empty list with `No results: the page says 0 jobs` (or the text shown).

## 5. Record what worked
After the scan, add one line to `context/environment.md` per board: how it was read (API, `curl`,
browser), the URL shapes of its listings and job pages, and anything that blocked or surprised.
The next run reads it before scanning the board, so the board is not worked out again.
