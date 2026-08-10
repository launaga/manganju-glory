# Migrasi Domain — `mglportfolio.vercel.app` → `manganjuglory.com`

## Kenapa ini penting (dan kenapa jangan ditunda)

`*.vercel.app` ada di [Public Suffix List](https://publicsuffix.org/). Artinya
browser dan mesin pencari memperlakukan setiap subdomain `vercel.app` sebagai
situs milik pihak yang berbeda — bukan bagian dari satu domain besar.

Konsekuensinya: **semua authority yang Anda bangun di `mglportfolio.vercel.app`
menempel di subdomain sewaan.** Sebagian bisa dipindahkan lewat 301, tapi tidak
pernah 100%, dan Anda tidak punya kendali atas domain induknya.

`manganjuglory.com` **sudah terdaftar di team Vercel Anda** tapi saat ini
mengembalikan 403 — belum di-wire ke project mana pun.

> **Rekomendasi: pindahkan domainnya SEBELUM menambah halaman baru lagi.**
> Situs ini baru saja bertambah dari 5 jadi 14 URL. Setiap minggu penundaan
> berarti lebih banyak halaman yang harus dimigrasikan, lebih banyak backlink
> yang mengarah ke domain lama, dan lebih banyak authority yang tersangkut di
> alamat yang bukan milik Anda.

---

## Yang sudah disiapkan di kode

Berkat port ke Astro, migrasi domain **tidak butuh perubahan kode sama sekali**.

Semua URL absolut — canonical, OG, sitemap, JSON-LD, robots.txt — dibaca dari
**satu** variabel:

```
PUBLIC_SITE_URL
```

Dibaca di dua tempat saja:
- `astro.config.mjs` → `site` (dipakai sitemap & robots)
- `src/data/site.ts` → `SITE_URL` (dipakai `abs()`, canonical, OG, JSON-LD)

Verifikasi tidak ada domain hardcoded yang tersisa:

```bash
grep -rn "mglportfolio" src/ public/ astro.config.mjs
# Hanya boleh muncul sebagai nilai fallback di src/data/site.ts + astro.config.mjs
```

> Catatan: MD audit menyebut `NEXT_PUBLIC_SITE_URL`. Itu konvensi Next.js dan
> tidak berlaku di sini — Astro memakai prefix `PUBLIC_`. Namanya berbeda,
> tujuannya sama (satu sumber origin).

---

## Checklist migrasi

### 1. Pasang domain di Vercel

- [ ] Vercel → project `manganju-glory` → **Settings → Domains**
- [ ] Tambahkan `manganjuglory.com` **dan** `www.manganjuglory.com`
- [ ] Pilih satu sebagai kanonik (rekomendasi: **apex**, `manganjuglory.com`),
      set `www` sebagai redirect ke apex
- [ ] Cek DNS sudah propagasi: `dig manganjuglory.com +short`
- [ ] Pastikan sertifikat SSL sudah terbit (Vercel otomatis; tunggu sampai hijau)
- [ ] Buka `https://manganjuglory.com` — harus tampil situsnya, bukan 403

### 2. Set environment variable

- [ ] Vercel → **Settings → Environment Variables**
- [ ] `PUBLIC_SITE_URL` = `https://manganjuglory.com`
- [ ] Scope: **Production** (dan Preview kalau ingin preview memakai domain final)
- [ ] **Redeploy** — env var tidak berlaku ke deployment yang sudah ada

### 3. Verifikasi origin sudah berpindah

Setelah redeploy, semua ini harus menunjuk `manganjuglory.com`:

```bash
curl -s https://manganjuglory.com/            | grep -o '<link rel="canonical"[^>]*>'
curl -s https://manganjuglory.com/robots.txt
curl -s https://manganjuglory.com/sitemap-0.xml | head -c 400
curl -s https://manganjuglory.com/            | grep -o '"@id":"[^"]*"' | sort -u
```

- [ ] Nol kemunculan `mglportfolio.vercel.app` di semua output di atas

### 4. Redirect 301 dari domain lama

Domain lama **harus tetap hidup** dan mengarahkan ke yang baru — jangan dimatikan.
Itu satu-satunya cara authority-nya ikut pindah, dan satu-satunya cara backlink
yang sudah ada tidak jadi 404.

- [ ] Pertahankan `mglportfolio.vercel.app` tetap menempel di project
- [ ] Vercel → Settings → Domains → pada `mglportfolio.vercel.app` pilih
      **Redirect to** `manganjuglory.com` dengan status **308** (Vercel memakai
      308; ini permanen dan diperlakukan sama dengan 301 oleh Google)
- [ ] Pastikan redirect-nya **path-preserving** — `/harga` harus mendarat di
      `manganjuglory.com/harga`, bukan di homepage. Redirect semua-ke-homepage
      adalah cara paling umum menghanguskan migrasi.

Verifikasi tiap URL lama:

```bash
for p in / /tentang /layanan /harga /portofolio /sistem-desain /kontak; do
  printf '%-18s' "$p"
  curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' "https://mglportfolio.vercel.app$p"
done
```

- [ ] Semua mengembalikan `308` ke path yang sama di domain baru
- [ ] **Pertahankan redirect ini minimal 1 tahun.** Idealnya selamanya.

### 5. Google Search Console

Urutannya penting — jangan lompat.

- [ ] Tambahkan property baru untuk `manganjuglory.com` (pilih tipe **Domain**,
      verifikasi lewat DNS TXT — mencakup semua subdomain sekaligus)
- [ ] Pastikan property **lama** (`mglportfolio.vercel.app`) masih terverifikasi.
      Kalau tidak, Change of Address tidak bisa dijalankan.
- [ ] Submit sitemap di property baru: `https://manganjuglory.com/sitemap-index.xml`
- [ ] Jalankan **Settings → Change of Address** di property **lama**, arahkan ke
      yang baru. Ini yang memberi tahu Google migrasinya disengaja.
- [ ] URL Inspection → Request Indexing untuk halaman prioritas:
      `/`, `/layanan`, `/harga`

> ⚠️ **Change of Address kemungkinan besar tidak tersedia** untuk property
> `*.vercel.app`, karena Google memperlakukan domain di Public Suffix List secara
> khusus dan Anda tidak bisa memverifikasi kepemilikan domain induknya. Kalau
> opsinya tidak muncul, itu bukan kesalahan Anda — dan justru itu bukti kenapa
> `*.vercel.app` tidak layak jadi rumah permanen. Dalam kasus itu, andalkan 301
> path-preserving + internal linking, dan terima pemulihan yang lebih lambat.

### 6. Perbarui referensi eksternal

301 memindahkan authority; tautan langsung memindahkannya lebih baik.

- [ ] LinkedIn (headline, about, featured)
- [ ] Instagram bio
- [ ] Tanda tangan email
- [ ] Direktori atau listing tempat Anda terdaftar
- [ ] `SAME_AS` di `src/data/site.ts` masih **kosong** — isi URL profil sosial
      Anda supaya JSON-LD punya `sameAs` yang benar

### 7. Analytics

- [ ] GA4: set `PUBLIC_GA4_ID` di Vercel (saat ini **belum diset**, jadi GA4
      belum aktif sama sekali)
- [ ] Kalau GA4 sudah jalan sebelum migrasi, tandai tanggal pindah sebagai
      **annotation** — trafik akan terlihat anjlok lalu pulih, dan tanpa catatan
      itu akan terbaca seperti masalah
- [ ] Verifikasi event `whatsapp_click` masuk dari domain baru

---

## Ekspektasi realistis

| Waktu | Yang biasanya terjadi |
|---|---|
| Hari 0–3 | Google mulai meng-crawl domain baru. Trafik dari pencarian anjlok. **Ini normal.** |
| Minggu 1–2 | Halaman baru mulai terindeks. Domain lama masih muncul di hasil pencarian. |
| Minggu 3–6 | Sebagian besar URL berpindah. Peringkat mulai stabil. |
| Bulan 2–3 | Pemulihan penuh, **kalau** 301-nya utuh dan path-preserving. |

Yang paling sering menghancurkan migrasi, berurutan:
1. Redirect mengarah ke homepage, bukan ke path yang sama.
2. Redirect dimatikan terlalu cepat.
3. Domain lama dihapus dari project.
4. Sitemap masih menunjuk URL lama.

Situs ini masih baru dan authority-nya kecil — dan itu kabar baik. **Semakin
cepat dipindahkan, semakin sedikit yang dipertaruhkan.**

---

## Yang tidak bisa dikerjakan dari kode (harus manual)

- Membeli/menyambungkan domain di Vercel
- Verifikasi Google Search Console + submit sitemap + Change of Address
- Setup Google Business Profile
- Riset volume keyword yang sebenarnya — peta keyword di prompt audit adalah
  **hipotesis**, belum divalidasi data
- Mengumpulkan testimoni & izin pakai logo klien
