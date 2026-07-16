-- Supabase Advisor hardening for SkillTrials.
-- Browser roles cannot access the server-only generation ledger, even if a
-- future grant is accidentally added. Cover compound foreign keys used by
-- publication and run lookups.

begin;

create policy "generation requests deny browser roles"
  on public.generation_requests for all to anon, authenticated
  using (false)
  with check (false);

create index trials_source_id_idx on public.trials (source_id);
create index trials_id_published_version_idx on public.trials (id, published_version_id);
create index runs_trial_version_idx on public.runs (trial_id, trial_version_id);

commit;
