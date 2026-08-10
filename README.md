# Manganju Glory — Portfolio

Situs bilingual (ID/EN) untuk konsultan website independen. **Astro 5, output
statis**, plus satu serverless function (`api/contact.js`) di Vercel.

Bahasa Indonesia di root (`/layanan`), Inggris di prefix (`/en/services`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run audit    # build + 16 pemeriksaan SEO terhadap dist/
```

---

## Struktur

```
src/
├── data/                  ← SEMUA konten & konstanta ada di sini
│   ├── site.ts            ← origin, kontak, waLink(). Satu-satunya sumber domain.
│   ├── i18n.ts            ← ROUTES, READY, PAIRS, string UI
│   ├── projects.ts        ← [GENERATED] 16 proyek — lihat catatan di bawah
│   ├── projects-en.ts     ← overlay deskripsi proyek versi Inggris
│   ├── services.ts        ← 5 halaman layanan (ID)
│   ├── services-en.ts     ← 5 halaman layanan (EN) — bukan terjemahan
│   ├── pricing.ts         ← paket, FAQ, "yang tidak termasuk"
│   ├── case-studies.ts    ← 2 studi kasus
│   └── schema.ts          ← builder JSON-LD
├── layouts/Base.astro     ← shell HTML, meta, canonical, hreflang, JSON-LD
├── components/            ← Nav, Footer, LangToggle, WhatsAppCTA, Analytics, ...
└── pages/                 ← rute; struktur folder = struktur URL

public/
├── styles.css             ← seluruh CSS (vanilla, tidak diproses Astro)
├── main.js                ← seluruh JS (vanilla: loader, cursor, reveal, marquee)
└── img/work/*.webp        ← 16 tangkapan layar proyek, self-hosted

scripts/audit-seo.mjs      ← npm run audit
MIGRATION.md               ← checklist pindah ke manganjuglory.com
```

`styles.css` dan `main.js` **sengaja tidak diport ke Astro.** Keduanya vanilla
dan dipanggil lewat `<link>`/`<script>` biasa. Lapisan animasi (loader, cursor
ring, marquee, IntersectionObserver reveal) tidak melewati build pipeline mana
pun, jadi tidak bisa rusak karenanya.

---

## Aturan yang gampang dilanggar

**`src/data/projects.ts` di-generate dari `main.js` lama.** Jangan edit datanya
manual tanpa sadar. Menambah proyek = tambah entri + taruh
`public/img/work/<slug>.webp`. `projects-en.ts` punya guard yang **menggagalkan
build** kalau ada proyek tanpa deskripsi Inggris.

**Data proyek tidak boleh kembali ke `main.js`.** Dulu ia di-inject lewat
`innerHTML`, dan itu sebabnya `/portofolio` tampil **kosong** bagi crawler.
Sekarang dirender saat build. `npm run audit` memeriksa ini.

**`READY` di `i18n.ts` menentukan halaman mana yang boleh ditaut.** Tambahkan
sebuah key hanya SETELAH file `.astro`-nya ada. Nav, toggle bahasa, dan hreflang
semuanya membacanya. hreflang yang menunjuk 404 membuat Google membuang seluruh
klasternya — lebih buruk daripada tidak memasang hreflang sama sekali.

**Link WhatsApp hanya boleh dibuat lewat `<WhatsAppCTA>`.** Ia yang memasang
`data-wa`/`data-page` yang dibaca tracker. Audit menolak `wa.me` mentah.

**`<img>` yang mengandalkan `aspect-ratio` wajib punya `height:auto` di CSS.**
Atribut `width`/`height` (dipasang untuk mencegah CLS) menjadi presentational
hint, dan `aspect-ratio` diabaikan kalau height bukan `auto`. Ini pernah membuat
foto hero merenggang jadi 1500px dan menyembunyikan seluruh teks hero.

---

## Environment variables

| Var | Wajib | Guna |
|---|---|---|
| `PUBLIC_SITE_URL` | tidak | Origin semua URL absolut. Default `mglportfolio.vercel.app`. Pindah domain = ganti ini saja. |
| `PUBLIC_GA4_ID` | tidak | Kosong = GA4 mati total, nol script pihak ketiga ikut ter-load. |
| `RESEND_API_KEY` | ya (prod) | Dipakai `api/contact.js`. Sudah diset di Vercel untuk Production. |

Lihat `.env.example`.

Di Vercel, apa pun di `/api` otomatis jadi serverless endpoint — tanpa
konfigurasi. `cleanUrls: true` di `vercel.json` yang membuat `/harga` menyajikan
`harga.html`; karena itu semua link internal ditulis tanpa `.html`.

### Resend (form kontak)

`api/contact.js` mengirim isi form ke `manganjuglory@gmail.com` lewat Resend.
Butuh `RESEND_API_KEY` di Vercel → Settings → Environment Variables. Selama
domain sendiri belum terverifikasi di Resend, pengirimnya memakai
`onboarding@resend.dev`; setelah `manganjuglory.com` aktif, ganti `FROM` di
`api/contact.js` ke alamat di domain itu.

---

## TODO yang menunggu jawaban Glory

Ini sengaja **tidak** diisi karangan:

- `SAME_AS` di `src/data/site.ts` masih kosong → URL LinkedIn/Instagram
- Skema cicilan di `src/data/pricing.ts` → FAQ-nya belum ditayangkan
- Rail pembayaran klien internasional di `src/pages/en/pricing.astro`
- Nama NGO London (+ izinnya) di `src/data/case-studies.ts`
- `priceRange` di `schema.ts` masih `"$$"` → ganti ke rentang nyata
- `/en/design-system` belum dibuat (sengaja; `READY` menyembunyikannya)
