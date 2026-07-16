# SkillTrials - Product Blueprint

## Product claim

SkillTrials compiles trusted source material into a testable decision model: a grounded simulation where choices change outcomes and every generated claim is inspectable before publication.

It does not claim to predict real-world job performance. It helps authors create better practice and helps learners demonstrate how they would apply a source under constraints.

## Primary audience

Training creators who already have authoritative material but lack the time and technical skill to build realistic practice exercises. The shipped learner experience is a public-source laboratory-safety drill; the same runtime supports onboarding, clinical handoffs, and classroom cases.

## Core user journeys

### Player

Open a share link, understand the mission, inspect evidence, choose actions, observe state changes, and receive a cited debrief. A player never needs an account for a published trial.

### Author

Sign in, add source material, choose audience/difficulty/duration, generate a draft, review validation findings, preview every path, publish an immutable version, and share it.

## Product mechanics

A trial is a typed graph, not generated executable code. Nodes describe a situation, visible evidence, choices, state effects, citations, and the next node. A fixed runtime applies effects and renders consequences. Terminal nodes feed a deterministic score and cited debrief; the learner path makes no model call.

Each trial defines a small, visible metric set. The bundled laboratory-safety drill uses exposure control and lab readiness so a judge can immediately see the cost of a decision before an unsafe action begins. Each choice must present a real tradeoff; choices differing only in wording fail validation.

## MVP scope

### Must ship

- One exceptional, zero-generation sample trial.
- Text/Markdown ingestion; PDF is optional after the core path works.
- Structured GPT-5.6 scenario generation with bounded citations.
- Schema, citation, semantic-grounding, reachability, terminal-path, and weak-choice validation.
- One bounded repair attempt.
- Author preview, publish, and public share link.
- Deterministic state transitions and scoring.
- Cited end-of-trial debrief.
- Supabase Auth, Postgres persistence, private source storage, and RLS.
- Responsive, keyboard-accessible UI.
- Unit, database-policy, and critical browser-path tests.

### Deliberate non-goals

- Arbitrary game-code generation.
- Generated images or voices in the critical path.
- Real-time multiplayer.
- Teams, billing, LMS integrations, or SCORM.
- More than three source formats.
- Claims that simulated scores predict job performance.

## Demo promise

1. Open "The fume hood check" and become a lab learner preparing a solvent transfer.
2. Inspect an out-of-range airflow indicator and the public OSHA QuickFacts evidence.
3. Decide whether to pause for a verified control or start because the amount is small.
4. Watch the safety state respond; a plausible shortcut produces a cited failure debrief.
5. Complete the controlled path and reveal why each preflight check matters.
6. Switch to author mode, paste a new two-page procedure, and show GPT-5.6 producing a validated draft.
7. Preview and publish the generated trial.

The production recording must use the exact, recoverable sequence in [DEMO.md](DEMO.md). It should never depend on a fresh model response at the moment a judge is watching.

## Judging strategy

- **Technological implementation:** GPT-5.6 structured generation and semantic review, typed scenario contracts, deterministic graph validation and scoring, source grounding, RLS, and a documented implementation trail.
- **Design:** one coherent author-to-player product with a polished sample and complete failure states.
- **Potential impact:** converts material organizations already possess into reusable active practice.
- **Idea quality:** goes beyond summarizers and quiz generators by producing stateful, consequential, source-grounded simulations.

## Acceptance gates

These are product gates, not market claims:

- All author-preview citations resolve to visible source spans. Public private-source shares redact verbatim excerpts by design; public evidence requires a recorded attribution, license/permission note, and explicit rights confirmation.
- Every scenario node is reachable or rejected before publish.
- Every non-terminal node has two to four materially distinct choices.
- The sample can be completed with keyboard only.
- A failed generation preserves the source and clearly offers a safe retry state.
- The three-minute demo requires no manual database editing, secret entry, or live model call for the sample path.

## Originality and reuse

SkillTrials is independently implemented around a schema-driven simulation engine, grounding validator, repair loop, authoring workflow, and cited assessment. It does not clone prior hackathon repositories or present copied code under a new Git history. All third-party packages must have compatible licenses and remain attributed.
