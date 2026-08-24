import { api } from '../api';

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
  const p = new URLSearchParams();
  if (opts.search) p.set('search', opts.search);
  if (opts.searchColumns?.length) p.set('search_columns', opts.searchColumns.join(','));
  if (opts.filters) p.set('filters', JSON.stringify(opts.filters));
  if (opts.order) { p.set('order', opts.order.column); p.set('ascending', String(opts.order.ascending ?? true)); }
  if (opts.limit) p.set('limit', String(opts.limit));
  return (await api<{ data: Row[] }>(`/content/${encodeURIComponent(table)}?${p}`)).data;
}

export async function getOne(table: string, id: string): Promise<Row | null> {
  return (await api<{ data: Row | null }>(`/content/${encodeURIComponent(table)}/${encodeURIComponent(id)}`)).data;
}

/** Fetch a singleton row (about/homepage/site_settings) at id=1. */
export async function getSingleton(table: string): Promise<Row | null> {
  return getOne(table, '1');
}

export async function insert(table: string, row: Row): Promise<Row> {
  return (await api<{ data: Row }>(`/content/${encodeURIComponent(table)}`, { method: 'POST', body: JSON.stringify(row) })).data;
}

export async function update(table: string, id: string, patch: Row): Promise<Row> {
  return (await api<{ data: Row }>(`/content/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })).data;
}

/** Upsert a singleton (id=1). */
export async function saveSingleton(table: string, patch: Row): Promise<Row> {
  return (await api<{ data: Row }>(`/content/${encodeURIComponent(table)}/1`, { method: 'PUT', body: JSON.stringify({ id: 1, ...patch }) })).data;
}

export async function remove(table: string, id: string): Promise<void> {
  await api(`/content/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Set status; stamps published_at on first publish (tables that have it). */
export async function setStatus(table: string, id: string, status: Status, hasPublishedAt = true): Promise<Row> {
  const patch: Row = { status };
  if (hasPublishedAt && status === 'published') patch.published_at = new Date().toISOString();
  return update(table, id, patch);
}

/** True if `slug` already exists in `table` (optionally excluding a row id). */
export async function slugExists(table: string, slug: string, excludeId?: string): Promise<boolean> {
  const p = new URLSearchParams({ slug }); if (excludeId) p.set('exclude_id', excludeId);
  return (await api<{ exists: boolean }>(`/content/${encodeURIComponent(table)}/slug-exists?${p}`)).exists;
}

/** Persist a new display_order for a set of ids (used by reordering). */
export async function reorder(table: string, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => update(table, id, { display_order: i + 1 })));
}

/** Next display_order for appending a new row. */
export async function nextOrder(table: string): Promise<number> {
  const rows = await list(table, { order: { column: 'display_order', ascending: false }, limit: 1 });
  return (rows[0]?.display_order ?? 0) + 1;
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

export async function uploadImage(file: File, folder = 'general'): Promise<string> {
  const form = new FormData(); form.append('file', file); form.append('folder', folder);
  return (await api<{ data: { public_url: string } }>('/media', { method: 'POST', body: form })).data.public_url;
}
