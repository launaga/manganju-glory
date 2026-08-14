import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Satu-satunya sumber origin untuk seluruh URL absolut (canonical, OG, sitemap,
// JSON-LD). Fase 8: tidak boleh ada domain hardcoded di mana pun selain di sini.
// Saat pindah domain, cukup set PUBLIC_SITE_URL di Vercel — nol perubahan kode.
const SITE = process.env.PUBLIC_SITE_URL || 'https://mglportfolio.vercel.app';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  build: { format: 'file' },

  // ID di root (/layanan), EN di prefix (/en/services).
  // prefixDefaultLocale:false menjaga semua URL Indonesia yang sudah terindeks
  // tetap di tempatnya — tidak ada 301 massal, tidak ada authority yang hangus.
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },

  integrations: [
    sitemap({
      // Keep the private admin area out of the sitemap (it is also noindex).
      filter: (page) => !/\/admin(\/|$|\.html)/.test(page),
      i18n: { defaultLocale: 'id', locales: { id: 'id-ID', en: 'en-US' } },
    }),
  ],
});
