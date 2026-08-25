// Public content data layer — pure transforms from Supabase rows back into the
// exact JSON shapes the existing public components already consume. Using the
// keymap generated at migration time, this is the faithful inverse of the
// migration, so the rendered site is byte-identical to the pre-CMS site.
// Pure functions (no network) → unit-testable.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const keymap = JSON.parse(fs.readFileSync(path.join(here, '_keymap.json'), 'utf8'));

// Layout metadata belongs to the static presentation layer, not the CMS. Keep
// it here so a content export cannot silently remove intrinsic image sizes or
// the local case-study route.
const projectStatic = {
  'Eyelevel-id': { imageWidth: 470, imageHeight: 557 },
  AddedEducation: { imageWidth: 632, imageHeight: 637 },
  'Ipas Indonesia': { imageWidth: 947, imageHeight: 857 },
  'Jakarta Feminist': { imageWidth: 1200, imageHeight: 579, caseStudy: 'jakarta-feminist' },
  'Cari Layanan': { imageWidth: 861, imageHeight: 822 },
  'The Arise Foundation': { imageWidth: 945, imageHeight: 816 },
  'Project Nambo Udik': { imageWidth: 937, imageHeight: 822 },
  'Support Space': { imageWidth: 937, imageHeight: 817 },
  'Nikhil Bohra': { imageWidth: 941, imageHeight: 832 },
  'Farm Fresh Bites': { imageWidth: 1145, imageHeight: 750 },
  'Credit Health': { imageWidth: 1200, imageHeight: 675 },
  'Spotless Web App': { imageWidth: 1200, imageHeight: 580 },
  'Spotless Mobile App': { imageWidth: 537, imageHeight: 922 },
  'Spotless POS': { imageWidth: 1200, imageHeight: 529 },
  'Nusantara Rent': { imageWidth: 1200, imageHeight: 555 },
  Rasalokal: { imageWidth: 1200, imageHeight: 575 },
};

/** Singleton row (home/about/site_settings) → original JSON object. */
export function shapeSingleton(table, row) {
  const km = keymap[table] || {};
  const out = {};
  for (const [col, origKey] of Object.entries(km)) {
    // The first cPanel seed stored these two About repeaters under their
    // original JSON keys. Keep exports buildable until that production row is
    // saved again with the canonical CMS field names.
    const legacyCol = table === 'about'
      ? { principles: 'prin_items', boundaries: 'bound_items' }[col]
      : undefined;
    out[origKey] = row[col] ?? (legacyCol ? row[legacyCol] : undefined);
  }
  return out;
}

export const shapeSeo = (row) => ({
  title_id: row.title_id, title_en: row.title_en,
  desc_id: row.desc_id, desc_en: row.desc_en, ogImage: row.og_image,
});

export const shapeService = (r) => ({
  order: r.display_order, slug_id: r.slug_id, slug_en: r.slug_en,
  n_id: r.n_id, n_en: r.n_en, h_id: r.h_id, h_en: r.h_en,
  p_id: r.p_id, p_en: r.p_en, meta_id: r.meta_id, meta_en: r.meta_en,
});

export const shapeStats = (rows) => ({
  items: rows.map((r) => ({
    num: r.num, suffix: r.suffix,
    label_id: r.label_id, label_en: r.label_en, desc_id: r.desc_id, desc_en: r.desc_en,
  })),
});

// Project → content-collection JSON shape. Presentation-only metadata is
// restored from projectStatic while editable content comes from the CMS.
export const shapeProject = (r) => ({
  ...(projectStatic[r.title] ?? {}),
  order: r.display_order, featured: r.featured, name: r.title, url: r.project_url,
  tags: r.tags ?? [], image: r.cover_image,
  alt_id: r.cover_alt_id, alt_en: r.cover_alt_en,
  desc_id: r.short_description_id, desc_en: r.short_description_en,
  caseStudy: projectStatic[r.title]?.caseStudy ?? '',
});

export { keymap };
