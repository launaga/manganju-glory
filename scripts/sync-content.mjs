// Build-time content sync: pull published content from the private cPanel CMS
// it into the JSON/content files the public Astro components already read.
// Runs before `astro build`. This is how the static site becomes CMS-driven
// while the components — and therefore the design — stay byte-for-byte unchanged.
//
// Fallback: if the CMS is unreachable (e.g. no network) or returns nothing, we
// LOUDLY warn and leave the committed snapshot in place, so the build never
// breaks and never ships an empty site. Set REQUIRE_CMS=1 to fail closed in CI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  const url = env.CMS_EXPORT_URL, token = env.CMS_EXPORT_TOKEN;
  if (!url || !token) throw new Error('CMS_EXPORT_URL / CMS_EXPORT_TOKEN not set');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`CMS export returned HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.ok || !payload?.data) throw new Error('CMS export payload invalid');
  const all = payload.data;
  const home = all.homepage?.[0], about = all.about?.[0], settings = all.site_settings?.[0];
  const seoRows = (all.seo_settings ?? []).filter((r) => !['pricing', 'design-system'].includes(r.page_key));
  const services = (all.services ?? []).filter((r) => r.status === 'published').sort((a,b) => a.display_order-b.display_order);
  const statsRows = (all.stats ?? []).sort((a,b) => a.display_order-b.display_order);
  const projects = (all.projects ?? []).filter((r) => r.status === 'published').sort((a,b) => a.display_order-b.display_order);
  if (!home || !about || !settings) throw new Error('CMS singleton content missing');
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
  warn(`CMS content NOT synced — building from the committed snapshot instead.`);
  warn(`Reason: ${err.message}`);
  if (process.env.REQUIRE_CMS === '1') { console.error('[sync-content] REQUIRE_CMS=1 → failing build.'); process.exit(1); }
  process.exit(0); // build proceeds with the committed content
});
