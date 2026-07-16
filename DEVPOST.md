# SkillTrials - Devpost Submission Kit

Replace bracketed placeholders only after the final deployment and recording are complete. Do not add claims that cannot be demonstrated in the submitted repository or video.

## Project name

SkillTrials

## Tagline

Turn trusted source material into a testable decision simulation - not a quiz.

## One-sentence pitch

SkillTrials uses GPT-5.6 to compile a policy, procedure, manual, or lesson into a source-grounded scenario where learners make consequential choices and authors can inspect the proof before publishing.

## Inspiration

Important procedures are often read once, acknowledged, and forgotten. Traditional quizzes can check recall, but they rarely reveal how someone will reason when evidence conflicts and every choice has a cost. We wanted a practical way for a training creator to turn material they already trust into active, inspectable practice.

## What it does

An author provides bounded source text and a learning brief. SkillTrials creates a typed scenario graph with scenes, evidence, choices, state effects, citations, outcomes, and a debrief. The author reviews validation and source-to-claim evidence, previews the trial, and publishes an immutable version. A learner can then play the published trial without signing in or making a model call.

The public share route is deliberately privacy-preserving: it exposes the published simulation but redacts verbatim private-source excerpts. The author proof view retains the source mapping.

## How we built it

- **Next.js / TypeScript:** authoring, player, server actions, and public share routes.
- **GPT-5.6:** server-side structured scenario generation and a separate semantic-grounding review.
- **Deterministic domain engine:** Zod contracts, citation checks, graph reachability, meaningful-choice checks, terminal-path checks, state transitions, and scoring.
- **Supabase:** magic-link authentication, owner-scoped persistence, private source storage, immutable trial versions, and row-level security.

Model output and uploaded material are treated as untrusted. The application never executes generated HTML, JavaScript, SQL, URLs, or tool calls. A failed generation is not published; the pipeline allows only one explicit repair pass.

## Why GPT-5.6 matters here

The difficult part is not displaying a decision tree. It is converting nuanced source material into a coherent, constrained scenario and evaluating whether the resulting factual claims remain supported by that source. GPT-5.6 handles those semantic tasks under a strict structured-output contract. Deterministic code then decides whether the graph is safe and playable. The learner runtime never asks the model what should happen next.

## Challenges we ran into

Grounding is more than attaching quotes. We needed stable source spans, semantic review, quote budgets, a private/public citation boundary, and a repair path that cannot silently publish a broken draft. We also needed a scenario graph that is genuinely playable: all nodes must be reachable, choices must differ materially, endings must be reachable, and the player must work without a live model call.

## Accomplishments we are proud of

- A complete author-to-player flow rather than a chat wrapper.
- A fixed, stateful player where choices visibly change outcomes.
- Source-grounding and graph validation that can reject an unsafe generated draft.
- A private-source/public-share boundary with Supabase RLS and server-side projection.
- A bundled sample that remains playable without API configuration.

## What we learned

Reliable AI products need two kinds of intelligence: model reasoning for open-ended synthesis and deterministic software for the promises that must always hold. Making that boundary visible improved both the product and the demo.

## What's next

After the hackathon, we would evaluate trials with educators and training teams, add carefully licensed domain samples, improve author editing, and explore standards-based exports only after preserving the grounding and privacy guarantees.

## Links to provide at submission time

- Live demo: `[DEPLOYED_URL]`
- Demo video: `[VIDEO_URL]`
- Source repository: `[REPOSITORY_URL]`
- Track: `Education`

## Public repository checklist

- [ ] Repository is public and the final deployed URL is reachable.
- [ ] `README.md` has clean setup, security boundaries, and verification commands.
- [ ] `DEMO.md` matches the uploaded video.
- [ ] No `.env`, keys, private sources, or generated user data are committed.
- [ ] Dependency and asset licenses have been checked; required attribution is present.
- [ ] The repository is an independent implementation, not a disguised copy of another hackathon project.
- [ ] Links and final Devpost fields have been tested in a signed-out browser.
