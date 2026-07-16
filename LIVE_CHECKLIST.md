# Live Release Checklist

Use this checklist on the actual Supabase project and deployed URL. It is deliberately separate from local tests: no deployment or database claim is valid until these steps are complete.

## Completion record

Record the deployed origin, migration timestamps applied, tester identity, and date beside each completed item. Do not mark an item complete based on local behavior alone.

## 1. Configure the environment

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the selected Supabase project.
- Set `SUPABASE_SECRET_KEY` only in the server/deployment environment.
- Set `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6-terra`, and `OPENAI_REASONING_EFFORT=low` only in the server/deployment environment.
- Confirm that no secret variable begins with `NEXT_PUBLIC_`.
- Set `SITE_URL` to the exact canonical deployed origin, including `https://` and without a trailing path.
- Add both `http://localhost:3000/auth/callback` and `<deployed-origin>/auth/callback` to Supabase Auth Redirect URLs. If preview deployments are used, add only the exact preview origins that will be tested.

## 2. Apply and inspect the database

- Apply every migration in `supabase/migrations` once, in timestamp order, to the target project.
- Run `supabase/tests/001_skilltrials_schema.sql` against a disposable database session. The test transaction rolls back.
- In Supabase Database Advisors, confirm RLS is enabled for every public-schema table and there are no exposed security-definer views.
- Confirm `source-materials` is private, and that its object policies require the owner UUID at the start of the object path.
- As an unauthenticated REST request, verify `trials` and `trial_versions` cannot be selected directly. Public sharing must work only through `/t/[slug]`.

## 3. Verify the author path

1. Open the deployed app in a clean browser profile.
2. Send and open a magic link; verify it returns to `/dashboard` on the same deployed origin.
3. Paste a focused source between 80 and 40,000 characters that you are authorized to use and generate a trial.
4. Confirm a draft has source spans, a validation report, and an immutable version.
5. Preview the draft, play every branch, and check that every ending has a cited debrief.
6. Publish the draft and open its share URL in a signed-out clean browser.
7. Confirm the shared trial works, but citation detail says `Private source excerpt available to the author.` rather than exposing source text.
8. Confirm the author proof panel keeps the actual source-to-claim mapping private and the public page exposes only the published scenario projection.

## 4. Exercise failure paths

- Submit an undersized source and confirm no generation request is made.
- Temporarily remove the OpenAI key in a non-production environment; confirm the sample still works and author generation fails clearly.
- Generate four times within one hour for the same author; the fifth request must receive the rate-limit response.
- Force an invalid model fixture in a non-production environment; confirm validation repairs once, then stores a failed non-publishable result if it remains invalid.

## 5. Public repository and submission check

- Confirm `.env`, `.env.local`, Supabase secrets, and recorded private sources are not tracked.
- Confirm README setup steps work from a clean checkout and the four verification commands pass.
- Link `README.md`, `ARCHITECTURE.md`, `DEMO.md`, `DEVPOST.md`, and `LIVE_CHECKLIST.md` from the public repository.
- Verify every dependency and borrowed asset has compatible licensing and visible attribution where required.
- Do not submit copied hackathon code or remove history to disguise its provenance.
- Replace every bracketed placeholder in `DEVPOST.md` with final, accurate information.

## 6. Demo freeze

- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` from a clean checkout.
- Record the exact three-minute path in `DEMO.md`: sample trial, source-to-trial generation, validation proof, author preview, and public share.
- Keep a ready-to-play sample URL and the local fallback available for the live demo.
- Freeze schema, prompt, and authentication changes at least six hours before submission.
