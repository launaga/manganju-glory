-- ============================================================================
-- MGL Portfolio CMS — 0001 Initial Schema
-- Phase 3 (Database). Tables, types, constraints, indexes, updated_at triggers.
-- No RLS here (see 0002); no storage (see 0003).
--
-- Conventions:
--   • snake_case, plural table names, uuid PKs (gen_random_uuid()).
--   • Bilingual content stored as paired columns: <field>_id / <field>_en.
--   • Singleton "page" content = one row guarded by id = 1; repeating sub-blocks
--     that always render with their page are stored as jsonb (not over-normalised).
--   • Collection content (projects, blog, skills, ...) = proper relational tables.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (available on Supabase by default).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums & shared helpers
-- ---------------------------------------------------------------------------

-- Consistent publishing status used by all collection content.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

-- Keeps updated_at fresh on every UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin authorization (single-admin, extensible)
-- An authenticated Supabase user is NOT automatically an admin. Only user_ids
-- present in admin_users may manage content. is_admin() is the single source of
-- truth used by every RLS write policy (see 0002).
-- ---------------------------------------------------------------------------
create table admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so it can read admin_users regardless of the caller's RLS.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- SITE SETTINGS (singleton) — brand, contact, footer, social. Site "chrome".
-- ---------------------------------------------------------------------------
create table site_settings (
  id                smallint primary key default 1 check (id = 1),
  site_name         text not null default 'Manganju Glory Laurencius',
  email             text,
  phone             text,
  phone_display_id  text,
  phone_display_en  text,
  location_id       text,
  location_en       text,
  resume_url        text,
  wa_text_id        text,
  wa_text_en        text,
  nav_cta_id        text,
  nav_cta_en        text,
  footer_blurb_id   text,
  footer_blurb_en   text,
  footer_tagline_id text,
  footer_tagline_en text,
  footer_rights_id  text,
  footer_rights_en  text,
  -- [{ "platform": "instagram", "url": "...", "label": "Instagram" }, ...]
  social_links      jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);
create trigger trg_site_settings_updated before update on site_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- SEO SETTINGS — one row per page_key, plus a single 'global' row that also
-- carries the site-wide defaults (favicon, default OG, twitter image, etc.).
-- ---------------------------------------------------------------------------
create table seo_settings (
  id                  uuid primary key default gen_random_uuid(),
  page_key            text not null unique,   -- 'global' | 'home' | 'about' | ...
  title_id            text,
  title_en            text,
  desc_id             text,
  desc_en             text,
  og_image            text,
  -- global-only columns (only meaningful on the page_key = 'global' row):
  site_title_id       text,
  site_title_en       text,
  default_og_image    text,
  twitter_image       text,
  favicon_url         text,
  google_verification text,
  robots              text default 'index, follow',
  updated_at          timestamptz not null default now()
);
create trigger trg_seo_settings_updated before update on seo_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- HOMEPAGE (singleton). Scalar hero/section copy as columns; repeating blocks
-- (expertise columns, service rows, process steps, marquees) as jsonb.
-- Featured projects are NOT stored here — they derive from projects.featured.
-- ---------------------------------------------------------------------------
create table homepage (
  id                     smallint primary key default 1 check (id = 1),
  -- HERO
  hero_eyebrow_id text, hero_eyebrow_en text,
  hero_h1a_id text, hero_h1a_en text,
  hero_h1b_id text, hero_h1b_en text,
  hero_h1c_id text, hero_h1c_en text,
  hero_sub_id text, hero_sub_en text,
  hero_lead_before_id text, hero_lead_before_en text,
  hero_lead_mark_id text, hero_lead_mark_en text,
  hero_lead_after_id text, hero_lead_after_en text,
  hero_cta_id text, hero_cta_en text,
  hero_photo_alt_id text, hero_photo_alt_en text,
  hero_image text,
  -- A DIFFERENT ANGLE
  angle_eyebrow_id text, angle_eyebrow_en text,
  angle_big_before_id text, angle_big_before_en text,
  angle_big_accent_id text, angle_big_accent_en text,
  angle_p1_id text, angle_p1_en text,
  angle_p2_id text, angle_p2_en text,
  angle_close_before_id text, angle_close_before_en text,
  angle_close_mark_id text, angle_close_mark_en text,
  -- EXPERTISE
  exp_eyebrow_id text, exp_eyebrow_en text,
  exp_title_id text, exp_title_en text,
  -- ABOUT TEASER
  about_eyebrow_id text, about_eyebrow_en text,
  about_h2_before_id text, about_h2_before_en text,
  about_h2_accent_id text, about_h2_accent_en text,
  about_lead_id text, about_lead_en text,
  about_btn_id text, about_btn_en text,
  -- SERVICES
  svc_eyebrow_id text, svc_eyebrow_en text,
  svc_title_id text, svc_title_en text,
  svc_best_label_id text, svc_best_label_en text,
  -- PROCESS
  proc_eyebrow_id text, proc_eyebrow_en text,
  proc_title_id text, proc_title_en text,
  proc_lead_id text, proc_lead_en text,
  -- CTA
  cta_title_id text, cta_title_en text,
  cta_btn_id text, cta_btn_en text,
  -- repeating blocks / lists
  marquee_tools_id  jsonb not null default '[]'::jsonb,
  marquee_tools_en  jsonb not null default '[]'::jsonb,
  marquee_accent_id jsonb not null default '[]'::jsonb,
  marquee_accent_en jsonb not null default '[]'::jsonb,
  exp_cols          jsonb not null default '[]'::jsonb,
  svc_rows          jsonb not null default '[]'::jsonb,
  proc_steps        jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);
