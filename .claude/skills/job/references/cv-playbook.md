# CV playbook: tailoring by company and JD

It says what each CV may change for each company and JD, so more CVs pass the CV round. The rules
in [cv.md](cv.md) still apply: every claim comes from `master-cv.yaml`, and the layout limits there
stay. The owner's own rules in `cv-rules.md` override this playbook where they differ. Where a claim
below comes from vendor blogs and not from a study, it says so.

## 1. How the CV round works

1. **The ATS parses the file into fields.** Recruiters then filter and search those fields. The ATS
   rarely rejects anyone on its own. A CV that parses badly simply never shows up in their searches.
   Multi-column layouts, text boxes and tables are the most common cause of parsing errors
   (consistent across guides, not vendor documentation).
2. **An AI layer is spreading.** On top of the ATS, an LLM summarises each CV and ranks it against
   the JD (e.g. Workday HiredScore grades A–D, Oracle 0–5). LLM screeners do match transferable
   skills, but exact JD terms are still the safest signal.
3. **The human first look takes about 7 seconds** (Ladders eye-tracking study, 2018). It is a
   keep-or-toss decision. Eyes go to job titles first, then the latest role's bullets, then the
   skills. The study found recruiters favour simple layouts with clear headings, bold titles and
   bulleted results. Clutter, little white space, multiple columns and long sentences hurt.
4. **Generic AI wording is noticed.** Survey: 80% of US hiring managers say they spot AI-written CVs
   at a glance; giveaways are unnatural tone, generic language and buzzwords (Resume Genius,
   vendor survey).
5. **A referral beats any CV.** 40% of referred candidates reached an interview vs 3% of cold
   applicants (Ashby, 38M applications, 2021–2024).

## 2. Fixed on every CV

- **One A4 page.** With 4+ years this is right in every market. UK and Australian norms allow two
  pages, but one page is never wrong.
- **One reading order.** The requirement is that the PDF text reads in one order (top to bottom, left
  column before right), checked with `bs-job pdf-text --expect`. A single column is safest:
  foreign companies almost always use one (Greenhouse, Lever, Workday, Ashby, Workable). The owner's
  chosen layout is always used. Layouts B and C (sidebar and band) keep one reading order but look
  two-column and can parse worse in some ATS; setup warns about this when one is chosen.
