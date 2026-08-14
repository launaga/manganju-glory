// Read-only dashboard data access. Full CRUD comes in Phase 6. Counts use
// head:true (no rows transferred). RLS applies — an admin session sees all
// statuses. Errors are surfaced as thrown values for the UI's error state.
import { supabase } from '../supabase';

export interface DashboardCounts {
  projects: number;
  experience: number;
  blog_posts: number;
  testimonials: number;
}

async function count(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [projects, experience, blog_posts, testimonials] = await Promise.all([
    count('projects'),
    count('experience'),
    count('blog_posts'),
    count('testimonials'),
  ]);
  return { projects, experience, blog_posts, testimonials };
}

export interface RecentItem {
  type: 'Proyek' | 'Artikel' | 'Testimoni' | 'Pengalaman';
  title: string;
  updated_at: string;
  href: string;
}

/** Most recently updated content across the main collections. */
export async function getRecentlyUpdated(limit = 6): Promise<RecentItem[]> {
  const q = (table: string, cols: string) =>
    supabase.from(table).select(cols).order('updated_at', { ascending: false }).limit(limit);

  const [p, b, t, e] = await Promise.all([
    q('projects', 'title, updated_at'),
    q('blog_posts', 'title, updated_at'),
    q('testimonials', 'name, updated_at'),
    q('experience', 'company, updated_at'),
  ]);
  for (const r of [p, b, t, e]) if (r.error) throw r.error;

  const items: RecentItem[] = [
    ...(p.data ?? []).map((r: any) => ({ type: 'Proyek' as const, title: r.title, updated_at: r.updated_at, href: '/admin/projects' })),
    ...(b.data ?? []).map((r: any) => ({ type: 'Artikel' as const, title: r.title, updated_at: r.updated_at, href: '/admin/blog' })),
    ...(t.data ?? []).map((r: any) => ({ type: 'Testimoni' as const, title: r.name, updated_at: r.updated_at, href: '/admin/testimonials' })),
    ...(e.data ?? []).map((r: any) => ({ type: 'Pengalaman' as const, title: r.company, updated_at: r.updated_at, href: '/admin/experience' })),
  ];
  return items
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, limit);
}

/** "2 jam lalu" style relative time in Bahasa Indonesia. */
export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - +new Date(iso)) / 1000));
  const u: [number, string][] = [
    [60, 'detik'], [60, 'menit'], [24, 'jam'], [7, 'hari'], [4.35, 'minggu'], [12, 'bulan'], [Infinity, 'tahun'],
  ];
  let v = s, i = 0;
  for (; i < u.length && v >= u[i][0]; i++) v /= u[i][0];
  return `${Math.floor(v)} ${u[i]?.[1] ?? 'tahun'} lalu`;
}
