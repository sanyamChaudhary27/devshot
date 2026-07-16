-- Trigger helpers are internal implementation details, never Data API calls.

begin;

revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;

commit;
