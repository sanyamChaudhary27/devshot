# SkillTrials

> Turn trusted source material into a testable decision simulation - not a quiz.

SkillTrials compiles a policy, procedure, manual, or lesson into a grounded, playable scenario. Learners make consequential choices, see state change, and receive a cited debrief. Authors can inspect source-to-claim proof before publishing.

The distinction matters: a generated trial is a typed state graph rendered by a fixed runtime. It is not generated executable code, a chat response, or a multiple-choice quiz with a new coat of paint.

## The 20-second judge story

1. Start with authoritative material.
2. GPT-5.6 designs a structured scenario and independently reviews whether its claims are supported.
3. Deterministic validators reject broken citations, weak choices, unsafe graphs, and unplayable endings; one bounded repair attempt is allowed.
4. A learner plays the validated result without another model call.

See [DEMO.md](DEMO.md) for the exact three-minute walkthrough and [DEVPOST.md](DEVPOST.md) for submission-ready copy.

## What a judge can test

- Launch a polished laboratory-safety trial without signing in.
- Make decisions that change visible exposure-control and lab-readiness state before a transfer begins.
- Inspect the public primary source behind the sample, then finish with a scored, evidence-backed debrief. Exact excerpts from private author uploads remain private.
- Sign in, paste or upload a short source, generate a new trial, preview it, and publish a share link.
- Inspect the private author proof panel: source-to-claim evidence, graph size, semantic review, and deterministic branch checks.

The bundled sample is intentionally available without sign-in or an API key, so the core product can be judged even if live generation is unavailable.

## Why GPT-5.6 is necessary

GPT-5.6 is used server-side for two bounded tasks that rule-based code cannot do credibly:

- Transform source material plus an author brief into a constrained, typed decision scenario.
- Semantically review whether scenario claims are actually supported by the source, then target a single repair when they are not.

The model does **not** run the player, score the learner, execute generated code, or receive browser-side secrets. Domain code validates the output and the fixed player applies the graph deterministically.

## Prerequisites

- Node.js 22 LTS
- pnpm 10+
- A Supabase project with Database, Auth, and Storage
- An OpenAI API key with access to the configured GPT-5.6 model
- Git

Docker is not required.

## Local setup

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Required server variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SITE_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=low
OPENAI_MAX_OUTPUT_TOKENS=12000
```

Only the URL and publishable key may use the `NEXT_PUBLIC_` prefix. Never place OpenAI or Supabase secret keys in client code.

Apply the migrations in `supabase/migrations` to the target project in timestamp order, then add `http://localhost:3000/auth/callback` as a Supabase Auth redirect URL. The author flow uses a magic link; the bundled sample needs no account or external service. Before deployment, follow [LIVE_CHECKLIST.md](LIVE_CHECKLIST.md).

## Repository map

```text
apps/web/             Product UI, server actions, and route handlers
packages/domain/      Scenario schema, state machine, scoring, validation
packages/generation/  OpenAI generation, verification, and repair adapters
packages/ui/          Reusable presentational components
supabase/             Migrations and database tests
ARCHITECTURE.md       Architecture and security boundaries
PLAN.md               Delivery plan and progress
LIVE_CHECKLIST.md     Deployment and live-integration acceptance checks
DEMO.md               Exact three-minute demo storyboard
DEVPOST.md            Submission copy and public-repository checklist
```

Start with [PROJECT.md](PROJECT.md), then read [ARCHITECTURE.md](ARCHITECTURE.md), [PLAN.md](PLAN.md), [DEMO.md](DEMO.md), and [CONTRIBUTING.md](CONTRIBUTING.md). Agents must also follow [AGENTS.md](AGENTS.md).

## Product quality bar

- No generated JavaScript or raw HTML execution.
- No unsupported claims in a trial or debrief.
- No decorative multi-agent theater.
- No fake loading steps or fabricated impact numbers.
- No dependence on a live generation call for the judge's sample path.
- No hidden third-party project copying; licensed dependencies are attributed.

## Verification

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

These checks do not replace the deployed acceptance path. Run [LIVE_CHECKLIST.md](LIVE_CHECKLIST.md) after changing environment configuration, Supabase schema, authentication, or generation behavior.

## Original work and attribution

Private-source shares redact verbatim excerpts by default. An author can enable public evidence only by recording a public source URL, attribution title, license/permission note, and explicit rights confirmation; that mode is for materials they are authorized to quote publicly, such as the bundled OSHA sample.

SkillTrials is an independent implementation. It does not copy a prior hackathon repository or hide third-party project code under a new history. Dependencies must be license-compatible and remain attributed. The product may be informed by public product patterns, but its schema-driven runtime, validation pipeline, author workflow, and presentation are built for this repository.

## Hackathon

Target track: **Education**. The product also has workplace-training applications, but the submission story remains focused: active practice and grounded assessment from existing learning material.

## Flagship sample source

The no-sign-in sample, **The fume hood check**, is grounded in OSHA's public [Laboratory Safety — Chemical Fume Hoods QuickFacts](https://www.osha.gov/sites/default/files/publications/OSHAquickfacts-lab-safety-chemical-fume-hoods.pdf). It is deliberately an actionable pre-lab decision: verify the control, pause when its status fails, and restart only with a safe plan. It is a simulation for learning—not local laboratory procedure or safety advice.
