# Manganju Glory — Portfolio

Portfolio bilingual ID/EN di [haloglory.com](https://haloglory.com). Frontend
dibangun dengan Astro 5 (output statis); admin, form kontak, media, dan password
reset memakai API PHP same-origin + MariaDB pada DomaiNesia cPanel.

```bash
npm install
npm run dev
npm run build
```

`npm run build` mencoba menarik snapshot CMS lewat `CMS_EXPORT_URL` dan
`CMS_EXPORT_TOKEN`. Tanpa kedua secret tersebut, build memakai snapshot JSON
yang sudah di-commit. Tidak ada credential database atau token cPanel di bundle
browser maupun repository.

## Production

- Document root: `/home/haloglor/public_html`
- API: `public/api/index.php`
- Konfigurasi rahasia: `/home/haloglor/.haloglory/config.php`
- Media upload: `/home/haloglor/public_html/uploads`
- Admin: `https://haloglory.com/admin/login`
- Vercel lama: redirect permanen ke domain production

Lihat [docs/ADMIN.md](docs/ADMIN.md), [docs/DATABASE.md](docs/DATABASE.md), dan
[MIGRATION.md](MIGRATION.md) untuk operasi dan arsitektur.
