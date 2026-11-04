Sources: adapted from bs-job-agents bots/research/skills/source-linkedin/SKILL.md.

# LinkedIn (linkedin.com/jobs)

Read-only, and the strictest source. LinkedIn's guest search API (below) usually answers plain `curl` when the page does not. Never connect, follow, message, save, "Easy Apply", sign in or accept a sign-up prompt. Selectors are **hints observed 2026-10** on the public (guest) pages.

## 1. Hard limits
- **At most 40 page views per scan**. Every `navigate` counts, listing pages included. Count them; stop LinkedIn when you reach 40 and report how far you got.
- **A random pause of 3–8 s between page loads**, every time (vary it; never under 3 s).
- **Job limit:** at most `maxPerSource` postings (`profile.yaml`) — and stop earlier if the page budget runs out (reserve 1 view per search page).
- **Searches:** one per role × location, at most 6; **at most 2 result pages** per search.

## 2. Search URL
`https://www.linkedin.com/jobs/search?keywords=<role>&location=<city>, <country>&f_TPR=r604800` (URL-encoded; `f_TPR=r604800` = past week).
- `<city>, <country>`: built from `locations` in `profile.yaml`, one search per location ("Berlin, Germany").
- **Remote filter:** a location that is remote with no city uses `&f_WT=2` (LinkedIn's "Remote"): "Remote (<country>)" → `location=<country>&f_WT=2`; plain "Remote" → `location=Worldwide&f_WT=2`. The filter is loose: a `location=<country>` search with `f_WT=2` still returns on-site jobs, and `location=Worldwide` returns mostly location-bound jobs (US, India, Europe) rather than worldwide ones. Filter by the card's location and the JD; only a posting that says "100% Remote, Worldwide" (or similar) in the title or JD qualifies as worldwide. Remote jobs abroad must still overlap `timezoneOverlap` (`profile.yaml`) when it is set (skip "US only").
- Work modes, only when the profile does not want all three: `&f_WT=` with 1 = on-site, 2 = remote, 3 = hybrid (comma-separated, e.g. `f_WT=2,3`).
- Next page: `&start=25`.

### Guest APIs (plain `curl`, no browser)
- Search: `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=<role>&location=<city>, <country>&f_TPR=r604800&start=0` returns the cards as HTML. Quote the URL in zsh.
- Job: `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/<id>` returns the full JD.
- Both can answer 429 now and then: pause and retry once. A search page that answers 429 to `curl` often still loads as a guest in a browser, and so does a job the API refuses.
- Opening `/jobs/view/<id>/` directly as a guest can hit the authwall even when the same page loaded from a search page earlier. An authwall on a re-check is the end for that job: report it, do not retry.

## 3. Listing page
- Tab title states the count: "**81** Frontend Engineer jobs in …".
- Cards (`ul.jobs-search__results-list > li`, `.base-search-card`): title (`.base-search-card__title`), company (`.base-search-card__subtitle`), location (`.job-search-card__location`), posted (`<time datetime="2026-10-05">5 days ago</time>`), salary (`.job-search-card__salary-info`, rarely shown), link to `/jobs/view/<slug>-<id>`.
- Pick the cards that match the criteria **before** opening any, so the 40 views go to likely fits.

## 4. Job page
- Title `h1`, company `.topcard__org-name-link`, location `.topcard__flavor--bullet` ("<city>, <country>"), posted `.posted-time-ago__text`.
- **Full JD:** the "description" block (`.show-more-less-html__markup`). The guest page includes the whole text even when it shows "Show more"; do not click it unless the text is visibly cut off. Seniority / employment type are in the criteria list below it.
- Work mode often only appears in the title or JD ("Remote", "Hybrid"); otherwise null.

## 5. What to capture
- `url`: `https://www.linkedin.com/jobs/view/<id>/` (the number at the end of the posting link; drop `vn.` and every `?position=…&refId=…&trackingId=…`).
- `postedAt`: the `datetime` of the card's `<time>`, else "N days ago" → today minus N (ISO, the owner's local UTC offset).
- `salaryText`: only if shown; else null. The same `<id>` twice → keep one.

## 6. Stop at once (blocked)
- A login wall ("Sign in", "Join LinkedIn to see more jobs", `/authwall`, `/login`, `/checkpoint`) → `blocked: { reason: "needs_login", site: "linkedin.com" }`.
- A CAPTCHA or "security verification" → `blocked: { reason: "captcha", site: "linkedin.com" }`.
Return the jobs already read, close your tab. Never try to sign in or solve it.

## 7. Layout changed
The count says N jobs but no cards, or a posting without its description block → stop and report: `Layout changed: <what is missing> on <page URL>`.

## 8. No results
Return an empty list with the note `No results: the page says 0 jobs` in the report.
