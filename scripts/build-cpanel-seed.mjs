import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const files = (rel) => fs.readdirSync(path.join(root, rel)).filter((f) => f.endsWith('.json')).sort();
const snake = (key) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const singletonOverrides = { about: { prin_items: 'principles', bound_items: 'boundaries' } };
const singleton = (table, obj) => Object.fromEntries(Object.entries(obj).map(([key, value]) => [
  singletonOverrides[table]?.[key] ?? snake(key),
  value,
]));
const slugify = (value) => String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const seed = {
  homepage: [{ id: '1', ...singleton('homepage', read('src/data/home.json')) }],
  about: [{ id: '1', ...singleton('about', read('src/data/about.json')) }],
  site_settings: [{ id: '1', ...singleton('site_settings', read('src/data/settings.json')) }],
  seo_settings: [], services: [], stats: [], projects: [],
  project_images: [], experience: [], skill_categories: [], skills: [],
  testimonials: [], blog_categories: [], blog_posts: [], contact_submissions: [],
};

for (const file of files('src/data/seo')) {
  const row = read(`src/data/seo/${file}`);
  seed.seo_settings.push({ id: file.replace(/\.json$/, ''), page_key: file.replace(/\.json$/, ''), ...singleton(row) });
}
for (const file of files('src/content/services')) {
  const row = read(`src/content/services/${file}`);
  seed.services.push({ id: String(row.order), display_order: row.order, slug_id: row.slug_id, slug_en: row.slug_en,
    n_id: row.n_id, n_en: row.n_en, h_id: row.h_id, h_en: row.h_en, p_id: row.p_id, p_en: row.p_en,
    meta_id: row.meta_id, meta_en: row.meta_en, status: 'published' });
}
read('src/data/stats.json').items.forEach((row, index) => seed.stats.push({ id: String(index + 1), display_order: index + 1, ...row }));
files('src/content/projects').forEach((file, index) => {
  const row = read(`src/content/projects/${file}`);
  seed.projects.push({ id: String(index + 1), title: row.name, slug: slugify(row.name), project_url: row.url,
    cover_image: row.image, cover_alt_id: row.alt_id, cover_alt_en: row.alt_en,
    short_description_id: row.desc_id, short_description_en: row.desc_en,
    description_id: row.desc_id, description_en: row.desc_en, tags: row.tags ?? [], featured: !!row.featured,
    display_order: row.order, status: 'published', published_at: new Date().toISOString() });
});

process.stdout.write(JSON.stringify(seed));
