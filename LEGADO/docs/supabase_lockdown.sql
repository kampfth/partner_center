-- Supabase lockdown (deny-by-default)
-- Run in Supabase SQL Editor.
--
-- Goal: ensure anon/authenticated cannot read/write any data.
-- This project uses server-side service_role key via PHP backend.
--
-- Notes:
-- - Enabling RLS + NO POLICIES already blocks all row access for anon/authenticated.
-- - Revoking privileges is an additional defense-in-depth layer.

-- 1) Enable RLS on tables (adjust table list if you have more)
alter table if exists public.products enable row level security;
alter table if exists public.product_groups enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.audit_logs enable row level security;
alter table if exists public.app_settings enable row level security;
alter table if exists public.daily_sales enable row level security;

-- 2) Revoke privileges from anon/authenticated (defense-in-depth)
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_groups from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.daily_sales from anon, authenticated;

-- 3) Ensure there are no permissive RLS policies accidentally left behind
-- (Optional) Drop policies explicitly (adjust as needed).
-- Example:
-- drop policy if exists "Allow read" on public.products;

-- 4) Revoke EXECUTE from any RPCs that should never be callable publicly
-- This dynamically finds all overloads of get_product_summary and revokes access.
do $$
declare r record;
begin
  for r in
    select (p.oid::regprocedure)::text as regproc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_product_summary'
  loop
    execute format('revoke all on function %s from anon, authenticated;', r.regproc);
  end loop;
end $$;

-- 5) Quick verification queries
-- Show RLS status:
-- select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';
--
-- Show policies:
-- select schemaname, tablename, policyname, roles, cmd from pg_policies where schemaname='public';


