-- Static post-migration checks. Run this against a disposable/local database:
--   psql "$DATABASE_URL" -f supabase/tests/001_skilltrials_schema.sql
--
-- It validates schema hardening without creating users or touching production
-- data. Runtime RLS behavior still needs authenticated integration tests.

begin;

do $$
declare
  required_table text;
  required_policy text;
begin
  foreach required_table in array array[
    'sources', 'source_spans', 'trials', 'generation_requests', 'trial_versions',
    'runs', 'run_events', 'debriefs', 'sample_trial_catalog'
  ] loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'missing public.% table', required_table;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = required_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', required_table;
    end if;
  end loop;

  foreach required_policy in array array[
    'sources owner selects',
    'source spans owner selects',
    'trials owner selects',
    'trial versions owner selects',
    'generation requests deny browser roles'
  ] loop
    if not exists (select 1 from pg_policies where policyname = required_policy) then
      raise exception 'missing policy %', required_policy;
    end if;
  end loop;

  if not exists (
    select 1 from storage.buckets
    where id = 'source-materials' and public = false
  ) then
    raise exception 'source-materials bucket is missing or public';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sources'
      and column_name = 'public_evidence_enabled'
  ) then
    raise exception 'sources.public_evidence_enabled is missing';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  ) then
    raise exception 'public schema contains a SECURITY DEFINER function';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'reserve_generation_slot'
      and not has_function_privilege('authenticated', p.oid, 'execute')
  ) then
    raise exception 'generation reservation must be service-role only';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and has_function_privilege('authenticated', p.oid, 'execute')
  ) then
    raise exception 'internal trigger helper must not be callable by authenticated users';
  end if;

  if has_table_privilege('authenticated', 'public.trial_versions', 'insert')
    or has_table_privilege('authenticated', 'public.trial_versions', 'update')
    or has_table_privilege('authenticated', 'public.trial_versions', 'delete') then
    raise exception 'authenticated users must not mutate immutable trial versions';
  end if;

  if has_table_privilege('anon', 'public.trials', 'select')
    or has_table_privilege('anon', 'public.trial_versions', 'select') then
    raise exception 'anonymous users must not read base trial records';
  end if;

  if has_table_privilege('authenticated', 'public.sources', 'insert')
    or has_table_privilege('authenticated', 'public.sources', 'update')
    or has_table_privilege('authenticated', 'public.sources', 'delete')
    or has_table_privilege('authenticated', 'public.source_spans', 'insert')
    or has_table_privilege('authenticated', 'public.trials', 'insert')
    or has_table_privilege('authenticated', 'public.trials', 'update') then
    raise exception 'authenticated users must not mutate private source or trial records';
  end if;
end;
$$;

rollback;
