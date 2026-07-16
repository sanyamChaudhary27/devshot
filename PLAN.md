# Delivery Plan

Deadline: July 21, 2026 at 5:00 PM Pacific / July 22 at 5:30 AM IST.

The implementation is feature-complete for the intended MVP. The remaining work is release discipline: deploy, execute the live checklist, record the exact demo, publish transparent submission materials, and avoid late risky changes.

## Milestone 0 - Foundation

- [x] Scaffold pnpm workspace, Next.js app, strict TypeScript, lint, tests, and CI-ready commands.
- [x] Implement domain scenario schema, state reducer, scoring, and graph validators.
- [x] Build the "Database Down" fixture and make it playable without services.
- [x] Establish visual tokens and accessible application shell.

Exit: a judge can complete the sample locally; domain tests cover transitions and invalid graphs.

## Milestone 1 - Authoring and generation

- [x] Add text/Markdown source ingestion and stable source spans.
- [x] Add server-only GPT-5.6 structured generation.
- [x] Add deterministic validation, verifier findings, and one repair pass.
- [x] Build generation status, failure recovery, and preview screens.

Exit: a short source becomes a valid preview or an actionable failure; no broken draft can publish.

## Milestone 2 - Persistence and publishing

- [x] Create Supabase schema, indexes, RLS, private bucket policies, and database checks.
- [x] Add auth and owner-scoped author dashboard.
- [x] Persist immutable trial versions and validation reports.
- [x] Add public share route containing no source document data.

Exit: two users cannot access each other's private data; a published trial works signed out.

## Milestone 3 - Product finish

- [x] Complete debrief with score breakdown and visible citations.
- [ ] Add one education-first sample only if it can be completed from a public/licensed source and verified end-to-end. Do not trade deployment reliability for this.
- [~] Verify keyboard, responsive, reduced-motion, loading, and error states. The sample player was verified in a clean browser; full responsive and reduced-motion deployment verification remains.
- [~] Run unit, database, browser, build, and secret-scan gates. Lint, typecheck, test, production build, diff check, and a clean-browser sample run passed locally; database and deployed checks remain in `LIVE_CHECKLIST.md`.

Exit: clean-browser demo is reliable and the critical path works with OpenAI temporarily unavailable.

## Milestone 4 - Submission

- [ ] Deploy and create a judge test account only if author mode cannot be demonstrated with the submitting account.
- [ ] Execute every applicable item in `LIVE_CHECKLIST.md` against the final origin.
- [ ] Record the exact sub-three-minute storyboard in `DEMO.md` using the final deployment.
- [x] Document model usage, original-work stance, attribution expectations, and test instructions in `README.md` and `DEVPOST.md`.
- [ ] Add screenshots, final Devpost copy, repository URL, and any required Devpost feedback/session field.
- [ ] Freeze risky changes at least six hours before the deadline.

## Team lanes

- Product/architecture owner: contracts, integration review, scope, final acceptance.
- Domain/generation owner: schema, validators, prompts, repair, tests.
- Experience owner: player, author preview, accessibility, responsive polish.
- Platform owner: Supabase, auth, publishing, deployment, browser verification.

No lane may change shared contracts without updating `ARCHITECTURE.md` and notifying the others.

## Cut order if time slips

1. PDF ingestion.
2. Narrative GPT debrief; retain deterministic debrief.
3. Third sample fixture.
4. Author editing beyond regenerate/publish.

Never cut grounding, validation, the sample path, RLS, accessibility basics, or deployment verification.
