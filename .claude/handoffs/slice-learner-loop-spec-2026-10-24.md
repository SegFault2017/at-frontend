# Handoff: slice the learner-loop spec into per-repo tickets

**Date:** 2026-10-24  **Repo:** `at-frontend` (container `algo-trainer`, four sub-repos under `SegFault2017/`)

## Where things stand

The wayfinding effort is **finished**. Nothing is open on the map.

- Map: https://github.com/SegFault2017/at-frontend/issues/2 (all 7 child tickets closed; fog empty; Decisions-so-far indexes every ticket, each holding its reasoning in a resolution comment).
- Spec (published, labelled `ready-for-agent`): https://github.com/SegFault2017/at-frontend/issues/10. 47 user stories, implementation and testing decisions. **Read it first; it is the source of truth.** Do not re-derive decisions from the map.
- Prototype for the Submit result view: branch `prototype/submit-result` (commit `80d08bc`), pushed, never merged. Throwaway route `src/app/prototype-submit/page.tsx`; open with `npm ci && npm run dev -- -p 3100`, then `/prototype-submit?variant=C&scenario=fail` (scenarios: fail, pass, crash, timeout, down).

## Next focus

Slice the spec into per-repo tickets (no shared tracker; file each in the repo that owns the change, link back to the spec). Suggested order from the spec's Further Notes:

1. `algo-scraper`: fix defects (case param names vs starter signature; `TreeNode`/`ListNode` in verifier runner; retry JSON-parse failures; stop silently marking "no Reference Solution" Done), add token/cost logging, add filter flag (algorithms + official solution only, ~2,053 of 4,021).
2. `algo-scraper`: re-run 20-problem calibration, set spend cap from measured cost, start full run in background.
3. `algo-scraper`: publish problem text together with Hidden Tests (none without tests).
4. `at-executor`: return Case Category per case in `/execute`.
5. `at-ai-tutor`: catalog list/get endpoints, `POST /api/submit` (pass-through, 502 on executor down), review/hint input changes, hint cache keyed on failing case.
6. `at-frontend`: problem picker + coaching result view (needs 4 and 5).

Steps 3-5 can run in parallel once response shapes are agreed.

## Things not in the issues

- **Tracker routing:** never run `gh` against the container repo; always `-R SegFault2017/<repo>` (see `../docs/agents/issue-tracker.md`).
- **Git push:** `origin` is SSH and this machine has no GitHub SSH access. The prototype was pushed once over HTTPS using `gh`'s credentials (`git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push https://github.com/SegFault2017/<repo>.git <branch>`). Nothing in git config was changed.
- **Executor port:** the spec's default `localhost:8001` for the tutor's executor URL is an unverified guess. Confirm the executor's real port.
- **Calibration cost unmeasured:** the scraper logs no token usage. Check the Bedrock usage console for the calibration run's window (it ran 2026-10-23, 611 s), or let the new logging measure the next run.
- **Local env facts (this machine):** Mongo is the container `algo-scraper-mongo-1` on :27017 (4,033 raw problems; now ~139 processed, 40 published suites). `algo-trainer-mongo` from the old handoff can't start (port taken). `algo-scraper/.env` exists now with Bedrock credentials; credentials are temporary and expire; do not read or print `.env`. Old scraper handoff: `algo-scraper/.claude/handoffs/full-process-run-2026-08-28.md`.
- `at-frontend` now has `node_modules` (from `npm ci`; `sharp`/`unrs-resolver` install scripts were blocked by npm policy and did not run).
- Calibration log (not committed): `/tmp/claude-1000/-home-ubuntu-work-algo-trainer-at-frontend/0ee30127-8f7f-4712-978a-c5a69acead11/scratchpad/calibration.log`.

## Preferences observed

- No co-author trailers on commits (user's global CLAUDE.md).
- Confirm before any networking/paid command; audit npm install scripts first; never read `.env`/secrets.
- User answers grilling rounds with "go with your recommendation"; for choices between options they name one explicitly ("looks good" alone is not a pick; ask).

## Suggested skills

- `mattpocock-skills:to-tickets` (or ask for per-repo slicing) to turn issue 10 into tickets.
- `mattpocock-skills:tdd` when implementing any slice; seams are the three existing ones listed in the spec's Testing Decisions.
- `mattpocock-skills:domain-modeling` if a new term appears (use the scraper's `CONTEXT.md` vocabulary).
- `mattpocock-skills:diagnosing-bugs` if the full scraper run misbehaves (`[DROP]`/`[RETRY]` lines are the diagnostic surface).