create trigger trg_homepage_updated before update on homepage
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- ABOUT (singleton). Scalar section copy + jsonb for story/principles/etc.
-- ---------------------------------------------------------------------------
create table about (
  id                     smallint primary key default 1 check (id = 1),
  hero_eyebrow_id text, hero_eyebrow_en text,
  hero_h1_before_id text, hero_h1_before_en text,
  hero_h1_accent_id text, hero_h1_accent_en text,
  hero_lead_id text, hero_lead_en text,
  hero_photo_alt_id text, hero_photo_alt_en text,
  hero_image text,
  story_eyebrow_id text, story_eyebrow_en text,
  story_title_id text, story_title_en text,
  story_read_case_label_id text, story_read_case_label_en text,
  prin_eyebrow_id text, prin_eyebrow_en text,
  prin_title_id text, prin_title_en text,
  chips_eyebrow_id text, chips_eyebrow_en text,
  chips_title_id text, chips_title_en text,
  bound_eyebrow_id text, bound_eyebrow_en text,
  bound_title_a_id text, bound_title_a_en text,
  bound_title_b_id text, bound_title_b_en text,
  bound_close_before_id text, bound_close_before_en text,
  bound_close_mark_id text, bound_close_mark_en text,
  cta_title_id text, cta_title_en text,
  cta_btn_id text, cta_btn_en text,
  cta_wa_id text, cta_wa_en text,
  story_paragraphs jsonb not null default '[]'::jsonb,
  principles       jsonb not null default '[]'::jsonb,
  chips            jsonb not null default '[]'::jsonb,
  boundaries       jsonb not null default '[]'::jsonb,
  marquee_id       jsonb not null default '[]'::jsonb,
  marquee_en       jsonb not null default '[]'::jsonb,
  updated_at       timestamptz not null default now()
);
create trigger trg_about_updated before update on about
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- PRICING (singleton). Scalar headings + jsonb for packages/factors/faq.
-- ---------------------------------------------------------------------------
create table pricing (
  id                     smallint primary key default 1 check (id = 1),
  eyebrow_id text, eyebrow_en text,
  h1_lead_id text, h1_lead_en text,
  h1_accent_id text, h1_accent_en text,
  lead_id text, lead_en text,
  packages_eyebrow_id text, packages_eyebrow_en text,
  packages_title_id text, packages_title_en text,
  packages_note_id text, packages_note_en text,
  factors_eyebrow_id text, factors_eyebrow_en text,
  factors_title_id text, factors_title_en text,
  factors_lead_id text, factors_lead_en text,
  not_included_eyebrow_id text, not_included_eyebrow_en text,
  not_included_title_id text, not_included_title_en text,
  not_included_lead_id text, not_included_lead_en text,
  faq_eyebrow_id text, faq_eyebrow_en text,
  faq_title_id text, faq_title_en text,
  cta_title_id text, cta_title_en text,
  cta_wa_id text, cta_wa_en text,
  packages     jsonb not null default '[]'::jsonb,
  factors      jsonb not null default '[]'::jsonb,
  not_included jsonb not null default '[]'::jsonb,
  faq          jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);
