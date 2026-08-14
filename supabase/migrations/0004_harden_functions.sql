-- ============================================================================
-- MGL Portfolio CMS — 0004 Function hardening (security advisor fixes)
--
-- Resolves three Supabase database-linter warnings from 0001–0003:
--   • is_admin() was a SECURITY DEFINER function in the API-exposed `public`
--     schema, so it was callable via /rest/v1/rpc/is_admin by anon/authenticated.
--     Moving it to a non-exposed `private` schema removes the RPC surface while
--     keeping it usable inside RLS policies (policies reference it by OID, so the
--     schema move does not break them). anon/authenticated still need USAGE +
--     EXECUTE for policy evaluation — revoking EXECUTE instead would break RLS
--     (verified: anon reads then fail with "permission denied for function").
--   • set_updated_at() had a mutable search_path — pinned to empty.
-- ============================================================================

create schema if not exists private;

-- Move is_admin() out of the API-exposed schema. Same OID → existing policies
-- (incl. storage.objects policies written as public.is_admin()) keep working.
alter function public.is_admin() set schema private;

-- Policy evaluation runs as the querying role, so it needs access to the fn.
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- Pin the trigger function's search_path.
alter function public.set_updated_at() set search_path = '';
