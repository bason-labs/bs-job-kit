# End of a run

1. **What the run learned** goes into `context/` first: a source blocked or whose layout changed, a
   tool that was not available, anything the next run would otherwise find again
   ([files.md](files.md#context)). Nothing new: write nothing.
2. **Cost**, the last step before the commit:
   `node bin/cost.mjs --host <claude|codex> --since <start time> --marker <run marker> --project . --record . --log logs --request "<the request, one line>" --tickets <job ids that got a CV>`,
   with the marker and start time from step 0 (every request that does work starts with step 0)
   and `--tickets` as one comma-separated list without spaces (`id-a,id-b`); leave `--tickets` out
   when no job got a CV. Each job's `cost:` line adds up across runs.
   `{"measured":false}` or no `node`: write "cost not measured" in the report.
3. **Report:** write `reports/<yyyy-mm-dd>-<slug of the request>.md` (`-2`, `-3` on a collision) and
   put the same text in chat:

   ```markdown
   # <the request, in the owner's words>

   Run `<marker>` · <start> to <end> · host <claude|codex>

   ## Ready for you
   | Job | Fit | CV | PDF |
   |---|---|---|---|
   | [<company> · <title>](../jobs/<id>/README.md) | <fit> | <cv score, ⚠ if flagged> | [cv-en.pdf](../jobs/<id>/cv-en.pdf) |

   ## Also found
   <n> below threshold (best: <company · title, fit>), <n> already known, <n> not matching the
   profile, <n> more not opened on <source>.

   ## Facts added to your master CV
   <each new or changed fact id with its text; or "none">

   ## Guesses and questions
   <each new Q- file, and each JD requirement the facts lack; or "none">

   ## Needs you
   <blocked sources, Figma or Chrome not available, cv-failed jobs; or "nothing">

   ## Cost
   <tokens> tokens, <usd or "unpriced"> · log: [logs/<marker>.json](../logs/<marker>.json)
   ```

4. `node bin/jobs.mjs board`, then commit everything (`jobs/`, `context/`, `reports/`, `logs/`,
   `cost.md`) with a one-line message naming the request.
