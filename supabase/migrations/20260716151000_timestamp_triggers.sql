-- Keep dashboard ordering accurate after server-side publication updates.

begin;

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

create trigger trials_set_updated_at
  before update on public.trials
  for each row execute function public.set_updated_at();

create trigger sample_trial_catalog_set_updated_at
  before update on public.sample_trial_catalog
  for each row execute function public.set_updated_at();

commit;
