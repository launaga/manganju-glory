# Database CMS

Production memakai MariaDB lokal cPanel. Credential berada di
`/home/haloglor/.haloglory/config.php` (permission direktori `0700`), bukan di
Git atau browser.

Tabel sistem:

- `admins`, `admin_sessions`, `password_tokens`
- `login_attempts`, `reset_attempts`
- `cms_records` untuk record koleksi/singleton JSON
- `media` untuk metadata file; binary berada di `public_html/uploads`
- `setup_state` agar installer hanya bisa dijalankan satu kali

`/api/internal/export` membutuhkan bearer token server-side dan hanya
mengekspor konten yang diperlukan build Astro. Endpoint CRUD dan media selalu
memerlukan session admin + CSRF. Endpoint publik hanya health, login/reset, dan
form kontak.

File `supabase/` dipertahankan sebagai arsip skema lama dan referensi migrasi;
tidak dipakai runtime maupun build production.
