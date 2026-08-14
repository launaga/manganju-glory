-- ============================================================================
-- MGL Portfolio CMS — 0003 Storage
--
-- One public bucket `media` for all site imagery. Public READ (needed so the
-- static site and public URLs work), but WRITE/UPDATE/DELETE only for admins.
-- Folder convention (enforced by app, not DB): projects/ blog/ avatars/
-- logos/ og/ site/ general/.
-- ============================================================================

-- Create the bucket (idempotent). 5 MB/file cap; image types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,  -- 5 MB
  array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects is enabled by Supabase by default; define policies.

-- Public read of everything in the media bucket.
create policy media_objects_public_read on storage.objects
  for select using (bucket_id = 'media');

-- Admin-only writes. Schema-qualify is_admin() since these policies live in the
-- storage schema, where public may not be on the search_path.
create policy media_objects_admin_insert on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

create policy media_objects_admin_update on storage.objects
  for update using (bucket_id = 'media' and public.is_admin())
             with check (bucket_id = 'media' and public.is_admin());

create policy media_objects_admin_delete on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
