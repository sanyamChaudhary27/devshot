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
    'runs', 'run_events', 'debriefs', 'sample_trial_catalog',
    'release_policies', 'release_policy_versions', 'release_evidence',
    'release_checks', 'release_receipts'
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
    'generation requests deny browser roles',
    'release policies owner selects',
    'release policy versions owner selects',
    'release evidence owner selects',
    'release checks owner selects',
    'release receipts owner selects'
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
    from pg_trigger trigger_record
    join pg_class relation on relation.oid = trigger_record.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'release_receipts'
      and trigger_record.tgname = 'release_receipts_immutable'
      and not trigger_record.tgisinternal
  ) then
    raise exception 'release receipts must have an immutability trigger';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'release_receipts'
      and column_name = 'fingerprint'
  ) then
    raise exception 'release_receipts.fingerprint is missing';
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'public'
        and table_name = 'release_checks'
        and column_name in ('base_revision', 'proposed_revision', 'changed_files')) <> 3 then
    raise exception 'release checks must bind base revision, proposed revision, and changed-file metadata';
  end if;

  if (select count(*) from pg_constraint
      where conrelid = 'public.release_checks'::regclass
        and conname in (
          'release_checks_changed_files_shape_check',
          'release_checks_changed_files_size_check',
          'release_checks_changed_files_bytes_check'
        )) <> 3 then
    raise exception 'release check changed-file metadata must be bounded and array-shaped';
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

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'prevent_release_receipt_mutation'
      and not has_function_privilege('authenticated', p.oid, 'execute')
  ) then
    raise exception 'receipt immutability helper must be service-role only';
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

  if has_table_privilege('anon', 'public.release_policies', 'select')
    or has_table_privilege('anon', 'public.release_policy_versions', 'select')
    or has_table_privilege('anon', 'public.release_evidence', 'select')
    or has_table_privilege('anon', 'public.release_checks', 'select')
    or has_table_privilege('anon', 'public.release_receipts', 'select') then
    raise exception 'anonymous users must not read release-gate records';
  end if;

  if has_table_privilege('authenticated', 'public.release_policies', 'insert')
    or has_table_privilege('authenticated', 'public.release_policies', 'update')
    or has_table_privilege('authenticated', 'public.release_policies', 'delete')
    or has_table_privilege('authenticated', 'public.release_policy_versions', 'insert')
    or has_table_privilege('authenticated', 'public.release_policy_versions', 'update')
    or has_table_privilege('authenticated', 'public.release_policy_versions', 'delete')
    or has_table_privilege('authenticated', 'public.release_evidence', 'insert')
    or has_table_privilege('authenticated', 'public.release_evidence', 'update')
    or has_table_privilege('authenticated', 'public.release_evidence', 'delete')
    or has_table_privilege('authenticated', 'public.release_checks', 'insert')
    or has_table_privilege('authenticated', 'public.release_checks', 'update')
    or has_table_privilege('authenticated', 'public.release_checks', 'delete')
    or has_table_privilege('authenticated', 'public.release_receipts', 'insert')
    or has_table_privilege('authenticated', 'public.release_receipts', 'update')
    or has_table_privilege('authenticated', 'public.release_receipts', 'delete') then
    raise exception 'authenticated users must not mutate release-gate records';
  end if;
end;
$$;

rollback;
