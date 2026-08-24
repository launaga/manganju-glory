// Build-time content sync: pull PUBLISHED content from Supabase and materialise
// it into the JSON/content files the public Astro components already read.
// Runs before `astro build`. This is how the static site becomes CMS-driven
// while the components — and therefore the design — stay byte-for-byte unchanged.
//
// Fallback: if Supabase is unreachable (e.g. no network) or returns nothing, we
// LOUDLY warn and leave the committed snapshot in place, so the build never
// breaks and never ships an empty site. In CI this fetch should succeed; set
// REQUIRE_SUPABASE=1 to make a fetch failure fail the build instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { shapeSingleton, shapeSeo, shapeService, shapeStats, shapeProject } from '../src/lib/content/shape.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readEnv = () => {
  const env = { ...process.env };
  const f = path.join(ROOT, '.env');
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2];
    }
  }
  return env;
};

const warn = (msg) => console.warn(`\n\x1b[33m[sync-content] ${msg}\x1b[0m`);
const write = (rel, obj) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
};

async function main() {
  const env = readEnv();
  const url = env.PUBLIC_SUPABASE_URL, key = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY not set');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const need = async (label, p) => {
    const { data, error } = await p;
    if (error) throw new Error(`${label}: ${error.message}`);
    if (data == null) throw new Error(`${label}: no data`);
    return data;
  };

  // Fetch everything first (all-or-nothing) — anon key ⇒ published-only via RLS.
  const [home, about, settings, seoRows, services, statsRows, projects] = await Promise.all([
    need('homepage', db.from('homepage').select('*').eq('id', 1).single()),
    need('about', db.from('about').select('*').eq('id', 1).single()),
    need('site_settings', db.from('site_settings').select('*').eq('id', 1).single()),
    need('seo', db.from('seo_settings').select('*').not('page_key', 'in', '(pricing,design-system)')),
    need('services', db.from('services').select('*').eq('status', 'published').order('display_order')),
    need('stats', db.from('stats').select('*').order('display_order')),
    need('projects', db.from('projects').select('*').eq('status', 'published').order('display_order')),
  ]);
  if (!projects.length) throw new Error('0 published projects — refusing to overwrite snapshot');

  // Only now (all fetched) do we write, so a mid-fetch failure never half-writes.
  write('src/data/home.json', shapeSingleton('homepage', home));
  write('src/data/about.json', shapeSingleton('about', about));
  write('src/data/settings.json', shapeSingleton('site_settings', settings));
  write('src/data/stats.json', shapeStats(statsRows));
  for (const s of seoRows) write(`src/data/seo/${s.page_key}.json`, shapeSeo(s));

  // Collections: clear + rewrite so removed items disappear.
  for (const dir of ['src/content/services', 'src/content/projects']) {
    const abs = path.join(ROOT, dir);
    if (fs.existsSync(abs)) for (const f of fs.readdirSync(abs)) if (f.endsWith('.json')) fs.unlinkSync(path.join(abs, f));
  }
  services.forEach((s) => write(`src/content/services/${String(s.display_order).padStart(2, '0')}-${s.slug_en}.json`, shapeService(s)));
  projects.forEach((p) => write(`src/content/projects/${String(p.display_order).padStart(2, '0')}-${p.slug}.json`, shapeProject(p)));

  console.log(`[sync-content] ✓ synced ${projects.length} projects, ${services.length} services, ${seoRows.length} SEO pages, singletons.`);
}

main().catch((err) => {
  warn(`Supabase content NOT synced — building from the committed snapshot instead.`);
  warn(`Reason: ${err.message}`);
  if (process.env.REQUIRE_SUPABASE === '1') { console.error('[sync-content] REQUIRE_SUPABASE=1 → failing build.'); process.exit(1); }
  process.exit(0); // build proceeds with the committed content
});
