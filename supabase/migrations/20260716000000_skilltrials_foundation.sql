-- SkillTrials foundation schema.
--
-- Browser clients may read only their own private metadata. The application
-- service performs every mutation using the server-only service role.

begin;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  storage_bucket text not null default 'source-materials'
    check (storage_bucket = 'source-materials'),
  storage_object_path text not null unique
    check (storage_object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$')
    check (storage_object_path like owner_id::text || '/' || id::text || '/%'),
  mime_type text not null check (char_length(mime_type) between 1 and 128),
  byte_size bigint not null check (byte_size between 1 and 100000),
  normalized_char_count integer check (normalized_char_count between 0 and 40000),
  content_sha256 text check (content_sha256 ~ '^[0-9a-f]{64}$'),
  generation_brief jsonb not null default '{}'::jsonb
    check (jsonb_typeof(generation_brief) = 'object'),
  ingest_status text not null default 'uploaded'
    check (ingest_status in ('uploaded', 'processing', 'ready', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (ingest_status = 'failed' and failure_reason is not null)
    or (ingest_status <> 'failed' and failure_reason is null)
  )
);

create index sources_owner_created_at_idx on public.sources (owner_id, created_at desc);

create table public.source_spans (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  start_char integer not null check (start_char >= 0),
  end_char integer not null check (end_char > start_char),
  label text not null check (char_length(label) between 1 and 160),
  text_content text not null check (char_length(text_content) between 1 and 12000),
  content_sha256 text check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (source_id, ordinal),
  unique (source_id, start_char, end_char)
);

create index source_spans_source_ordinal_idx on public.source_spans (source_id, ordinal);

create table public.trials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 600),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_version_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'published' and published_version_id is not null and published_at is not null)
    or (status <> 'published')
  )
);

create index trials_owner_updated_at_idx on public.trials (owner_id, updated_at desc);
create index trials_published_slug_idx on public.trials (slug) where status = 'published';

-- Server-only ledger for bounded generation usage. Browser roles receive no
-- table privileges or policies; the application service checks this before
-- it invokes the model.
create table public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index generation_requests_owner_created_at_idx on public.generation_requests (owner_id, created_at desc);

-- This function is only callable by the server-side service role. The
-- transaction-scoped advisory lock makes the rate-limit reservation atomic
-- for one author even when several requests arrive at the same instant.
create function public.reserve_generation_slot(request_owner uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  recent_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(request_owner::text, 0));
  select count(*)
    into recent_count
    from public.generation_requests
   where owner_id = request_owner
     and created_at >= now() - interval '1 hour';
  if recent_count >= 4 then
    return false;
  end if;
  insert into public.generation_requests (owner_id) values (request_owner);
  return true;
end;
$$;

revoke all on function public.reserve_generation_slot(uuid) from public, anon, authenticated;
grant execute on function public.reserve_generation_slot(uuid) to service_role;

create table public.trial_versions (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials (id) on delete cascade,
  version integer not null check (version > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  generation_model text not null check (char_length(generation_model) between 1 and 120),
  validation_report jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_report) = 'object'),
  created_at timestamptz not null default now(),
  unique (trial_id, version),
  unique (trial_id, id)
);

comment on table public.trial_versions is
  'Immutable, validated scenario documents. Browser roles have no update or delete permission.';

create index trial_versions_trial_version_idx on public.trial_versions (trial_id, version desc);

alter table public.trials
  add constraint trials_published_version_matches_trial_fkey
  foreign key (id, published_version_id)
  references public.trial_versions (trial_id, id)
  deferrable initially immediate;

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials (id) on delete restrict,
  trial_version_id uuid not null,
  participant_id uuid not null references auth.users (id) on delete cascade,
  state text not null default 'in_progress'
    check (state in ('in_progress', 'completed', 'abandoned')),
  current_node_id text not null check (char_length(current_node_id) between 1 and 160),
  state_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(state_snapshot) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (state = 'completed' and completed_at is not null)
    or (state <> 'completed')
  ),
  constraint runs_version_belongs_to_trial_fkey
    foreign key (trial_id, trial_version_id)
    references public.trial_versions (trial_id, id)
    on delete restrict
);

