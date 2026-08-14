// Field configs for the singleton page editors (About, Homepage, Site Settings).
// Grouped into sections that mirror the real page structure. Repeating blocks
// use the form engine's `repeater` type (no raw JSON editing).
import type { Field } from './form';

const bi = (name: string, label: string, type: 'text' | 'textarea' = 'text', section?: string): Field =>
  ({ name, label, type, bilingual: true, ...(section ? { section } : {}) });

// -------------------------------------------------------------------- ABOUT
export const aboutFields: Field[] = [
  bi('hero_eyebrow', 'Hero — eyebrow', 'text', 'Hero'),
  bi('hero_h1_before', 'Hero — judul (depan)', 'textarea'),
  bi('hero_h1_accent', 'Hero — judul (aksen)'),
  bi('hero_lead', 'Hero — intro', 'textarea'),
  bi('hero_photo_alt', 'Hero — alt foto'),
  { name: 'hero_image', label: 'Foto profil', type: 'image', imageFolder: 'site' },

  bi('story_eyebrow', 'Cerita — eyebrow', 'text', 'Cerita'),
  bi('story_title', 'Cerita — judul'),
  bi('story_read_case_label', 'Label "baca studi kasus"'),
  { name: 'story_paragraphs', label: 'Paragraf cerita', type: 'repeater', itemLabel: 'paragraf',
    itemFields: [
      { name: 'text', label: 'Teks', type: 'textarea', bilingual: true },
      { name: 'link', label: 'Slug studi kasus (opsional)', type: 'text' },
      { name: 'pull', label: 'Kutipan besar', type: 'boolean' },
    ] },

  bi('prin_eyebrow', 'Prinsip — eyebrow', 'text', 'Prinsip'),
  bi('prin_title', 'Prinsip — judul'),
  { name: 'principles', label: 'Daftar prinsip', type: 'repeater', itemLabel: 'prinsip',
    itemFields: [
      { name: 'pn', label: 'Nomor', type: 'text' },
      { name: 'h', label: 'Judul', type: 'text', bilingual: true },
      { name: 'p', label: 'Deskripsi', type: 'textarea', bilingual: true },
    ] },

  bi('chips_eyebrow', 'Keahlian — eyebrow', 'text', 'Bidang keahlian'),
  bi('chips_title', 'Keahlian — judul'),
  { name: 'chips', label: 'Bidang keahlian', type: 'repeater', itemLabel: 'bidang',
    itemFields: [
      { name: 'h', label: 'Judul', type: 'text', bilingual: true },
      { name: 'p', label: 'Deskripsi', type: 'textarea', bilingual: true },
    ] },

  bi('bound_eyebrow', 'Batasan — eyebrow', 'text', 'Yang tidak dikerjakan'),
  bi('bound_title_a', 'Batasan — judul baris 1'),
  bi('bound_title_b', 'Batasan — judul baris 2'),
  { name: 'boundaries', label: 'Daftar batasan', type: 'repeater', itemLabel: 'batasan',
    itemFields: [
      { name: 'h', label: 'Judul', type: 'text', bilingual: true },
      { name: 'p', label: 'Deskripsi', type: 'textarea', bilingual: true },
    ] },
  bi('bound_close_before', 'Batasan — penutup', 'textarea'),
  bi('bound_close_mark', 'Batasan — penutup (ditandai)'),

  bi('cta_title', 'CTA — judul', 'text', 'CTA'),
  bi('cta_btn', 'CTA — teks tombol'),
  bi('cta_wa', 'CTA — pesan WhatsApp', 'textarea'),
];