create trigger trg_pricing_updated before update on pricing
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- SERVICES (collection) — cards on the Services page. Bilingual.
-- ---------------------------------------------------------------------------
create table services (
  id            uuid primary key default gen_random_uuid(),
  display_order int not null default 0,
  slug_id       text not null,
  slug_en       text not null,
  n_id text, n_en text,
  h_id text, h_en text,
  p_id text, p_en text,
  meta_id text, meta_en text,
  status        content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (slug_id),
  unique (slug_en)
);
create index idx_services_status on services (status);
create index idx_services_order  on services (display_order);
create trigger trg_services_updated before update on services
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- STATS (collection) — the 3-number stat block shared by Home & About.
-- ---------------------------------------------------------------------------
create table stats (
  id            uuid primary key default gen_random_uuid(),
  display_order int not null default 0,
  num           text not null,
  suffix        text not null default '',
  label_id text, label_en text,
  desc_id text, desc_en text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_stats_order on stats (display_order);
create trigger trg_stats_updated before update on stats
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- PROJECTS (collection) + PROJECT_IMAGES (gallery, FK cascade).
-- ---------------------------------------------------------------------------
create table projects (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  slug                 text not null unique,
  short_description_id text, short_description_en text,
  description_id       text, description_en text,
  category             text,
  year                 int,
  client               text,
  project_url          text,
  cover_image          text,
  cover_alt_id         text, cover_alt_en text,
  tags                 text[] not null default '{}',
  featured             boolean not null default false,
  status               content_status not null default 'draft',
  display_order        int not null default 0,
  seo_title            text,
  seo_description      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  published_at         timestamptz
);
create index idx_projects_status    on projects (status);
create index idx_projects_featured  on projects (featured);
create index idx_projects_order     on projects (display_order);
create index idx_projects_category  on projects (category);
create index idx_projects_published on projects (published_at desc);
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

create table project_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  url           text not null,
  alt_id text, alt_en text,
  caption_id text, caption_en text,
  width  int, height int,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);
create index idx_project_images_project on project_images (project_id);
create index idx_project_images_order   on project_images (project_id, display_order);

-- ---------------------------------------------------------------------------
-- EXPERIENCE (collection). Chronological (dates) + manual (display_order).
-- ---------------------------------------------------------------------------
create table experience (
  id               uuid primary key default gen_random_uuid(),
  company          text not null,
  role_id text, role_en text,
  description_id text, description_en text,
  start_date       date,
  end_date         date,
  location         text,
  company_logo     text,
  current_position boolean not null default false,
  display_order    int not null default 0,
  status           content_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_experience_status on experience (status);
create index idx_experience_order  on experience (display_order);
create index idx_experience_dates  on experience (start_date desc);
create trigger trg_experience_updated before update on experience
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- SKILL_CATEGORIES (collection) + SKILLS (FK).
-- ---------------------------------------------------------------------------
create table skill_categories (
  id            uuid primary key default gen_random_uuid(),
  name_id text, name_en text,
  slug          text not null unique,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_skill_categories_order on skill_categories (display_order);
create trigger trg_skill_categories_updated before update on skill_categories
  for each row execute function set_updated_at();

create table skills (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references skill_categories (id) on delete set null,
  name           text not null,
  description_id text, description_en text,
  icon           text,
  display_order  int not null default 0,
  is_visible     boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_skills_category on skills (category_id);
create index idx_skills_order    on skills (display_order);
create trigger trg_skills_updated before update on skills
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- TESTIMONIALS (collection).
-- ---------------------------------------------------------------------------
create table testimonials (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text,
  company       text,
  quote_id text, quote_en text,
  avatar        text,
  featured      boolean not null default false,
  status        content_status not null default 'draft',
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_testimonials_status on testimonials (status);
create index idx_testimonials_order  on testimonials (display_order);
create trigger trg_testimonials_updated before update on testimonials
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- BLOG_CATEGORIES (collection) + BLOG_POSTS (FK). Single-language for now
-- (see docs/DATABASE.md "Known issues" re: optional bilingual blog later).
-- ---------------------------------------------------------------------------
create table blog_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_blog_categories_updated before update on blog_categories
  for each row execute function set_updated_at();

create table blog_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  content         text,                 -- rich HTML from the editor
  featured_image  text,
  category_id     uuid references blog_categories (id) on delete set null,
  author          text,
  status          content_status not null default 'draft',
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_blog_posts_status    on blog_posts (status);
create index idx_blog_posts_published on blog_posts (published_at desc);
create index idx_blog_posts_category  on blog_posts (category_id);
create trigger trg_blog_posts_updated before update on blog_posts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- MEDIA — metadata only. Binaries live in Supabase Storage (see 0003).
-- ---------------------------------------------------------------------------
create table media (
  id           uuid primary key default gen_random_uuid(),
  file_name    text not null,
  storage_path text not null unique,
  public_url   text not null,
  mime_type    text,
  file_size    bigint,
  width        int,
  height       int,
  alt_id text, alt_en text,
  folder       text not null default 'general',
  uploaded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index idx_media_folder on media (folder);
create index idx_media_created on media (created_at desc);
