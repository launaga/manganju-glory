# Migrasi ke DomaiNesia cPanel

Target production: `https://haloglory.com` dengan document root
`/home/haloglor/public_html`.

## Status

- [x] Canonical, sitemap, robots, dan JSON-LD memakai `haloglory.com`.
- [x] Build Astro dipasang di `public_html` melalui FTPS/cPanel File Manager.
- [x] Dedicated FTPS `deploy@haloglory.com` dibatasi ke `public_html`.
- [x] MariaDB CMS dan user database terisolasi sudah dibuat.
- [x] Supabase Auth/Database/Storage diganti API same-origin + MariaDB.
- [x] Create/reset password memakai tautan email sekali pakai 30 menit.
- [x] Login dibatasi 5 kegagalan per email atau IP, lalu lock 30 menit.
- [x] Form kontak dan notifikasi memakai mail transport lokal hosting.
- [x] Vercel lama dikonfigurasi sebagai redirect permanen path-preserving.

Jangan hapus deployment lama sampai redirect dan backup sudah diverifikasi.
Token cPanel sementara wajib dicabut/diganti setelah handoff.
