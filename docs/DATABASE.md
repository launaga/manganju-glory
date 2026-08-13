# MGL Portfolio — Database (Phase 3)

Supabase PostgreSQL foundation for the CMS. This document is the source of
truth for the schema; the database is fully reproducible from the migration
files in `supabase/migrations/`.

> Scope note: Phase 3 is **database only**. No admin UI, no login UI, no public
> frontend integration, no deployment. Those are Phase 4+.

---

## A. Schema summary

Bilingual content uses paired `_id` / `_en` columns. Singleton "page" content is
a single guarded row (`id = 1`) mixing scalar columns with `jsonb` for repeating
sub-blocks. Collections are normal relational tables with `content_status`
(`draft | published | archived`).

| Table | Kind | Purpose |
|---|---|---|
| `admin_users` | auth | Whitelist of user_ids allowed to manage the CMS. Drives `is_admin()`. |
| `site_settings` | singleton | Brand, contact, footer, social links (site chrome). |
| `seo_settings` | per-key | One row per page (`page_key`) + a `global` row with site-wide SEO defaults. |
| `homepage` | singleton | All homepage sections (hero → CTA). Repeaters in `jsonb`. |
| `about` | singleton | About page sections; story/principles/chips/boundaries in `jsonb`. |
| `pricing` | singleton | Pricing page; packages/factors/not_included/faq in `jsonb`. |
| `services` | collection | Service cards (bilingual, status). |
| `stats` | collection | The 3-number stat block (Home + About). |
| `projects` | collection | Portfolio projects (status, featured, ordering, SEO). |
| `project_images` | collection | Gallery images, FK → `projects` (cascade delete). |
| `experience` | collection | Work history (dates + manual order). |
| `skill_categories` | collection | Skill groups. |
| `skills` | collection | Skills, FK → `skill_categories`, `is_visible`. |
| `testimonials` | collection | Testimonials (status, featured, order). |
| `blog_categories` | collection | Blog categories. |
| `blog_posts` | collection | Articles (rich HTML `content`, status, SEO). |
| `media` | collection | File **metadata** only; binaries live in Storage. |

Every mutable table has `created_at` / `updated_at` (the latter auto-maintained
by the `set_updated_at()` trigger). PKs are `uuid` except singletons (`smallint`
`id = 1`) and `admin_users` (`user_id` = the auth user).

## B. Migration files

| File | Contents |
|---|---|
| `supabase/migrations/0001_initial_schema.sql` | Extensions, `content_status` enum, `set_updated_at()`, `admin_users` + `is_admin()`, all tables, constraints, indexes, triggers. |
| `supabase/migrations/0002_rls_policies.sql` | `enable row level security` on every table + admin/public policies. |
| `supabase/migrations/0003_storage.sql` | `media` storage bucket + object policies. |
| `supabase/migrations/0004_harden_functions.sql` | Moves `is_admin()` to a non-API `private` schema and pins `set_updated_at()` search_path — clears all Supabase security-linter warnings. |
| `supabase/seed.sql` | **DEV-only** sample data (not production content). |

Apply with the Supabase CLI (`supabase db reset` locally, or `supabase db push`
to a linked project) or via the dashboard SQL editor in file order.

## C. Relationship diagram

```
auth.users
    └──< admin_users            (is_admin() checks membership)

projects
    └──< project_images         (ON DELETE CASCADE — no orphans)

skill_categories
    └──< skills                 (ON DELETE SET NULL)

blog_categories
    └──< blog_posts             (ON DELETE SET NULL)

projects.featured = true  ──►  Homepage "Featured Projects" (derived, no FK/dupe)
```

Homepage/About never copy project or testimonial records — featured projects are
derived from `projects.featured`, keeping a single source of truth.

## D. RLS summary

RLS is enabled on **all** tables. Each table has an admin policy
(`for all using (is_admin())`) plus a public read policy:

