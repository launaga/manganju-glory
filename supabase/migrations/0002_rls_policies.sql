-- ============================================================================
-- MGL Portfolio CMS — 0002 Row Level Security
--
-- Model:
--   • Anonymous / non-admin authenticated  → read PUBLIC content only.
--   • Admin (is_admin() = true)             → full read/write on everything.
--   • Writes are NEVER allowed to anon or to non-admin authenticated users.
--
-- "Public content" =
--   • singletons & site chrome (site_settings, seo_settings, homepage, about,
--     pricing, stats, skill_categories, blog_categories, media): readable.
--   • status-based collections (projects, services, experience, testimonials,
--     blog_posts): readable only when status = 'published'.
--   • skills: readable only when is_visible = true.
--   • project_images: readable only when the parent project is published.
--
-- The static site build reads with the ANON key, so drafts/archived rows are
-- physically unreadable at build time and cannot leak into the public HTML.
-- ============================================================================

-- Enable RLS everywhere.
alter table admin_users      enable row level security;
alter table site_settings    enable row level security;
alter table seo_settings     enable row level security;
alter table homepage         enable row level security;
alter table about            enable row level security;
alter table pricing          enable row level security;
alter table services         enable row level security;
alter table stats            enable row level security;
alter table projects         enable row level security;
alter table project_images   enable row level security;
alter table experience       enable row level security;
alter table skill_categories enable row level security;
alter table skills           enable row level security;
alter table testimonials     enable row level security;
alter table blog_categories  enable row level security;
alter table blog_posts       enable row level security;
alter table media            enable row level security;

-- ---------------------------------------------------------------------------
-- admin_users: only admins may read the roster. No client writes at all —
-- the first admin is inserted with the service-role key (which bypasses RLS).
-- ---------------------------------------------------------------------------
create policy admin_users_admin_read on admin_users
  for select using (is_admin());

-- ---------------------------------------------------------------------------
-- Helper note: each table gets
--   (1) an admin "for all" policy  → full CRUD for admins
--   (2) a public "for select" policy → the read rule for everyone else
-- Multiple permissive policies are OR-ed, so admins always win on SELECT.
-- ---------------------------------------------------------------------------

-- Singletons & always-readable chrome -----------------------------------------
create policy site_settings_admin on site_settings for all
  using (is_admin()) with check (is_admin());
create policy site_settings_read on site_settings for select using (true);

create policy seo_settings_admin on seo_settings for all
  using (is_admin()) with check (is_admin());
create policy seo_settings_read on seo_settings for select using (true);

create policy homepage_admin on homepage for all
  using (is_admin()) with check (is_admin());
create policy homepage_read on homepage for select using (true);

create policy about_admin on about for all
  using (is_admin()) with check (is_admin());
create policy about_read on about for select using (true);

create policy pricing_admin on pricing for all
  using (is_admin()) with check (is_admin());
create policy pricing_read on pricing for select using (true);

create policy stats_admin on stats for all
  using (is_admin()) with check (is_admin());
create policy stats_read on stats for select using (true);

create policy skill_categories_admin on skill_categories for all
  using (is_admin()) with check (is_admin());
create policy skill_categories_read on skill_categories for select using (true);

create policy blog_categories_admin on blog_categories for all
  using (is_admin()) with check (is_admin());
create policy blog_categories_read on blog_categories for select using (true);

create policy media_admin on media for all
  using (is_admin()) with check (is_admin());
create policy media_read on media for select using (true);

-- Status-based collections ----------------------------------------------------
create policy projects_admin on projects for all
  using (is_admin()) with check (is_admin());
create policy projects_read on projects for select
  using (status = 'published');

create policy services_admin on services for all
  using (is_admin()) with check (is_admin());
create policy services_read on services for select
  using (status = 'published');

create policy experience_admin on experience for all
  using (is_admin()) with check (is_admin());
create policy experience_read on experience for select
  using (status = 'published');

create policy testimonials_admin on testimonials for all
  using (is_admin()) with check (is_admin());
create policy testimonials_read on testimonials for select
  using (status = 'published');

create policy blog_posts_admin on blog_posts for all
  using (is_admin()) with check (is_admin());
create policy blog_posts_read on blog_posts for select
  using (status = 'published');

-- skills: visibility flag instead of full status ------------------------------
create policy skills_admin on skills for all
  using (is_admin()) with check (is_admin());
create policy skills_read on skills for select
  using (is_visible = true);

-- project_images: visibility follows the parent project -----------------------
create policy project_images_admin on project_images for all
  using (is_admin()) with check (is_admin());
create policy project_images_read on project_images for select
  using (exists (
    select 1 from projects p
    where p.id = project_images.project_id
      and p.status = 'published'
  ));