- **Plain section headings:** Summary, Experience, Projects, Skills, Education, Languages.
- **Title line first:** name, then a headline that uses the JD's own title words where the facts
  support them (a "Data Engineer (Platform)" JD gets "Data Engineer | Python, Airflow & Platform
  Tooling" if the facts cover those).
- **Contact line:** email, phone, the owner's city and country, LinkedIn, and a GitHub/portfolio
  link when the owner gives one. For foreign companies, no full street address.
- **Dates on every role** (Mon YYYY – Mon YYYY).
- **A heading and its dates are one text node** with styles set by range. A separate right-aligned
  box puts them at the end of the PDF text (`ats_order` hard fail).

## 3. What changes per JD (tailoring pass, every CV)

1. **Take the JD's must-haves and nice-to-haves** from `jd.md` and map each one to fact ids. A term
   with no fact is a gap: it stays off the CV and goes in the report.
2. **Use the JD's exact spelling** for each covered term, once in Skills and once in a bullet where a
   fact supports it. Add both forms where they differ ("React (ReactJS)", "CI/CD").
   No keyword stuffing: one honest use each.
3. **Summary, 2–3 lines:** the JD's title, the facts' years (unless the owner asked to omit them,
   see `context/notes.md`), the 2–3 strongest matches to the must-haves, and the company's domain in
   its own words.
4. **Bullet order:** in the latest role, the bullets that cover must-haves come first. Keep it
   short: 2–3 bullets for the latest role, 1–2 for each older role.
5. **Bullet shape:** what the owner did + scope/number + how ("Owned a reporting app used by
   ~300 employees in 4 countries"). This is Google's X-Y-Z formula (accomplished X, as measured by
   Y, by doing Z). Use only numbers the facts state; with no number, give the scope instead (users,
   countries, teams, apps).
6. **Projects (optional):** only when the person's facts have projects. Pick the 3–4 that match
   the JD, most relevant first.
7. **Skills:** grouped by area, with the JD's stack first in each group.
8. **Wording:** plain, concrete verbs (built, owned, designed, integrated, investigated). Avoid
   "spearheaded", "leveraged", "passionate", "cutting-edge", "results-driven", "dynamic".

## 4. What changes per company type

Choose one type from the JD and the company page; note the choice in the job README.

| Type | Emphasis | Format notes |
|---|---|---|
| **US / UK / AU / Canada employer** | Impact and ownership first; shipping speed, async written communication; the hours overlap if the JD mentions calls in that time zone | No photo, no date of birth, no marital status. Short summary. Links to public work (GitHub, demo, portfolio) weigh a lot where the JD values them |
| **European** | Process and quality: testing, CI, documentation, cross-country teams | Photo optional in some countries (DE, FR); leave it off unless the JD asks. Language level stated plainly |
| **Japanese** | Detail and reliability: per project the period, team size, the owner's role, the phases done (requirements, design, coding, testing) and the stack. Japanese level if any | Project-table ("skill sheet") style suits them better than prose. The fields are unverified (no source found); use only fields the facts fill |
| **Singapore and regional** | Product scale, domain depth, English | Standard one-page English CV |
| **Local employer in the person's country** | The same content, in local conventions; a CV in the JD's language when `cvJdLanguages` includes it (cv.md) | Local habits (a photo, a date of birth) are common in some countries (convention, unverified); add one only if the owner supplies it and asks |
| **Outsourcing, consulting or agency** | Range of stacks and clients, client and team coordination, English | A skills matrix helps; keep it on one page |

## 5. Role specifics

Where the JD names a specialty (for example AI or data work), name the concrete tools the facts
list and what each did; a bare "AI" or "data" counts for little. Describe a workflow as a system
(inputs, steps, checks, who reviews). Evidence of evaluation and quality is what reviewers look for.
Do not claim a framework, tool or pipeline no fact covers. A public repo or demo with a README
(problem, approach, result in its first lines) lifts any application where the JD values one.

## 6. Before sending

- The PDF text, copied out, reads top to bottom: name, contact, summary, experience...
- Every JD must-have is either on the CV (with a fact id) or listed as a gap in the report.
- The company name and job title are spelled as in the JD.
- Name the file as the owner prefers (see `cv-rules.md`); `cv-<lang>.pdf` in the job folder is
  enough until they upload it.
- For the best 2–3 jobs, look for a referral: a LinkedIn contact at the company. That is the
  owner's step; the run only suggests it in the report.
- Apply within the first days after posting where possible: applications per job keep rising.

## Sources

- Ladders eye-tracking study (2018): https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/
- ATS parsing and myths (blog): https://www.techinterview.org/post/3233474603/ats-friendly-resume-formatting-engineers/ ; https://atsverification.com/blog/greenhouse-vs-workday-ats-parsing/
- AI screening layer (blog): https://atsverification.com/blog/ai-resume-screening-2026/ ; https://www.jobscan.co/blog/blog-ai-resume-screening/
- X-Y-Z formula: https://www.inc.com/bill-murphy-jr/google-recruiters-say-these-5-resume-tips-including-x-y-z-formula-will-improve-your-odds-of-getting-hired-at-google.html
- AI-written CVs survey: https://resumegenius.com/blog/job-hunting/hiring-insights-report
- Referrals (Ashby data): https://dataford.io/blog/do-referrals-help-2026 ; https://glassdoor.com/blog/conversation-starter-landing-interviews-experience/
- Country norms: https://www.visualcv.com/blog/international-resume/ ; https://techloy.com/how-to-write-a-quality-software-developer-cv-in-the-uk ; https://www.visualcv.com/international/australia-cv
- ITviec CV guides: https://itviec.com/blog/ung-tuyen-va-thang-tien/cv-it/ ; https://itviec.com/blog/checklist-mau-cv-chuyen-nghiep-cho-ung-vien-it/
- AI engineer portfolios (blog): https://www.techinterview.org/post/3233475399/ai-portfolio-built-with-ai-2026-interviews/
- Software engineer resume guide (blog): https://www.techinterview.org/post/3233474602/software-engineer-resume-guide/