| Access | Anonymous / non-admin authenticated | Admin (`is_admin()`) |
|---|---|---|
| Singletons, chrome, categories, media, stats | SELECT (read) | full CRUD |
| `projects`, `services`, `experience`, `testimonials`, `blog_posts` | SELECT only where `status = 'published'` | full CRUD (all statuses) |
| `skills` | SELECT only where `is_visible = true` | full CRUD |
| `project_images` | SELECT only where parent project is `published` | full CRUD |
| `admin_users` | no access | SELECT only (writes via service-role) |

**Protected operations:** every INSERT / UPDATE / DELETE requires `is_admin()`.
Anonymous and non-admin authenticated users can never write, publish, or read
draft/archived content. The static build uses the **anon key**, so drafts are
physically unreadable at build time.

## E. Storage architecture

- **Bucket:** `media` (public read).
- **Limits:** 5 MB/file; MIME `image/webp`, `image/jpeg`, `image/png`, `image/svg+xml`.
- **Folders (app convention):** `projects/ blog/ avatars/ logos/ og/ site/ general/`.
- **Policies:** public SELECT on the bucket; INSERT/UPDATE/DELETE require `is_admin()`.
- **Deletion:** app deletes the Storage object and the `media` row together and
  warns if the asset is still referenced.

## F. Seed data

`supabase/seed.sql` inserts **DEV-only** rows for every table (all labelled
`DEV` / `example.com`), including one published, one draft, and one archived
project so RLS status filtering can be verified. It intentionally omits real
personal data. The admin row is created in Phase 4 (needs a real auth user).

## G. Validation & security testing

Run against a database once migrations are applied (see the "Applying" section
below). Expected results:

1. Migrations apply cleanly, in order.
2. All 17 tables exist.
3. `project_images` FK cascade deletes gallery rows with their project.
4. Unique constraints reject duplicate slugs (`projects.slug`, `blog_posts.slug`, …).
5. `content_status` rejects values outside the enum.
6. RLS is enabled on every table (`pg_tables.rowsecurity = true`).
7. Anon can read only published/visible rows.
8. Anon INSERT/UPDATE/DELETE is rejected.
9. Authenticated-but-not-admin behaves like anon (read published only, no writes).
10. Admin can CRUD all statuses.
11. Draft & archived rows are invisible to anon; published rows are visible.
12. Storage: anon read ok; anon write rejected; admin write ok.
13. Supabase security advisor reports **zero** warnings after 0004.

Applied to the live project `xgkzaehzjsijgjhapkce` (all 4 migrations); 17 tables
created with RLS enabled on every one; advisor clean.

## H. Known issues / decisions

- **Blog is single-language** (per the Phase 2/3 spec field list). If bilingual
  blog is wanted later, add `*_id/_en` columns via a new migration.
- **Singletons are publicly readable**, so in-progress (unpublished) edits to
  homepage/about/pricing are visible via the API before a rebuild. Low risk for
  a portfolio (that content is destined to be public and the live site is static
  until re-published). A `published` snapshot column can be added later if needed.
- **Admin bootstrap** happens in Phase 4 — no admin exists until then.

---

## Applying (dev)

```bash
# Local stack
supabase start
supabase db reset          # runs migrations + seed.sql

# OR against a linked remote project
supabase link --project-ref <ref>
supabase db push           # migrations only (never pushes seed to prod)
```

## TypeScript types (prepared, not built yet)

Generate strongly-typed DB access for future Astro/admin code:

```bash
supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
```

(Do not add the admin UI yet — Phase 4+.)

## Real content migration (separate, reviewed step)

The existing site content in `src/data/*.json` and `src/content/**` can be
migrated into these tables 1:1:

| Source | → Target |
|---|---|
| `src/content/projects/*.json` (16) | `projects` (+ `project_images` for galleries) |
| `src/content/services/*.json` (5) | `services` |
| `src/data/home.json` | `homepage` |
| `src/data/about.json` | `about` |
| `src/data/pricing.json` | `pricing` |
| `src/data/stats.json` | `stats` |
| `src/data/settings.json` | `site_settings` |
| `src/data/seo/*.json` | `seo_settings` |

This is done as a reviewed one-off (a generated `insert` script from the JSON),
**after** the schema is approved and applied — never overwriting production data.
Tracked as part of Phase 7 (Astro integration).
