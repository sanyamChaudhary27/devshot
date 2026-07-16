-- An author must opt in before public players can see source excerpts.

begin;

alter table public.sources
  add column public_evidence_enabled boolean not null default false,
  add column public_attribution_url text,
  add constraint sources_public_evidence_attribution_check
    check ((public_evidence_enabled = false and public_attribution_url is null)
      or (public_evidence_enabled = true and public_attribution_url ~ '^https?://'));

commit;
