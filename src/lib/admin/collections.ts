// Declarative config for each collection content type. Pages stay tiny: they
// import a config and hand it to renderList / initEditor. This is the single
// CMS pattern reused across Projects, Experience, Testimonials, Blog, Skills.
import type { Field } from './form';
import type { ListConfig } from './list';
import type { EditorConfig } from './editor';
import { esc, statusBadge } from './list';

const STATUS_FILTER = {
  name: 'status', label: 'Status',
  options: [
    { value: 'published', label: 'Terbit' },
    { value: 'draft', label: 'Draf' },
    { value: 'archived', label: 'Arsip' },
  ],
};
const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// ---------------------------------------------------------------- PROJECTS
export const projectFields: Field[] = [
  { name: 'title', label: 'Judul proyek', type: 'text', required: true, section: 'Umum' },
  { name: 'slug', label: 'Slug', type: 'slug', required: true, slugFrom: 'title', slugTable: 'projects', hint: 'Bagian URL. Otomatis dari judul, bisa diedit.' },
  { name: 'category', label: 'Kategori', type: 'text', hint: 'Mis. Web, Branding.' },
  { name: 'year', label: 'Tahun', type: 'number' },
  { name: 'client', label: 'Klien / perusahaan', type: 'text' },
  { name: 'project_url', label: 'URL situs', type: 'text', url: true, hint: 'Harus diawali http:// atau https://' },
  { name: 'tags', label: 'Tags', type: 'tags', hint: 'Pisahkan dengan koma.' },
  { name: 'featured', label: 'Jadikan Karya Pilihan (featured)', type: 'boolean' },
  { name: 'cover_image', label: 'Gambar sampul', type: 'image', imageFolder: 'projects', section: 'Media' },
  { name: 'cover_alt', label: 'Alt text sampul', type: 'text', bilingual: true, hint: 'Deskripsi gambar untuk aksesibilitas & SEO.' },
  { name: 'short_description', label: 'Deskripsi singkat', type: 'textarea', bilingual: true, section: 'Konten' },
  { name: 'description', label: 'Deskripsi lengkap', type: 'textarea', bilingual: true },
  { name: 'seo_title', label: 'SEO title', type: 'text', section: 'SEO', maxLength: 70 },
  { name: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 180 },
];
export const projectListConfig: ListConfig = {
  table: 'projects', title: 'Proyek',
  columns: [
    { key: 'cover_image', label: '', render: (r) => r.cover_image ? `<img class="cell-thumb" src="${esc(r.cover_image)}" alt="">` : '<span class="cell-thumb ph"></span>' },
    { key: 'title', label: 'Judul', render: (r) => `<strong>${esc(r.title)}</strong>${r.featured ? ' <span class="badge badge-published" style="background:#eef;color:#3a3ad6">Pilihan</span>' : ''}` },
    { key: 'category', label: 'Kategori' },
    { key: 'year', label: 'Tahun' },
    { key: 'updated_at', label: 'Diperbarui', render: (r) => esc(fmtDate(r.updated_at)) },
  ],
  searchColumns: ['title', 'category', 'client'],
  filters: [STATUS_FILTER, { name: 'featured', label: 'Featured', options: [{ value: 'true', label: 'Ya' }, { value: 'false', label: 'Tidak' }] }],
  defaultOrder: { column: 'display_order', ascending: true },
  hasStatus: true, hasPublishedAt: true, reorderable: false,
  newHref: '/admin/projects/new',
  editHref: (r) => `/admin/projects/edit?id=${r.id}`,
  rowLabel: (r) => r.title,
};
export const projectEditorConfig: EditorConfig = {
  table: 'projects', fields: projectFields, listHref: '/admin/projects',
  hasStatus: true, hasPublishedAt: true,
  createDefaults: { tags: [], featured: false },
  rowLabel: (v) => v.title, editHref: (id) => `/admin/projects/edit?id=${id}`,
  previewHref: () => null,
};

// -------------------------------------------------------------- EXPERIENCE
export const experienceFields: Field[] = [
  { name: 'company', label: 'Perusahaan', type: 'text', required: true },
  { name: 'role', label: 'Peran / jabatan', type: 'text', bilingual: true },
  { name: 'location', label: 'Lokasi', type: 'text' },
  { name: 'start_date', label: 'Mulai', type: 'date' },
  { name: 'end_date', label: 'Selesai', type: 'date', hint: 'Kosongkan bila masih berlangsung.' },
  { name: 'current_position', label: 'Posisi saat ini (tampil "Sekarang")', type: 'boolean' },
  { name: 'company_logo', label: 'Logo perusahaan', type: 'image', imageFolder: 'logos' },
  { name: 'description', label: 'Deskripsi', type: 'textarea', bilingual: true },
];
export const experienceListConfig: ListConfig = {
  table: 'experience', title: 'Pengalaman',
  columns: [
    { key: 'company', label: 'Perusahaan', render: (r) => `<strong>${esc(r.company)}</strong>` },
    { key: 'role_id', label: 'Peran' },
    { key: 'period', label: 'Periode', render: (r) => esc(`${fmtDate(r.start_date)} — ${r.current_position ? 'Sekarang' : fmtDate(r.end_date)}`) },
  ],
  searchColumns: ['company', 'role_id', 'role_en'],
  filters: [STATUS_FILTER],
  defaultOrder: { column: 'display_order', ascending: true },
  hasStatus: true, hasPublishedAt: false, reorderable: true,
  newHref: '/admin/experience/new',
  editHref: (r) => `/admin/experience/edit?id=${r.id}`,
  rowLabel: (r) => r.company,
};
export const experienceEditorConfig: EditorConfig = {
  table: 'experience', fields: experienceFields, listHref: '/admin/experience',
  hasStatus: true, hasPublishedAt: false, reorderable: true,
  createDefaults: { current_position: false },
  rowLabel: (v) => v.company, editHref: (id) => `/admin/experience/edit?id=${id}`,
};