// ----------------------------------------------------------------- HOMEPAGE
export const homepageFields: Field[] = [
  bi('hero_eyebrow', 'Hero — eyebrow', 'text', 'Hero'),
  bi('hero_h1a', 'Hero — judul baris 1'),
  bi('hero_h1b', 'Hero — judul baris 2'),
  bi('hero_h1c', 'Hero — judul baris 3 (aksen)'),
  bi('hero_sub', 'Hero — subjudul'),
  bi('hero_lead_before', 'Hero — paragraf (sebelum highlight)', 'textarea'),
  bi('hero_lead_mark', 'Hero — kata highlight'),
  bi('hero_lead_after', 'Hero — paragraf (sesudah highlight)', 'textarea'),
  bi('hero_cta', 'Hero — teks tombol'),
  bi('hero_photo_alt', 'Hero — alt foto'),
  { name: 'hero_image', label: 'Foto hero', type: 'image', imageFolder: 'site' },
  { name: 'marquee_tools_id', label: 'Marquee tools (ID)', type: 'tags', hint: 'Pisahkan dengan koma.' },
  { name: 'marquee_tools_en', label: 'Marquee tools (EN)', type: 'tags' },

  bi('angle_eyebrow', 'Sudut Pandang — eyebrow', 'text', 'Sudut Pandang'),
  bi('angle_big_before', 'Judul (sebelum aksen)', 'textarea'),
  bi('angle_big_accent', 'Judul (aksen)'),
  bi('angle_p1', 'Paragraf 1', 'textarea'),
  bi('angle_p2', 'Paragraf 2', 'textarea'),
  bi('angle_close_before', 'Penutup (sebelum highlight)', 'textarea'),
  bi('angle_close_mark', 'Penutup (highlight)'),

  bi('exp_eyebrow', 'Keahlian — eyebrow', 'text', 'Keahlian (kolom)'),
  bi('exp_title', 'Keahlian — judul'),
  { name: 'exp_cols', label: 'Kolom keahlian', type: 'repeater', itemLabel: 'kolom',
    itemFields: [
      { name: 'n', label: 'Label', type: 'text', bilingual: true },
      { name: 'h', label: 'Judul', type: 'text', bilingual: true },
      { name: 'p', label: 'Deskripsi', type: 'textarea', bilingual: true },
    ] },

  bi('about_eyebrow', 'Teaser Tentang — eyebrow', 'text', 'Teaser Tentang'),
  bi('about_h2_before', 'Judul (sebelum aksen)', 'textarea'),
  bi('about_h2_accent', 'Judul (aksen)'),
  bi('about_lead', 'Paragraf', 'textarea'),
  bi('about_btn', 'Teks tombol'),

  bi('svc_eyebrow', 'Layanan — eyebrow', 'text', 'Layanan (baris)'),
  bi('svc_title', 'Layanan — judul'),
  bi('svc_best_label', 'Label "paling cocok"'),
  { name: 'svc_rows', label: 'Baris layanan', type: 'repeater', itemLabel: 'baris',
    itemFields: [
      { name: 'ico', label: 'Ikon (mis. *, **, ***)', type: 'text' },
      { name: 'h', label: 'Judul', type: 'text', bilingual: true },
      { name: 'p', label: 'Deskripsi', type: 'textarea', bilingual: true },
      { name: 'best', label: 'Paling cocok untuk', type: 'textarea', bilingual: true },
    ] },

  bi('proc_eyebrow', 'Proses — eyebrow', 'text', 'Proses'),
  bi('proc_title', 'Proses — judul'),
  bi('proc_lead', 'Proses — intro', 'textarea'),
  { name: 'proc_steps', label: 'Langkah proses', type: 'repeater', itemLabel: 'langkah',
    itemFields: [
      { name: 'h', label: 'Judul', type: 'text', bilingual: true },
      { name: 'p', label: 'Deskripsi', type: 'textarea', bilingual: true },
    ] },

  { name: 'marquee_accent_id', label: 'Marquee bawah (ID)', type: 'tags', section: 'Penutup' },
  { name: 'marquee_accent_en', label: 'Marquee bawah (EN)', type: 'tags' },
  bi('cta_title', 'CTA — judul'),
  bi('cta_btn', 'CTA — teks tombol'),
];

// ------------------------------------------------------------- SITE SETTINGS
export const settingsFields: Field[] = [
  { name: 'site_name', label: 'Nama situs', type: 'text', required: true, section: 'Kontak' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Nomor WhatsApp (angka, tanpa +)', type: 'text', hint: 'Contoh: 6285927277560' },
  { name: 'phone_display_id', label: 'Tampilan nomor (ID)', type: 'text' },
  { name: 'phone_display_en', label: 'Tampilan nomor (EN)', type: 'text' },
  { name: 'resume_url', label: 'URL CV/Resume', type: 'text', url: true },
  bi('wa_text', 'Pesan WhatsApp default', 'textarea', 'CTA & Footer'),
  bi('nav_cta', 'Teks tombol CTA'),
  bi('footer_blurb', 'Blurb footer', 'textarea'),
  bi('footer_tagline', 'Tagline footer'),
  bi('footer_rights', 'Hak cipta footer'),
];
