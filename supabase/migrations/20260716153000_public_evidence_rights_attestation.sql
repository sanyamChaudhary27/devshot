-- Public excerpts require recorded, explicit rights and attribution metadata.

begin;

alter table public.sources
  add column public_attribution_title text,
  add column public_license_notice text,
  add column public_evidence_rights_confirmed boolean not null default false,
  add constraint sources_public_evidence_rights_check
    check (
      (public_evidence_enabled = false
        and public_attribution_url is null
        and public_attribution_title is null
        and public_license_notice is null
        and public_evidence_rights_confirmed = false)
      or
      (public_evidence_enabled = true
        and public_attribution_url ~ '^https?://'
        and char_length(public_attribution_title) between 2 and 240
        and char_length(public_license_notice) between 2 and 320
        and public_evidence_rights_confirmed = true)
    );

commit;
