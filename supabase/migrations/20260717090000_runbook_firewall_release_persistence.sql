-- Runbook Firewall persistence. These tables are additive so existing
-- SkillTrials records remain untouched during the product transition.
-- The application service is the only writer; browser roles may read only
-- their own records through RLS.

begin;

create table public.release_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index release_policies_owner_updated_at_idx
  on public.release_policies (owner_id, updated_at desc);
create index release_policies_source_id_idx on public.release_policies (source_id);

create table public.release_policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.release_policies (id) on delete cascade,
  version integer not null check (version > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  compilation_model text not null check (char_length(compilation_model) between 1 and 120),
  validation_report jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_report) = 'object'),
  created_at timestamptz not null default now(),
  unique (policy_id, version),
  unique (policy_id, id)
);

comment on table public.release_policy_versions is
  'Immutable, validated release-policy documents. Browser roles cannot mutate versions.';

create index release_policy_versions_policy_version_idx
  on public.release_policy_versions (policy_id, version desc);

create table public.release_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  policy_version_id uuid not null references public.release_policy_versions (id) on delete restrict,
  release_id text not null check (char_length(release_id) between 1 and 96),
  control_id text not null check (char_length(control_id) between 1 and 96),
  value text not null check (char_length(value) between 1 and 2000),
  provenance text not null
    check (provenance in ('operator_attested', 'integration_verified', 'demo_fixture')),
  status text not null check (status in ('valid', 'invalid')),
  captured_at timestamptz not null,
  record_sha256 text not null check (record_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index release_evidence_owner_created_at_idx
  on public.release_evidence (owner_id, created_at desc);
create index release_evidence_policy_release_control_idx
  on public.release_evidence (policy_version_id, release_id, control_id);

create table public.release_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  policy_version_id uuid not null references public.release_policy_versions (id) on delete restrict,
  release_id text not null check (char_length(release_id) between 1 and 96),
  base_revision text not null check (char_length(base_revision) between 1 and 160),
  proposed_revision text not null check (char_length(proposed_revision) between 1 and 160),
  changed_files jsonb not null default '[]'::jsonb
    constraint release_checks_changed_files_shape_check
      check (jsonb_typeof(changed_files) = 'array')
    constraint release_checks_changed_files_size_check
      check (jsonb_array_length(changed_files) between 1 and 1000)
    constraint release_checks_changed_files_bytes_check
      check (pg_column_size(changed_files) <= 200000),
  verdict text not null check (verdict in ('BLOCKED', 'ELIGIBLE')),
  check_document jsonb not null check (jsonb_typeof(check_document) = 'object'),
  check_sha256 text not null check (check_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index release_checks_owner_created_at_idx
  on public.release_checks (owner_id, created_at desc);
create index release_checks_policy_release_created_at_idx
  on public.release_checks (policy_version_id, release_id, created_at desc);

comment on column public.release_checks.changed_files is
  'Untrusted, bounded manifest of paths changed between the recorded revisions; never executable content.';

create table public.release_receipts (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null unique references public.release_checks (id) on delete restrict,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  fingerprint text not null unique check (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

comment on table public.release_receipts is
  'Immutable fingerprinted release-gate receipts. A receipt is permanently bound to one release check.';

create function public.prevent_release_receipt_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'release receipts are immutable';
end;
$$;

create trigger release_receipts_immutable
  before update or delete on public.release_receipts
  for each row execute function public.prevent_release_receipt_mutation();

revoke all on function public.prevent_release_receipt_mutation() from public, anon, authenticated;
grant execute on function public.prevent_release_receipt_mutation() to service_role;

alter table public.release_policies enable row level security;
alter table public.release_policy_versions enable row level security;
alter table public.release_evidence enable row level security;
alter table public.release_checks enable row level security;
alter table public.release_receipts enable row level security;

create policy "release policies owner selects"
  on public.release_policies for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "release policy versions owner selects"
  on public.release_policy_versions for select to authenticated
  using (exists (
    select 1 from public.release_policies p
    where p.id = policy_id and p.owner_id = (select auth.uid())
  ));

create policy "release evidence owner selects"
  on public.release_evidence for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "release checks owner selects"
  on public.release_checks for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "release receipts owner selects"
  on public.release_receipts for select to authenticated
  using (exists (
    select 1 from public.release_checks c
    where c.id = check_id and c.owner_id = (select auth.uid())
  ));

revoke all on public.release_policies, public.release_policy_versions,
  public.release_evidence, public.release_checks, public.release_receipts
  from anon, authenticated;

grant select on public.release_policies, public.release_policy_versions,
  public.release_evidence, public.release_checks, public.release_receipts
  to authenticated;

commit;
