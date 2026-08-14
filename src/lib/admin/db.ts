// Central data-access layer for the CMS. Every admin query/mutation goes
// through here (no scattered Supabase calls in UI). RLS enforces authorization
// server-side — these helpers never use the service-role key.
import { supabase } from '../supabase';

export type Status = 'draft' | 'published' | 'archived';
export type Row = Record<string, any>;

export interface ListOpts {
  search?: string;
  searchColumns?: string[];
  filters?: Record<string, string | boolean | number | undefined>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

/** Turn a raw Supabase/network error into a friendly Bahasa Indonesia message. */
export function friendlyError(err: any): string {
  const msg = String(err?.message ?? err ?? '');
  const code = err?.code;
  if (code === '23505' || /duplicate key|already exists/i.test(msg)) return 'Slug sudah dipakai. Pilih slug lain.';
  if (code === '23514' || /violates check constraint/i.test(msg)) return 'Ada nilai yang tidak valid.';
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Anda tidak memiliki izin untuk tindakan ini.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Gangguan jaringan. Coba lagi.';
  if (/JWT|token|not authenticated/i.test(msg)) return 'Sesi berakhir. Silakan masuk kembali.';
  return 'Terjadi kesalahan. Coba lagi.';
}

export async function list(table: string, opts: ListOpts = {}): Promise<Row[]> {
  let q = supabase.from(table).select('*');
  if (opts.filters) {
    for (const [k, v] of Object.entries(opts.filters)) {
      if (v !== undefined && v !== '' && v !== 'all') q = q.eq(k, v as any);
    }
  }
  if (opts.search && opts.searchColumns?.length) {
    const term = opts.search.replace(/[%,()]/g, ' ').trim();
    if (term) q = q.or(opts.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(','));
  }
  if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getOne(table: string, id: string): Promise<Row | null> {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Fetch a singleton row (about/homepage/site_settings) at id=1. */
export async function getSingleton(table: string): Promise<Row | null> {
  const { data, error } = await supabase.from(table).select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insert(table: string, row: Row): Promise<Row> {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function update(table: string, id: string, patch: Row): Promise<Row> {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/** Upsert a singleton (id=1). */
export async function saveSingleton(table: string, patch: Row): Promise<Row> {
  const { data, error } = await supabase.from(table).upsert({ id: 1, ...patch }).select().single();
  if (error) throw error;
  return data;
}

export async function remove(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/** Set status; stamps published_at on first publish (tables that have it). */
export async function setStatus(table: string, id: string, status: Status, hasPublishedAt = true): Promise<Row> {
  const patch: Row = { status };
  if (hasPublishedAt && status === 'published') patch.published_at = new Date().toISOString();
  return update(table, id, patch);
}

/** True if `slug` already exists in `table` (optionally excluding a row id). */
export async function slugExists(table: string, slug: string, excludeId?: string): Promise<boolean> {
  let q = supabase.from(table).select('id').eq('slug', slug).limit(1);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Persist a new display_order for a set of ids (used by reordering). */
export async function reorder(table: string, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => update(table, id, { display_order: i + 1 })));
}

/** Next display_order for appending a new row. */
export async function nextOrder(table: string): Promise<number> {
  const { data, error } = await supabase.from(table).select('display_order').order('display_order', { ascending: false }).limit(1);
  if (error) throw error;
  return (data?.[0]?.display_order ?? 0) + 1;
}

/** slugify("MGL Portfolio Redesign") -> "mgl-portfolio-redesign" */
export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// --- Storage (minimal, safe; full Media Library is Phase 7) ------------------
const BUCKET = 'media';

/** Upload an image to Supabase Storage and record it in `media`. Returns URL. */
export async function uploadImage(file: File, folder = 'general'): Promise<string> {
  const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const path = `${folder}/${Date.now()}-${clean}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = data.publicUrl;
  // best-effort metadata row (non-fatal)
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('media').insert({
      file_name: clean, storage_path: path, public_url: url,
      mime_type: file.type, file_size: file.size, folder, uploaded_by: u.user?.id ?? null,
    });
  } catch { /* metadata is convenience, not correctness */ }
  return url;
}