create index runs_participant_started_at_idx on public.runs (participant_id, started_at desc);
create index runs_trial_started_at_idx on public.runs (trial_id, started_at desc);

create table public.run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  sequence_number integer not null check (sequence_number > 0),
  event_type text not null check (event_type in ('started', 'action_selected', 'state_changed', 'completed', 'abandoned')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (run_id, sequence_number)
);

create index run_events_run_sequence_idx on public.run_events (run_id, sequence_number);

create table public.debriefs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.runs (id) on delete cascade,
  score numeric(5, 2) not null check (score between 0 and 100),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create table public.sample_trial_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 600),
  topic text not null check (char_length(topic) between 1 and 80),
  estimated_minutes smallint not null check (estimated_minutes between 1 and 60),
  scenario_document jsonb not null check (jsonb_typeof(scenario_document) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sample_trial_catalog is
  'Public, source-free demo scenarios. Never place private uploaded material here.';

-- Private source bucket. Only the server-side service role may access objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-materials',
  'source-materials',
  false,
  100000,
  array['text/plain', 'text/markdown']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.sources enable row level security;
alter table public.source_spans enable row level security;
alter table public.trials enable row level security;
alter table public.generation_requests enable row level security;
alter table public.trial_versions enable row level security;
alter table public.runs enable row level security;
alter table public.run_events enable row level security;
alter table public.debriefs enable row level security;
alter table public.sample_trial_catalog enable row level security;

-- Source material and normalized spans stay private to their owner.
create policy "sources owner selects"
  on public.sources for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "source spans owner selects"
  on public.source_spans for select to authenticated
  using (exists (
    select 1 from public.sources s
    where s.id = source_id and s.owner_id = (select auth.uid())
  ));

-- Only authors can read base trial records. Published data is served through
-- the application server, which projects a deliberately sanitized document.
create policy "trials owner selects"
  on public.trials for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Versions are immutable. Only the server-side generation pipeline inserts them.
create policy "trial versions owner selects"
  on public.trial_versions for select to authenticated
  using (exists (
    select 1 from public.trials t
    where t.id = trial_id
      and t.owner_id = (select auth.uid())
  ));

-- Browser roles can read only their own historical runs. Server routes append
-- events and produce debriefs after they validate each deterministic state transition.
create policy "runs participant or trial owner selects"
  on public.runs for select to authenticated
  using (
    participant_id = (select auth.uid())
    or exists (
      select 1 from public.trials t
      where t.id = trial_id and t.owner_id = (select auth.uid())
    )
  );
create policy "run events participant or trial owner selects"
  on public.run_events for select to authenticated
  using (exists (
    select 1 from public.runs r
    where r.id = run_id
      and (
        r.participant_id = (select auth.uid())
        or exists (
          select 1 from public.trials t
          where t.id = r.trial_id and t.owner_id = (select auth.uid())
        )
      )
  ));

create policy "debrief participant or trial owner selects"
  on public.debriefs for select to authenticated
  using (exists (
    select 1 from public.runs r
    where r.id = run_id
      and (
        r.participant_id = (select auth.uid())
        or exists (
          select 1 from public.trials t
          where t.id = r.trial_id and t.owner_id = (select auth.uid())
        )
      )
  ));

create policy "sample catalog is public"
  on public.sample_trial_catalog for select to anon, authenticated
  using (true);

revoke all on public.sources, public.source_spans, public.trials,
  public.generation_requests, public.trial_versions, public.runs, public.run_events, public.debriefs,
  public.sample_trial_catalog from anon, authenticated;

grant select on public.sources, public.source_spans, public.trials to authenticated;
grant select on public.trials, public.trial_versions to authenticated;
grant select on public.sample_trial_catalog to anon, authenticated;
grant select on public.runs to authenticated;
grant select on public.run_events, public.debriefs to authenticated;

commit;
