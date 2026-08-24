import { api } from '../api';
import { friendlyError } from './db';

export const BUCKET = 'media';
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (matches bucket limit)
export const ALLOWED_MIME = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'];
export const FOLDERS = ['projects', 'blog', 'avatars', 'logos', 'site', 'general'] as const;
export type Folder = (typeof FOLDERS)[number];

export interface MediaItem {
  id: string; file_name: string; storage_path: string; public_url: string;
  mime_type: string | null; file_size: number | null; width: number | null; height: number | null;
  alt_id: string | null; alt_en: string | null; folder: string; created_at: string;
}

export interface ListMediaOpts { search?: string; folder?: string; sort?: 'newest' | 'oldest' | 'name'; }

export async function listMedia(opts: ListMediaOpts = {}): Promise<MediaItem[]> {
  const p = new URLSearchParams();
  if (opts.folder && opts.folder !== 'all') p.set('folder', opts.folder);
  if (opts.search) p.set('search', opts.search);
  if (opts.sort) p.set('sort', opts.sort);
  return (await api<{ data: MediaItem[] }>(`/media?${p}`)).data;
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
  const form = new FormData();
  form.append('file', file); form.append('folder', folder);
  form.append('width', String(width ?? '')); form.append('height', String(height ?? ''));
  form.append('clean_name', clean);
  return (await api<{ data: MediaItem }>('/media', { method: 'POST', body: form })).data;
}

export async function updateMediaMeta(id: string, patch: { alt_id?: string; alt_en?: string; folder?: string }): Promise<void> {
  await api(`/media/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
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
  return (await api<{ data: Reference[] }>(`/media/references?url=${encodeURIComponent(url)}`)).data;
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
  await api(`/media/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
  ta.select(); document.execCommand('copy'); ta.remove();
}

export { friendlyError };
