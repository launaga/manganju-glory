-- ============================================================================
-- MGL Portfolio CMS — 0005 Contact submissions
--
-- Moves the contact form off the Vercel serverless function onto Supabase.
-- The public form INSERTs here (anon), and only the admin can read/manage.
-- Column CHECK constraints validate at the DB level (client validation is not
-- trusted). No public SELECT/UPDATE/DELETE — RLS enforces it.
-- ============================================================================

create table contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  email      text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  subject    text,
  message    text not null check (char_length(btrim(message)) between 1 and 5000),
  status     text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contact_status  on contact_submissions (status);
create index idx_contact_created on contact_submissions (created_at desc);
create trigger trg_contact_updated before update on contact_submissions
  for each row execute function set_updated_at();

alter table contact_submissions enable row level security;

-- Public may ONLY insert (submit). Validation is via the CHECK constraints
-- above; the form also sends Prefer: return=minimal so no SELECT is needed.
create policy contact_public_insert on contact_submissions
  for insert with check (true);

-- Admin: full read/manage. (is_admin lives in the private schema — see 0004.)
create policy contact_admin on contact_submissions
  for all using (private.is_admin()) with check (private.is_admin());
-- (No public SELECT/UPDATE/DELETE policy ⇒ anon cannot read or modify.)
