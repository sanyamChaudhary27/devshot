# AGENTS.md

## Mission

Build SkillTrials: turn source material into a grounded, playable decision simulation that proves practical understanding. The submission must feel like a finished product, not a chatbot, quiz generator, or animated prompt response.

## Product contract

- A judge understands the input, transformation, and value within 20 seconds.
- Every generated fact, consequence, and debrief claim cites the source.
- Learners make meaningful choices that change state and outcomes.
- A generated trial is playable without additional model calls.
- The three-minute demo works from a clean browser session.
- GPT-5.6 is necessary for scenario design and evaluation, but deterministic code validates structure, grounding, and reachability.

## Architecture boundaries

- `apps/web`: Next.js App Router product and server routes.
- `packages/domain`: framework-free contracts and scoring rules.
- `packages/generation`: OpenAI prompts, structured output, verification, and repair.
- `packages/ui`: reusable product components; no data access.
- `supabase`: migrations, seed data, and database tests.
- `docs`: architecture, decisions, demo, and operating notes.

Dependencies point inward: UI -> application -> domain. Supabase and OpenAI are adapters, never imported by the domain package.

## Non-negotiable data rules

- Treat uploaded material and model output as untrusted.
- Never expose OpenAI or Supabase secret/service-role keys to the browser.
- Enable RLS on every exposed table and scope access by `auth.uid()`.
- Keep source files in a private bucket with owner-based policies.
- Store scenario documents as versioned JSON matching the domain schema.
- Never render generated HTML or execute generated JavaScript.
- A public share exposes only the published trial and no source document.

## Generation pipeline

1. Normalize and bound source text.
2. Extract learning objectives with source spans.
3. Generate a typed scenario graph.
4. Validate schema, citations, graph reachability, and terminal paths.
5. Run a verifier pass for unsupported claims and weak choices.
6. Repair once with explicit validation errors; otherwise fail clearly.
7. Persist an immutable version and render it through the fixed runtime.

## UX rules

- Lead with “upload → playable trial,” not model terminology.
- The player screen prioritizes situation, available evidence, actions, and consequences.
- Never show fake progress. Generation stages reflect completed server events.
- Use strong contrast, keyboard navigation, reduced motion, and mobile-safe layouts.
- Avoid gradients-everywhere, glassmorphism, excessive cards, filler copy, and generic AI sparkle language.
- Empty, loading, failure, and partial-generation states are first-class.

## Engineering rules

- TypeScript strict mode; avoid `any`, unsafe casts, and unvalidated JSON.
- Validate every external boundary with Zod.
- Prefer small pure functions and explicit state transitions.
- Pin dependencies and commit the lockfile.
- Model names and limits come from server environment variables.
- No network calls in unit tests; use fixtures at adapter boundaries.
- Do not copy prior hackathon repositories. Reuse only licensed dependencies with attribution.
- Do not invent metrics, users, research claims, or test results.

## Verification gates

Before handoff, run the available equivalents of:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For database work, also run migration checks, RLS tests, and Supabase advisors. For user journeys, verify one sample trial and one generated trial in a clean browser.

## Scope order

1. Sample trial player and debrief.
2. Source ingestion and grounded scenario generation.
3. Verification and repair pipeline.
4. Author preview, publish, and share.
5. Supabase persistence and ownership.
6. Accessibility, demo reliability, and submission polish.

Defer payments, organizations, collaboration, arbitrary game-code generation, real-time multiplayer, and broad file-format support.

## Definition of done

A feature is done only when its happy path works, unsafe input fails safely, contracts are tested, documentation is current, and it strengthens a judging criterion or the three-minute demo.
