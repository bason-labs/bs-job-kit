# Never stop

No step of a run waits for the owner. When their request, `context/`, `profile.yaml` or the facts do not
answer something:

1. Write `context/Q-<n>.md` (next free `n`, never reused):

   ```markdown
   ---
   type: question
   job: <job id or none>
   created: <ISO time from bs-job clock>
   ---
   **Question:** <one sentence>

   - A. <option>
   - B. <option>

   **Taken:** A, because <one sentence>.
   ```

2. Continue on the option taken. The report lists the question.

Before writing one, read the open `Q-` and the `D-` files: a question a `D-` file answers is not a
question; one already open is reused, not duplicated.

**A missing fact about the owner is never guessed.** A JD requirement the facts lack is left out of the
CV and becomes a question ("Have you used AWS? Where?"), never a claim.

**Applying never guesses**: it stops and asks the owner in chat ([apply.md](apply.md)).

## When the owner answers

When the owner answers `Q-<n>` (in any words, in any later chat):

1. Write `context/D-<n>.md`: what was decided, `resolves: Q-<n>`, the date.
2. Put the answer where it belongs: a fact in `master-cv.yaml`, a setting in `profile.yaml`, a
   criterion in `criteria.md` ([capture.md](capture.md)).
3. Delete the `Q-` file and update `context/index.md`.
4. If the answer changes a CV already made, say which jobs could get a new version; make it only
   when they ask.
5. Commit.
