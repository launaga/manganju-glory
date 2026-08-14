// Media Library data layer. Files live in the Phase 3 `media` Storage bucket
// (public read, admin-only write); metadata lives in the `media` table. No new
// bucket, no duplicate table, no base64-in-DB. RLS/Storage policies enforce
// authorization — never the service-role key.
import { supabase } from '../supabase';
import { friendlyError } from './db';

export const BUCKET = 'media';
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (matches bucket limit)
export const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'image/svg+xml'];
export const FOLDERS = ['projects', 'blog', 'avatars', 'logos', 'site', 'general'] as const;
export type Folder = (typeof FOLDERS)[number];

export interface MediaItem {
  id: string; file_name: string; storage_path: string; public_url: string;
  mime_type: string | null; file_size: number | null; width: number | null; height: number | null;
  alt_id: string | null; alt_en: string | null; folder: string; created_at: string;
}

export interface ListMediaOpts { search?: string; folder?: string; sort?: 'newest' | 'oldest' | 'name'; }

export async function listMedia(opts: ListMediaOpts = {}): Promise<MediaItem[]> {
  let q = supabase.from('media').select('*');
  if (opts.folder && opts.folder !== 'all') q = q.eq('folder', opts.folder);
  if (opts.search?.trim()) {
    const t = opts.search.replace(/[%,()]/g, ' ').trim();
    q = q.or(`file_name.ilike.%${t}%,alt_id.ilike.%${t}%,alt_en.ilike.%${t}%`);
  }
  if (opts.sort === 'name') q = q.order('file_name', { ascending: true });
  else q = q.order('created_at', { ascending: opts.sort === 'oldest' });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) return `Tipe tidak didukung: ${file.name}`;
  if (file.size > MAX_BYTES) return `Terlalu besar (maks 5 MB): ${file.name}`;
  return null;
}

/** Read intrinsic dimensions client-side (best effort; SVG may return 0). */
export function imageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: null, height: null }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** Upload one file: validate → dims → unique path → Storage → metadata row.
 *  Rolls back the storage object if the metadata insert fails (no orphans). */
export async function uploadOne(file: File, folder: Folder = 'general'): Promise<MediaItem> {
  const bad = validateFile(file);
  if (bad) throw new Error(bad);
  const { width, height } = await imageDimensions(file);
  const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase().slice(0, 100);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${clean}`;

  const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false });
  if (up.error) throw up.error;
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('media').insert({
    file_name: clean, storage_path: path, public_url: publicUrl,
    mime_type: file.type, file_size: file.size, width, height, folder, uploaded_by: u.user?.id ?? null,
  }).select().single();

  if (error) {
    // rollback the orphaned storage object
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw error;
  }
  return data as MediaItem;
}

export async function updateMediaMeta(id: string, patch: { alt_id?: string; alt_en?: string; folder?: string }): Promise<void> {
  const { error } = await supabase.from('media').update(patch).eq('id', id);
  if (error) throw error;
}

// Columns across the CMS that can reference a media URL. Used to block unsafe
// deletion of an image that is still in use.
const REFERENCE_COLUMNS: { table: string; column: string; label: string }[] = [
  { table: 'projects', column: 'cover_image', label: 'Proyek (sampul)' },
  { table: 'project_images', column: 'url', label: 'Galeri proyek' },
  { table: 'blog_posts', column: 'featured_image', label: 'Artikel blog' },
  { table: 'testimonials', column: 'avatar', label: 'Testimoni' },
  { table: 'experience', column: 'company_logo', label: 'Pengalaman' },
  { table: 'about', column: 'hero_image', label: 'Halaman Tentang' },
  { table: 'homepage', column: 'hero_image', label: 'Homepage' },
];

export interface Reference { label: string; count: number; }

/** Where (if anywhere) this URL is currently used across the CMS. */
export async function findReferences(url: string): Promise<Reference[]> {
  const checks = await Promise.all(
    REFERENCE_COLUMNS.map(async (rc) => {
      const { count, error } = await supabase.from(rc.table).select('*', { count: 'exact', head: true }).eq(rc.column, url);
      if (error) return { label: rc.label, count: 0 };
      return { label: rc.label, count: count ?? 0 };
    })
  );
  return checks.filter((c) => c.count > 0);
}

/** Delete media safely: block if referenced; else remove Storage object then
 *  metadata row. If Storage removal fails, the DB row is kept (no dangling row
 *  pointing at a deleted file is created without the file actually gone). */
export async function deleteMedia(item: MediaItem): Promise<void> {
  const refs = await findReferences(item.public_url);
  if (refs.length > 0) {
    const total = refs.reduce((n, r) => n + r.count, 0);
    const err: any = new Error(`Digunakan oleh ${total} konten`);
    err.references = refs;
    throw err;
  }
  const rm = await supabase.storage.from(BUCKET).remove([item.storage_path]);
  if (rm.error) throw rm.error;
  const { error } = await supabase.from('media').delete().eq('id', item.id);
  if (error) throw error;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
  ta.select(); document.execCommand('copy'); ta.remove();
}

export { friendlyError };
