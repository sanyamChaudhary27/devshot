# AGENTS.md

## Mission

Build Runbook Firewall: a merge-aware, evidence-backed pre-execution release gate for risky production changes. The submission must feel like a finished Developer Tool, not a runbook chatbot, checklist, or command runner.

## Product contract

- A judge understands the operator, stable-versus-upcoming merge, risky moment, and blocked-versus-eligible value within 20 seconds.
- GPT-5.6 compiles unstructured runbooks into cited, typed safeguards.
- Deterministic code evaluates evidence and owns the final release verdict.
- Every control, failure, and receipt claim links to a source span or explicitly labelled evidence record.
- A bundled Postgres migration demo works without a model call, login, or external system.
- The product never executes production commands and never calls operator-attested evidence independently verified.

## Architecture boundaries

- `apps/web`: Next.js App Router product and server routes.
- `packages/domain`: framework-free release-policy, risk, gate, and receipt contracts.
- `packages/generation`: OpenAI prompts, structured output, verification, and repair.
- `packages/ui`: reusable product components; no data access.
- `supabase`: migrations, seed data, and database tests.

Dependencies point inward: UI -> application -> domain. Supabase and OpenAI are adapters, never imported by the domain package.

## Non-negotiable data rules

- Treat runbooks, submitted commands, evidence, and model output as untrusted.
- Never expose OpenAI or Supabase secret/service-role keys to the browser.
- Enable RLS on every exposed table and scope access by `auth.uid()`.
- Keep source documents private by default; public receipts must use explicit projections.
- Store versioned policy and receipt JSON matching the domain schema.
- Never render generated HTML or execute generated JavaScript or commands.
- Evidence provenance is explicit: operator-attested, integration-verified, or demo fixture.

## Gate pipeline

1. Normalize and bound the runbook source.
2. Extract typed controls with source spans.
3. Validate schema, citations, control types, and policy completeness.
4. Analyze the stable-versus-upcoming merge, proposed command, and migration manifest using deterministic risk rules.
5. Match typed evidence to each control.
6. Return `BLOCKED` or `ELIGIBLE`; warnings never override a failed blocking control.
7. Persist an immutable, fingerprinted receipt.

## UX rules

- Lead with command -> cited controls -> verdict, not model terminology.
- Make the blocked-to-eligible transition visible and explainable.
- Put the exact source reason beside each missing safeguard.
- Clearly label evidence provenance; do not fabricate integrations, verification, users, or metrics.
- Use strong contrast, keyboard navigation, reduced motion, and mobile-safe layouts.
- Avoid generic dashboards, glassmorphism, filler copy, and AI sparkle language.

## Engineering rules

- TypeScript strict mode; no `any`, unsafe casts, or unvalidated JSON.
- Validate every external boundary with Zod.
- Prefer small pure functions and explicit state transitions.
- Pin dependencies and commit the lockfile.
- Model names and limits come from server environment variables.
- No network calls in unit tests; use fixtures at adapter boundaries.
- Do not copy prior hackathon repositories. Reuse only licensed dependencies with attribution.

## Verification gates

Run the available equivalents of:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For database work, also run migration checks, RLS tests, and Supabase advisors. For user journeys, verify the unsafe blocked path, safe eligible path, and public demo in a clean browser.

## Scope order

1. Deterministic bundled unsafe/safe migration demo.
2. Cited control ledger and immutable receipt.
3. Runbook ingestion and GPT-5.6 policy compilation.
4. Supabase persistence and ownership.
5. Accessibility, deployment, and submission polish.

Defer live command execution, infrastructure credentials, CI integrations, approval-system OAuth, broad file formats, organizations, and collaboration.

## Definition of done

A feature is done only when its happy path works, unsafe input fails safely, contracts are tested, documentation is current, and it strengthens a judging criterion or the three-minute demo.
