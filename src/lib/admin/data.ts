// Read-only dashboard data access. Full CRUD comes in Phase 6. Counts use
// head:true (no rows transferred). RLS applies — an admin session sees all
// statuses. Errors are surfaced as thrown values for the UI's error state.
import { api } from '../api';

export interface DashboardCounts {
  projects: number;
  experience: number;
  blog_posts: number;
  testimonials: number;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  return (await api<{ data: DashboardCounts }>('/dashboard/counts')).data;
}

export interface RecentItem {
  type: 'Proyek' | 'Artikel' | 'Testimoni' | 'Pengalaman';
  title: string;
  updated_at: string;
  href: string;
}

/** Most recently updated content across the main collections. */
export async function getRecentlyUpdated(limit = 6): Promise<RecentItem[]> {
  return (await api<{ data: RecentItem[] }>(`/dashboard/recent?limit=${limit}`)).data;
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
