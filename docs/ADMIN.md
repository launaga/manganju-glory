# Admin Konten (Sveltia CMS)

Panel admin git-based untuk mengedit konten situs **tanpa menyentuh kode**.
UI-nya **Sveltia CMS** (modern, ringan) yang membaca konfigurasi Decap yang sama
(`public/admin/config.yml`) — jadi semua koleksi & field tetap sama.
Data disimpan sebagai file di repo ini (mis. `src/content/projects/*.json`); tiap
simpan = commit ke GitHub → Vercel rebuild (~1 menit).

- URL admin (produksi): `https://mglportfolio.vercel.app/admin`
- URL admin (lokal, `astro dev`): `http://localhost:4321/admin/index.html`

Status v1: koleksi **Portofolio** sudah aktif (CRUD proyek + gambar + ID/EN).
Menyusul: Harga, Layanan, dan teks halaman + SEO.

---

## 1. Mengedit secara LOKAL (tanpa login)

Cocok untuk mencoba/menyiapkan konten sebelum tayang.

```bash
npm run dev
```

Buka `http://localhost:4321/admin/index.html` → klik **Work with Local
Repository** → pilih folder repo ini (`files`). Sveltia menulis langsung ke
file lewat browser (File System Access API — Chrome/Edge). Commit & push
seperti biasa saat siap. Tidak perlu server proxy tambahan.

---

## 2. Mengaktifkan admin di PRODUKSI (GitHub OAuth)

Admin produksi login lewat GitHub. Perlu satu kali setup:

### a. Buat GitHub OAuth App
1. Buka <https://github.com/settings/developers> → **New OAuth App**.
2. Isi:
   - **Application name:** `MGL Admin`
   - **Homepage URL:** `https://mglportfolio.vercel.app`
   - **Authorization callback URL:** `https://mglportfolio.vercel.app/api/callback`
3. **Register** → catat **Client ID**, lalu **Generate a new client secret** → catat **Client Secret**.

### b. Set environment variable di Vercel
Project `manganju-glory` → **Settings → Environment Variables**, tambahkan (scope: Production):

| Name | Value |
|------|-------|
| `GITHUB_CLIENT_ID` | Client ID dari langkah a |
| `GITHUB_CLIENT_SECRET` | Client Secret dari langkah a |

Atau lewat CLI:
```bash
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
```

### c. Deploy ulang
```bash
vercel --prod
```

Selesai. Buka `https://mglportfolio.vercel.app/admin` → **Sign In with GitHub**.
Hanya akun yang punya akses tulis ke repo `launaga/manganju-glory` yang bisa masuk.

### Alternatif tercepat: Personal Access Token (tanpa OAuth App)
Sveltia juga mendukung login pakai token. Kalau tidak mau repot bikin OAuth App:
1. Buat token di <https://github.com/settings/tokens> (fine-grained: akses **Contents: Read and write** untuk repo `manganju-glory`).
2. Buka `/admin` → **Sign In Using Access Token** → tempel token.

Cukup untuk pemakaian solo. OAuth App tetap lebih nyaman untuk jangka panjang.

---

## Cara kerja (ringkas)

- `public/admin/index.html` — memuat UI Decap (dari CDN).
- `public/admin/config.yml` — definisi koleksi & field (ID/EN dipasangkan).
- `api/auth.js` + `api/callback.js` — handler OAuth GitHub (serverless Vercel).
- `src/content/projects/*.json` — data proyek; dibaca `src/content/config.ts`
  dan dirender di `src/pages/portofolio.astro` & `src/pages/en/work.astro`.

## Catatan
- `/admin` di-`Disallow` di `robots.txt` dan `noindex` — tidak terindeks.
- Gambar diupload ke `public/img/work/` otomatis lewat form (isi juga **alt text**).
- Field ID & EN wajib diisi berpasangan agar konten dwibahasa tetap sinkron.