// ------------------------------------------------------------- TESTIMONIALS
export const testimonialFields: Field[] = [
  { name: 'name', label: 'Nama', type: 'text', required: true },
  { name: 'role', label: 'Peran', type: 'text' },
  { name: 'company', label: 'Perusahaan', type: 'text' },
  { name: 'avatar', label: 'Foto / avatar', type: 'image', imageFolder: 'avatars' },
  { name: 'featured', label: 'Tampilkan sebagai unggulan', type: 'boolean' },
  { name: 'quote', label: 'Testimoni', type: 'textarea', bilingual: true, required: true },
];
export const testimonialListConfig: ListConfig = {
  table: 'testimonials', title: 'Testimoni',
  columns: [
    { key: 'avatar', label: '', render: (r) => r.avatar ? `<img class="cell-thumb round" src="${esc(r.avatar)}" alt="">` : '<span class="cell-thumb round ph"></span>' },
    { key: 'name', label: 'Nama', render: (r) => `<strong>${esc(r.name)}</strong>${r.featured ? ' ★' : ''}` },
    { key: 'company', label: 'Perusahaan' },
    { key: 'quote_id', label: 'Kutipan', render: (r) => esc(String(r.quote_id ?? '').slice(0, 60)) + (String(r.quote_id ?? '').length > 60 ? '…' : '') },
  ],
  searchColumns: ['name', 'company', 'quote_id'],
  filters: [STATUS_FILTER],
  defaultOrder: { column: 'display_order', ascending: true },
  hasStatus: true, hasPublishedAt: false, reorderable: true,
  newHref: '/admin/testimonials/new',
  editHref: (r) => `/admin/testimonials/edit?id=${r.id}`,
  rowLabel: (r) => r.name,
};
export const testimonialEditorConfig: EditorConfig = {
  table: 'testimonials', fields: testimonialFields, listHref: '/admin/testimonials',
  hasStatus: true, hasPublishedAt: false, reorderable: true,
  createDefaults: { featured: false },
  rowLabel: (v) => v.name, editHref: (id) => `/admin/testimonials/edit?id=${id}`,
};

// ---------------------------------------------------------------------- BLOG
export function blogFields(categories: { value: string; label: string }[]): Field[] {
  return [
    { name: 'title', label: 'Judul', type: 'text', required: true, section: 'Umum' },
    { name: 'slug', label: 'Slug', type: 'slug', required: true, slugFrom: 'title', slugTable: 'blog_posts' },
    { name: 'category_id', label: 'Kategori', type: 'select', options: [{ value: '', label: '— Tanpa kategori —' }, ...categories] },
    { name: 'author', label: 'Penulis', type: 'text' },
    { name: 'featured_image', label: 'Gambar utama', type: 'image', imageFolder: 'blog', section: 'Media' },
    { name: 'excerpt', label: 'Ringkasan', type: 'textarea', hint: 'Tampil di daftar artikel & hasil pencarian.', section: 'Konten' },
    { name: 'content', label: 'Isi artikel', type: 'richtext' },
    { name: 'seo_title', label: 'SEO title', type: 'text', section: 'SEO', maxLength: 70 },
    { name: 'seo_description', label: 'SEO description', type: 'textarea', maxLength: 180 },
  ];
}
export const blogListConfig = (categories: { value: string; label: string }[]): ListConfig => ({
  table: 'blog_posts', title: 'Blog',
  columns: [
    { key: 'featured_image', label: '', render: (r) => r.featured_image ? `<img class="cell-thumb" src="${esc(r.featured_image)}" alt="">` : '<span class="cell-thumb ph"></span>' },
    { key: 'title', label: 'Judul', render: (r) => `<strong>${esc(r.title)}</strong>` },
    { key: 'published_at', label: 'Terbit', render: (r) => esc(fmtDate(r.published_at)) },
    { key: 'updated_at', label: 'Diperbarui', render: (r) => esc(fmtDate(r.updated_at)) },
  ],
  searchColumns: ['title', 'excerpt'],
  filters: [STATUS_FILTER, ...(categories.length ? [{ name: 'category_id', label: 'Kategori', options: categories }] : [])],
  defaultOrder: { column: 'updated_at', ascending: false },
  hasStatus: true, hasPublishedAt: true, reorderable: false,
  newHref: '/admin/blog/new',
  editHref: (r) => `/admin/blog/edit?id=${r.id}`,
  rowLabel: (r) => r.title,
});
export const blogEditorConfig = (categories: { value: string; label: string }[]): EditorConfig => ({
  table: 'blog_posts', fields: blogFields(categories), listHref: '/admin/blog',
  hasStatus: true, hasPublishedAt: true,
  createDefaults: {},
  rowLabel: (v) => v.title, editHref: (id) => `/admin/blog/edit?id=${id}`,
  previewHref: () => null,
});
