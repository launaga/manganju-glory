-- ============================================================================
-- MGL Portfolio CMS — DEVELOPMENT seed data
--
-- Purpose: give every table enough rows to exercise the schema, RLS, ordering,
-- and status filtering during Phase 3 validation. All content is CLEARLY marked
-- "DEV" / example.com so it can never be mistaken for production copy.
--
-- This does NOT migrate the real portfolio content (16 projects, real homepage/
-- about/pricing). That is a separate, reviewed step — see docs/DATABASE.md
-- "Real content migration". Run this only against a development database.
--
-- Admin bootstrap: admin_users needs a real auth.users id, so it is created in
-- Phase 4 (Authentication), not here.
-- ============================================================================

-- Singletons ----------------------------------------------------------------
insert into site_settings (id, site_name, email, phone, footer_rights_id, footer_rights_en)
values (1, 'DEV — MGL Portfolio', 'dev@example.com', '0000000000',
        '© DEV — Seluruh Hak Cipta.', '© DEV — All rights reserved.')
on conflict (id) do nothing;

insert into seo_settings (page_key, title_id, title_en, site_title_id, site_title_en, default_og_image)
values
  ('global', 'DEV Situs', 'DEV Site', 'DEV — MGL', 'DEV — MGL', '/img/og-default.jpg'),
  ('home',   'DEV Beranda', 'DEV Home', null, null, null)
on conflict (page_key) do nothing;

insert into homepage (id, hero_h1a_id, hero_h1a_en, exp_cols)
values (1, 'DEV Judul', 'DEV Heading',
        '[{"n_id":"/01","n_en":"/01","h_id":"DEV Kolom","h_en":"DEV Column"}]'::jsonb)
on conflict (id) do nothing;

insert into about (id, hero_h1_accent_id, hero_h1_accent_en, principles)
values (1, 'DEV.', 'DEV.', '[{"pn":"/01","h_id":"DEV Prinsip","h_en":"DEV Principle"}]'::jsonb)
on conflict (id) do nothing;

insert into pricing (id, h1_lead_id, h1_lead_en, packages)
values (1, 'DEV Harga', 'DEV Pricing',
        '[{"key":"dev","name_id":"DEV Paket","name_en":"DEV Package"}]'::jsonb)
on conflict (id) do nothing;

-- Stats ----------------------------------------------------------------------
insert into stats (display_order, num, suffix, label_id, label_en) values
  (1, '10', '+', 'DEV Proyek', 'DEV Projects'),
  (2, '5',  '',  'DEV Tahun',  'DEV Years');

-- Services -------------------------------------------------------------------
insert into services (display_order, slug_id, slug_en, h_id, h_en, status) values
  (1, 'dev-layanan-1', 'dev-service-1', 'DEV Layanan 1', 'DEV Service 1', 'published'),
  (2, 'dev-layanan-2', 'dev-service-2', 'DEV Layanan 2', 'DEV Service 2', 'draft');

-- Projects (one of each status, to test RLS status filtering) -----------------
insert into projects (title, slug, category, year, featured, status, display_order, published_at) values
  ('DEV Published Project', 'dev-published', 'Web', 2026, true,  'published', 1, now()),
  ('DEV Draft Project',     'dev-draft',     'Web', 2026, false, 'draft',     2, null),
  ('DEV Archived Project',  'dev-archived',  'Web', 2025, false, 'archived',  3, null);

-- Project images (attached to the published + draft projects, to test that
-- images of a draft project are hidden by RLS) --------------------------------
insert into project_images (project_id, url, alt_id, alt_en, display_order)
select id, '/img/work/dev-1.webp', 'DEV alt', 'DEV alt', 1 from projects where slug = 'dev-published';
insert into project_images (project_id, url, alt_id, alt_en, display_order)
select id, '/img/work/dev-2.webp', 'DEV alt', 'DEV alt', 1 from projects where slug = 'dev-draft';

-- Experience -----------------------------------------------------------------
insert into experience (company, role_id, role_en, start_date, current_position, status, display_order) values
  ('DEV Company', 'DEV Peran', 'DEV Role', date '2024-01-01', true, 'published', 1);

-- Skills ---------------------------------------------------------------------
insert into skill_categories (name_id, name_en, slug, display_order) values
  ('DEV Desain', 'DEV Design', 'dev-design', 1),
  ('DEV Web',    'DEV Web',    'dev-web',    2);
insert into skills (category_id, name, display_order, is_visible)
select id, 'DEV Figma', 1, true from skill_categories where slug = 'dev-design';
insert into skills (category_id, name, display_order, is_visible)
select id, 'DEV Hidden Skill', 2, false from skill_categories where slug = 'dev-web';

-- Testimonials ---------------------------------------------------------------
insert into testimonials (name, role, company, quote_id, quote_en, featured, status, display_order) values
  ('DEV Client', 'DEV Role', 'DEV Co', 'DEV kutipan.', 'DEV quote.', true, 'published', 1),
  ('DEV Hidden', 'DEV Role', 'DEV Co', 'DEV draft.',  'DEV draft.',  false, 'draft',     2);

-- Blog -----------------------------------------------------------------------
insert into blog_categories (name, slug) values
  ('DEV Category', 'dev-category');
insert into blog_posts (title, slug, excerpt, content, category_id, author, status, published_at)
select 'DEV Published Post', 'dev-published-post', 'DEV excerpt', '<p>DEV body</p>', id, 'DEV', 'published', now()
  from blog_categories where slug = 'dev-category';
insert into blog_posts (title, slug, excerpt, content, category_id, author, status)
select 'DEV Draft Post', 'dev-draft-post', 'DEV excerpt', '<p>DEV body</p>', id, 'DEV', 'draft'
  from blog_categories where slug = 'dev-category';

-- Media ----------------------------------------------------------------------
insert into media (file_name, storage_path, public_url, mime_type, file_size, folder) values
  ('dev-sample.webp', 'general/dev-sample.webp',
   'https://example.com/dev-sample.webp', 'image/webp', 12345, 'general');
