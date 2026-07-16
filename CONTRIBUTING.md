# Team Guide

## Start here

Read `AGENTS.md`, `PROJECT.md`, and `ARCHITECTURE.md` before coding. Pick one unchecked item in `PLAN.md`, state the contract you will touch, and keep the change small enough to review independently.

## Working agreement

- Use branches prefixed with `codex/` unless the team agrees otherwise.
- Never commit `.env`, API keys, source uploads, or real user material.
- Do not silently change the scenario schema; update fixtures, tests, and architecture together.
- Prefer a working vertical slice over disconnected screens.
- Report what you verified and what remains unverified.
- Stop on ambiguous product behavior and resolve it against the product contract.

## Pull request checklist

- [ ] The change has one clear purpose.
- [ ] External inputs are validated.
- [ ] Failure and empty states are handled.
- [ ] Tests cover the behavior, not implementation details.
- [ ] No secrets or generated artifacts are included.
- [ ] Accessibility was checked for interactive UI.
- [ ] Documentation and `.env.example` are current.
- [ ] `lint`, `typecheck`, `test`, and `build` pass.

## Scenario fixture standard

A fixture must include a briefing, source spans, two to four meaningful choices per non-terminal node, at least two reachable endings, deterministic effects, and a cited debrief rubric. It must contain one tempting but defensibly poor choice; it must not rely on trivia or trick wording.

## Model work

Prompts are versioned application code. Keep inputs bounded, request structured output, include prompt-injection resistance, and log only safe metadata. Tests use recorded fixtures, never live model calls. A model failure must not break already-published trials.

## Review standard

Review as if the demo will run once, live, on an unfamiliar machine. Reject code that merely looks complete, hides failures, duplicates contracts, or makes the happy path depend on fragile timing.
