# Audit SEO — haloglory.com & mglwebkits.com

7 September 2026 · Target: Indonesia, Jakarta/Jabodetabek, internasional · Audit pertama

**Kesimpulan:** haloglory.com memiliki fondasi SEO teknis yang baik dan halaman layanan yang sudah relevan. Kebutuhan utamanya adalah memperkuat halaman komersial, bukti pengalaman, distribusi tautan, dan pengukuran. mglwebkits.com memerlukan perbaikan routing, kesamaan HTML awal dengan hasil render, konfigurasi demo, dan penyajian produk. Mengganti meta tag saja tidak menyelesaikan masalah kedua situs.

Audit ini menghasilkan temuan dan rencana implementasi. Tidak ada perubahan kode produksi, konten CMS, DNS, atau pengaturan Google yang dilakukan.

## Cakupan dan batas data

- Seluruh **24 URL sitemap haloglory.com** dan **7 URL sitemap mglwebkits.com** dicrawl, termasuk title, description, canonical, heading, hreflang, JSON-LD, gambar, tautan, dan respons HTTP. Root HaloGlory tanpa slash tersimpan sebagai satu observasi tambahan; bukan halaman konten ke-25.
- Pemeriksaan tambahan mencakup HTTP/www, slash dan `.html`, URL yang tidak ada, admin, tiga halaman legal MGL Webkits, dua gambar produk, dua root demo, robots dan sitemap demo.
- Pemeriksaan browser mengonfirmasi halaman produk Swift setelah JavaScript berjalan, halaman syarat dan ketentuan, serta perilaku URL tidak dikenal.
- **7 pengujian Lighthouse 13.4.1**, meliputi 5 halaman unik: dua beranda, `/layanan`, Swift, dan Dotravel. Kedua beranda juga diuji desktop.
- Data Search Console **belum tersedia**: konektor gagal autentikasi; akun browser yang terbuka menampilkan layar awal penambahan situs. Ini tidak membuktikan bahwa properti belum pernah dibuat di akun lain.
- PageSpeed Insights API mengembalikan HTTP 429. Pengukuran pengganti menggunakan Lighthouse lokal. **CrUX/field Core Web Vitals, INP nyata, klik, impresi, posisi Google, backlink, manual action, dan cakupan indeks belum terverifikasi.** Data yang tidak tersedia bukan nol.
- Pencarian publik tidak memberikan bukti kuat posisi dua situs untuk kata kunci target. Hasil pencarian bukan pengganti URL Inspection atau laporan ranking Indonesia. Volume keyword dan proyeksi kenaikan klik tidak dibuat tanpa data.
- Angka jumlah kata di inventaris adalah teks HTML awal, termasuk navigasi. Itu bukan ukuran kualitas atau persyaratan Google; khusus Webkits, konten hasil render lebih lengkap.

## Lima prioritas

### 1. Perbaiki routing dan HTML awal MGL Webkits

**Prioritas tinggi · Upaya sedang · Dampak:** jalur akses dan keterbacaan konten utama; tambahan klik belum dapat dihitung.

**Bukti:** `https://mglwebkits.com/seo-audit-not-a-page-20260907` mengembalikan **200**, tidak memiliki canonical di HTML awal, lalu menampilkan beranda pada URL tersebut setelah render. Ini menimbulkan risiko soft 404 atau duplikasi, bukan bukti Google sudah menandainya. `http://mglwebkits.com/` dan `https://www.mglwebkits.com/` juga tetap 200 pada host/protokol asal, walaupun canonical menunjuk HTTPS non-www.

Di `/koleksi/swift`, H1 HTML awal hanya `Swift`; setelah render menjadi `SWIFT — TEMPLATE RENTAL MOBIL`. HTML awal dua produk tidak memiliki elemen gambar, demo/checkout/WhatsApp dan rincian lisensi seperti pada UI. Deskripsi panjang memuat simbol Markdown sebagai teks. Tiga halaman legal hanya mengirim shell **717 byte**, tanpa canonical awal; halaman syarat benar-benar ada setelah render, tetapi judul tab masih judul beranda.

**Perbaikan:** gunakan satu sumber data dan template SSR/SSG untuk HTML awal dan UI React. Sertakan H1 deskriptif, gambar, spesifikasi, harga, lisensi, tautan, dan metadata dalam HTML yang dikirim server. Render Markdown menjadi heading/list semantik. Tambahkan route 404 server dan komponen not-found; jangan tampilkan beranda pada sembarang URL. Alihkan HTTP dan www ke HTTPS non-www dengan 301/308 yang mempertahankan path/query. Tetapkan metadata halaman legal.

**Lulus jika:** URL acak mengembalikan 404; tiga varian beranda mengarah ke satu URL; isi komersial utama tersedia tanpa menunggu JavaScript dan tetap sama setelah render. Tidak ada kebutuhan memblokir JavaScript bagi Google. Google bisa merender JS, tetapi SSR mengurangi ketergantungan dan membantu crawler lain. [Pedoman JavaScript Google](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### 2. Benahi SEO demo Swift dan Dotravel

**Prioritas tinggi · Upaya rendah · Dampak:** menghapus referensi domain salah pada 2 demo dan 16 entri sitemap.

**Bukti:** root `swift.mglwebkits.com` dan `dotravel.mglwebkits.com` sama-sama memiliki canonical `https://your-domain.com/`. Robots keduanya mengizinkan crawl dan menunjuk sitemap domain placeholder. Sitemap Swift memuat **6 URL** placeholder; Dotravel **10 URL** placeholder. Tidak ditemukan larangan indeks pada respons root yang diperiksa.

**Perbaikan yang disarankan:** prioritaskan halaman produk `/koleksi/swift` dan `/koleksi/dotravel` sebagai landing page pencarian. Karena demo merepresentasikan bisnis contoh, berikan `noindex, follow` pada seluruh deployment demo sambil tetap mengizinkan crawl agar noindex terbaca. Hapus referensi `your-domain.com`; jangan menerapkan aturan demo ini ke file template yang dibeli pelanggan. Checklist instalasi pelanggan harus mengganti domain, identitas, metadata, schema, dan sitemap dengan bisnis sebenarnya.

Jika kelak demo memang ingin diindeks sebagai showcase mandiri, gunakan self-canonical aktual serta konten/identitas yang jelas sebagai demo. Jangan canonical-kan demo yang berbeda isinya ke halaman produk dengan harapan memindahkan ranking.

**Lulus jika:** tidak ada placeholder domain di canonical, robots, sitemap deployment; seluruh demo mengikuti satu kebijakan indeks yang jelas. [Panduan canonical Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### 3. Jadikan `/layanan` halaman utama untuk “jasa pembuatan website”

**Prioritas tinggi · Upaya sedang · Dampak:** memperkuat 1 halaman komersial utama dan 5 detail layanan; estimasi klik menunggu GSC.

**Bukti:** `/layanan` **sudah** mempunyai title `Jasa Pembuatan Website Profesional | MGL` dan H1 relevan. Tidak perlu membuat halaman baru yang menduplikasinya. Beranda menargetkan konsultasi: `Konsultan Website Indonesia — Manganju Glory`. Lima layanan detail memiliki copy, FAQ, harga atau keterangan konsultasi, Service schema, dan tautan dari hub. Beranda tidak menaut langsung ke lima halaman detail pada HTML yang dicrawl. Ada **2 studi kasus per bahasa** dan 16 proyek dalam snapshot CMS.

**Perbaikan:** pertahankan `/layanan` sebagai pemilik keyword umum. Tambahkan perbandingan deliverable per paket, apa yang termasuk/tidak termasuk, kepemilikan website, biaya berulang, dukungan pascapeluncuran, dan pilihan platform. Hubungkan ke dua studi kasus relevan; tambahkan tautan kontekstual dari beranda dan studi kasus ke layanan yang didemonstrasikan. Beri bukti konkret pada klaim pengalaman, bukan sekadar menambah angka atau testimoni.

Usulan title: **`Jasa Pembuatan Website Profesional Indonesia | MGL`**. H1: **`Jasa Pembuatan Website untuk Bisnis dan Organisasi`**. Positioning “dimulai dari strategi” tetap menjadi subheading pembeda. Harga company profile mulai Rp5 juta dan e-commerce Rp15 juta sudah terlihat: jelaskan cakupannya untuk menyaring prospek yang sesuai, jangan bersaing lewat klaim termurah.

Untuk Jakarta/Jabodetabek, buat satu halaman regional hanya jika bisa diisi pengalaman klien nyata, cara konsultasi, cakupan layanan aktual, dan proses kerja regional yang berbeda. Jangan membuat halaman Jakarta/Bekasi/Depok identik hanya dengan mengganti nama kota. Untuk internasional, dahulukan `/en/services/wordpress-development` dan studi kasus Inggris yang sudah tersedia.

**Lulus jika:** pembeli bisa membandingkan pilihan dan memahami harga, proses, bukti, kepemilikan, serta langkah konsultasi pada jalur hub → detail → studi kasus → CTA. [Konten yang berguna dan tautan](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [kebijakan doorway Google](https://developers.google.com/search/docs/essentials/spam-policies).

### 4. Perjelas katalog template dan kepercayaan pembeli

**Prioritas tinggi · Upaya sedang · Dampak:** 1 katalog, 2 produk, dan jalur pembelian; estimasi klik menunggu GSC.

**Bukti:** katalog saat audit menampilkan **2 produk**: Swift Rp499.000 dan Dotravel Rp799.000. Title beranda belum menyebut “template website”; title katalog hanya `Koleksi Template — MGL Webkits`. Product+Offer schema sudah ada dan harga cocok. UI Swift menampilkan slot galeri kosong, keterangan belum ada versi dipublikasikan, dan tombol beli. UI beranda yang dirender pada URL fallback menampilkan klaim `12+ kit dirilis`, sementara katalog yang dicrawl memuat 2. Jumlah rilis historis mungkin berbeda dari produk yang dijual sekarang; perlu penjelasan, bukan asumsi klaim palsu.

**Perbaikan:** gunakan title beranda **`Template Website Premium Siap Pakai | MGL Webkits`**, katalog **`Koleksi Template Website untuk Bisnis | MGL Webkits`**, dan title produk deskriptif pada tabel keyword. Lengkapi screenshot nyata desktop/mobile, tautan live demo yang jelas, daftar halaman/fitur, file dan versi yang benar-benar didapat, kompatibilitas, lisensi, update, support, dan instalasi. Selaraskan jumlah halaman yang diklaim dengan paket unduhan. Verifikasi kesiapan file rilis dan pembelian sebelum mengiklankan “tersedia”; audit ini tidak melakukan transaksi.

Dua keyword produk lebih spesifik—“template website rental mobil” dan “template website travel”—layak menjadi fokus awal. Itu rekomendasi berdasarkan kecocokan produk, **bukan klaim volume atau kesulitan keyword terukur**. Jangan membuat kategori kosong. Tautan footer kategori yang semuanya menuju `/koleksi` tidak membentuk landing page kategori sendiri.

Untuk internasional, Webkits belum memiliki pasangan halaman Inggris pada sitemap. Siapkan katalog dan kedua produk dalam Inggris setelah kesiapan produk jelas; gunakan URL dan hreflang berpasangan. Lisensi saat ini membatasi satu bisnis milik pembeli, bukan proyek klien: jangan menargetkan agensi/freelancer pembuat situs klien tanpa paket lisensi yang sesuai.

**Lulus jika:** pengunjung bisa mengevaluasi dan membeli produk yang sama seperti yang dideskripsikan, tanpa placeholder atau informasi bertentangan. Product schema dipertahankan dan dilengkapi hanya dengan data nyata; tidak perlu rating buatan. [Product snippets Google](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).

### 5. Turunkan waktu tampil konten utama pada mobile

**Prioritas tinggi · Upaya sedang · Dampak:** LCP lab 3,2–4,4 detik pada 5 halaman mobile; ini bukan ukuran penalti ranking.

| Halaman | Perangkat | Performa | SEO teknis | LCP lab | CLS lab |
|---|---|---:|---:|---:|---:|
| haloglory.com/ | Mobile | 85 | 100 | 3,3 dtk | 0 |
| haloglory.com/layanan | Mobile | 86 | 100 | 3,3 dtk | 0 |
| mglwebkits.com/ | Mobile | 89 | 100 | 3,2 dtk | 0 |
| mglwebkits.com/koleksi/swift | Mobile | 81 | 100 | 4,4 dtk | 0 |
| mglwebkits.com/koleksi/dotravel | Mobile | 86 | 100 | 4,1 dtk | 0 |
| haloglory.com/ | Desktop | 97 | 100 | 0,9 dtk | 0,001 |
| mglwebkits.com/ | Desktop | 89 | 100 | 2,1 dtk | 0,071 |

Semua sampel mencatat TBT 0 ms; itu **bukan INP**. Tes lokal memakai simulasi perangkat/jaringan Lighthouse. Empat tes awal dijalankan bersamaan, tiga tes tambahan berurutan; gunakan sebagai diagnosis, bukan benchmark produksi final atau bukti CWV lapangan lulus/gagal. Nilai dapat berubah menurut perangkat, jaringan, cache, dan beban mesin. Sesudah perbaikan, ambil median 3 run terisolasi dan periksa CrUX 28 hari jika tersedia.

**HaloGlory:** stylesheet Google Fonts meminta 5 family beserta beberapa bobot. Font CSS dan stylesheet utama menunda paint; estimasi Lighthouse penghematan render-blocking mobile 2,43 detik tidak boleh dianggap keuntungan pasti. Kurangi family/bobot yang benar-benar tidak dipakai, subset/self-host font bila layak, dan uji critical CSS. Portrait memakai sumber 1000 px: siapkan `srcset`/`sizes` sesuai ukuran render. Estimasi penghematan gambar sekitar 58 KiB.

**MGL Webkits:** halaman beranda mentransfer sekitar **2.678 KiB**. Empat gambar proses JPEG menyumbang sekitar **1,85 MB**; favicon PNG sekitar **246 KB**; dua logo sekitar **196 KB**. Optimalkan ukuran/format gambar, lazy-load gambar di bawah layar, tentukan width/height, dan hindari memakai favicon besar sebagai artwork berulang. Lighthouse memperkirakan penghematan gambar beranda sekitar **517 KiB**. Di Swift, gambar LCP tidak ditemukan dalam dokumen awal dan belum memiliki `fetchpriority="high"`; berikan SSR pada gambar utama dan prioritaskan hanya gambar yang benar-benar menjadi LCP.

**Lulus jika:** LCP median lab mobile di bawah 2,5 detik pada halaman utama sebagai target engineering, gambar stabil, dan bukti lapangan diperiksa terpisah. Skor Lighthouse SEO 100 tidak menilai persaingan, kualitas produk, backlink, atau ranking. [Page experience Google](https://developers.google.com/search/docs/appearance/page-experience).

## Temuan pendukung

### Yang sudah baik

| Area | HaloGlory | MGL Webkits |
|---|---|---|
| Sitemap utama | 24/24 URL HTTP 200 | 7/7 URL HTTP 200 |
| Title, description, canonical awal | Lengkap pada 24 halaman; tidak ada title identik antarhalaman canonical | Lengkap pada 7 halaman sitemap; tidak ada title identik di tujuh halaman ini |
| Heading utama | Satu H1 per halaman yang dicrawl | H1 ada, tetapi produk berbeda antara HTML awal dan render |
| Bahasa | 12 pasangan ID/EN; self-canonical dan hreflang id/en/x-default saling kembali | ID saja pada sitemap; belum ada hreflang |
| Internal link | Tidak ada URL sitemap tanpa incoming link pada graf yang dicrawl | Tujuh halaman saling ditemukan; halaman legal muncul pada UI, bukan HTML awal |
| Gambar | Semua img dengan src pada crawl memiliki alt dan dimensi; decorative alt kosong sah | Gambar produk/branding bergantung pada render; Lighthouse menandai dimensi yang belum eksplisit |
| Error resource | Tidak ada respons resource ≥400 pada 7 run Lighthouse | Sama |
| Admin | Sampel `/admin` dan `/admin/login` mempunyai noindex | Robots memblokir jalur privat; akses/indeks seluruh akun bukan bagian uji transaksi |

Tidak adanya meta robots pada halaman publik Webkits bukan error: default-nya dapat diindeks. Tidak ada batas karakter title/description yang menjamin tampilan Google; panjang dipakai sebagai pedoman editorial, bukan penalti.

### Structured data dan identitas

HaloGlory sudah memakai Person, ProfessionalService, WebSite, BreadcrumbList, Service, FAQPage, serta Article pada sebagian studi kasus. Jangan menambahkan semua schema secara membabi buta. Ada inkonsistensi: entity dengan `@id` yang tetap (`#person`, `#service`, `#website`) mengganti properti `url` menjadi URL setiap halaman. Stabilkan URL entity ke profil/beranda; gunakan WebPage tersendiri untuk URL dokumen. Article tersedia pada dua studi kasus ID, belum pada pasangan Inggris. Hub layanan dapat menggunakan daftar Service yang sama dengan konten.

Webkits mempunyai Product+Offer pada dua produk, FAQPage di beranda/cara kerja, tetapi belum ada Organization/WebSite dan BreadcrumbList pada HTML yang diperiksa. Tambahkan identitas penerbit yang konsisten dan breadcrumb produk. Isi name Product dengan nama lengkap yang terlihat, brand dan SKU/identifier internal bila tersedia. Rating/review harus berasal dari pelanggan nyata; warning review yang tidak ada bukan alasan membuat rating.

**Jangan prioritaskan FAQ schema untuk mengejar kotak FAQ Google.** Dokumentasi Google menyatakan fitur FAQ rich result tidak tampil mulai **7 Mei 2026**. FAQ yang berguna tetap dipertahankan sebagai konten pembeli. [Pembaruan dokumentasi Google](https://developers.google.com/search/updates).

### Canonical tambahan

Varian HaloGlory `/index.html`, `/layanan.html`, dan `/layanan/` mengembalikan 200 tetapi mempunyai canonical ke URL pilihan. Ini sudah memberi sinyal konsolidasi, jadi bukan kegagalan indeks otomatis. Redirect langsung ke URL pilihan adalah penyempurnaan prioritas sedang. Audit sebelum menerapkan agar rewrite Apache tidak membentuk loop. Jangan redirect halaman EN ke ID.

### Kepercayaan, lokal, dan tautan antarsitus

HaloGlory menaut ke MGL Webkits melalui menu/footer “Templates”. Tidak ada tautan balik ke HaloGlory dalam tujuh HTML awal Webkits yang dicrawl. Tambahkan tautan kontekstual yang membantu pembeli: “Butuh website custom? Konsultasi dengan Manganju Glory” pada halaman yang sesuai; dari layanan HaloGlory, “Template website siap pakai MGL Webkits” untuk pengunjung yang cocok dengan produk. Ini navigasi dan identitas bisnis, bukan pengganti backlink editorial independen.

Prioritaskan studi kasus dengan bukti proses/hasil yang dapat dipublikasikan, profil profesional, dan credit proyek yang memang disepakati klien. Belum ada data untuk menyatakan jumlah/kualitas backlink rendah ataupun mengenakan skor domain authority. Jangan membeli paket backlink massal.

Jakarta/Jabodetabek: tampilkan cakupan sebenarnya, jadwal/cara konsultasi, dan contoh proyek relevan. Google Business Profile hanya dipertimbangkan jika bisnis memenuhi syarat kontak tatap muka dengan pelanggan; bisnis online-only tidak otomatis memenuhi syarat. Jangan membuat alamat kantor untuk SEO. [Kelayakan Business Profile](https://support.google.com/business/answer/13763036?hl=en).

### Pengukuran yang perlu dilengkapi

Pada sesi yang tersedia, GSC belum dapat dibaca. Hubungkan properti domain yang dimiliki pengguna untuk **kedua domain**, submit sitemap yang tepat, lalu periksa URL beranda, layanan, katalog, dan dua produk melalui URL Inspection. Periksa Page indexing, manual actions, security issues, Google-selected canonical, crawl terakhir, dan laporan Links. Jangan menganggap ketidaktersediaan akses sebagai tidak terindeks.

Tidak terlihat request GA/GTM/Plausible/Matomo pada sampel Lighthouse; ini bukan bukti tidak ada tracking server-side. Tetapkan event `generate_lead`, `click_whatsapp`, `view_item`, `begin_checkout`, dan `purchase` sesuai alur sebenarnya. `purchase` harus mengikuti pembayaran terverifikasi dan tidak terhitung dua kali. Ukur lead berkualitas atau pembelian dari organic search, bukan hanya traffic total.

Laporan pertama setelah akses: 90 hari dan perbandingan 28 hari; pecah brand/non-brand, Indonesia vs negara luar, mobile/desktop, dan query+page. Trafik kota dari Analytics tidak sama dengan lokasi ranking pencarian; GSC tidak menyediakan dimensi kota. Tracking Jakarta/Jabodetabek membutuhkan pengukuran SERP lokasi yang jelas.

## Peta keyword dan halaman

Keyword berikut adalah target yang disarankan dari produk/jasa yang nyata, bukan hasil pengukuran volume. Pertahankan URL yang sudah ada; keputusan merge/redirect berbasis performa memerlukan GSC.

| Kelompok target | URL pemilik | Usulan title / tindakan |
|---|---|---|
| Jasa pembuatan website; jasa website Indonesia | `https://haloglory.com/layanan` | Jasa Pembuatan Website Profesional Indonesia \| MGL |
| Konsultan website; Manganju Glory; HaloGlory | `https://haloglory.com/` | Pertahankan fokus brand/konsultasi; tambahkan tautan kontekstual menuju /layanan |
| Jasa website company profile | `https://haloglory.com/layanan/jasa-pembuatan-website-company-profile` | Title saat ini sudah relevan; tambah bukti dan scope |
| Jasa website toko online | `https://haloglory.com/layanan/jasa-pembuatan-website-ecommerce` | Pertahankan target e-commerce dan bukti integrasi nyata |
| Jasa pembuatan landing page | `https://haloglory.com/layanan/jasa-landing-page` | Title relevan; jelaskan offer, tracking, dan scope konversi |
| Jasa website WordPress | `https://haloglory.com/layanan/jasa-website-wordpress` | Pertahankan URL dan konten; hubungkan studi kasus |
| Jasa pembuatan website Jakarta/Jabodetabek | Usulan baru `/layanan/jasa-pembuatan-website-jakarta` | Buat hanya dengan bukti dan layanan regional yang benar; bukan duplikat hub |
| WordPress developer Indonesia; hire WordPress developer | `https://haloglory.com/en/services/wordpress-development` | Prioritas internasional awal; detail komunikasi, proses, ownership |
| Website design and development Indonesia | `https://haloglory.com/en/services` | Website Design & Development in Indonesia \| MGL |
| Template website premium; template website siap pakai | `https://mglwebkits.com/` | Template Website Premium Siap Pakai \| MGL Webkits |
| Koleksi template website bisnis | `https://mglwebkits.com/koleksi` | Koleksi Template Website untuk Bisnis \| MGL Webkits |
| Template website rental mobil | `https://mglwebkits.com/koleksi/swift` | Template Website Rental Mobil — Swift \| MGL Webkits |
| Template website travel; template agen wisata | `https://mglwebkits.com/koleksi/dotravel` | Template Website Travel — Dotravel \| MGL Webkits |
| Car rental website template; travel agency website template | Usulan `/en/collection/swift` dan `/en/collection/dotravel` | Setelah produk siap: halaman lengkap EN, checkout/support jelas, hreflang resiprokal |

Contoh description `/layanan`: “Jasa pembuatan website company profile, toko online, dan WordPress untuk bisnis di Indonesia. Lihat layanan, proses, dan konsultasi bersama MGL.”

Contoh description Swift: “Template website rental mobil Swift dengan halaman armada dan CTA WhatsApp. Lihat demo, isi paket, lisensi, dan opsi instalasi. Rp499.000.” Publikasikan hanya setelah tautan demo tersedia dan harga tetap benar.

Pola pesaing yang ditemukan dalam pencarian publik: [Indowebsite](https://www.indowebsite.co.id/jasa-pembuatan-website) menjelaskan paket, cakupan, dan waktu; katalog [Wix](https://id.wix.com/website/templates) dan [Hostinger](https://www.hostinger.com/id/templates) membantu memilih lewat preview dan kategori. Pembelajaran untuk dua situs: jawab keputusan pembeli secara konkret. Hasil ini bukan urutan ranking Google Jakarta yang terukur, dan tidak membuktikan harus meniru harga atau model bisnis mereka.

## Rencana 30 hari

| Waktu | Pekerjaan | Kriteria selesai |
|---|---|---|
| Hari 1–3 | Dapatkan akses GSC yang benar; routing 404; canonical/protokol Webkits; kebijakan demo | Baseline tersimpan, URL acak 404, varian host redirect, placeholder demo hilang |
| Hari 4–7 | Samakan SSR/UI halaman produk dan legal; optimasi font/gambar | Isi utama tersedia di HTML awal; metadata unik; ukur ulang LCP terisolasi |
| Minggu 2 | Perkuat /layanan, title katalog, dua produk, screenshot, versi/lisensi; selaraskan klaim | Halaman menjawab deliverable, biaya, bukti, support, dan CTA; tidak ada placeholder |
| Minggu 3 | Perkuat studi kasus/tautan kontekstual; halaman Jakarta jika bukti siap; 1 panduan biaya yang transparan | Landing page utama menerima tautan relevan; konten lokal punya nilai unik |
| Minggu 4 | Optimasi EN WordPress; siapkan dua produk EN bila siap; evaluasi GSC/konversi | Hreflang valid; event teruji; baseline query+page dan lead/purchase tercatat |

Usulan konten pendukung: biaya website company profile dan cakupannya; website custom vs template untuk kebutuhan berbeda; cara memilih template rental mobil; persiapan konten agen travel. Tulis dari pengalaman proyek dan keputusan nyata. Tidak perlu menerbitkan banyak artikel generik sekaligus.

Evaluasi awal 4 minggu menilai perbaikan crawl, discovery, query relevan, dan lead. Evaluasi ranking kompetitif perlu rentang lebih panjang; 30 hari adalah rencana kerja, bukan janji posisi. Tidak ada estimasi “+sekian klik/bulan” karena data impresi/CTR belum tersedia.

## Yang tidak diprioritaskan

- Mengejar badge SEO 100: seluruh sampel sudah 100, tetapi itu tidak menguji kemampuan mengalahkan kompetitor.
- FAQ rich result, pengubahan `changefreq`/priority sitemap, meta keywords, atau memenuhi panjang kata tertentu.
- Ratusan halaman kota/kategori tipis, rating fiktif, atau paket backlink. Fokus awal pada layanan dan produk yang benar-benar ada.

## Berkas bukti

- `haloglory.com/pages.csv`, `mglwebkits.com/pages.csv`: inventaris metadata per URL.
- `haloglory.com/crawl.json`, `mglwebkits.com/crawl.json`: hasil crawl dan HTML asli tersimpan bersebelahan.
- `route-checks.json`: host/protokol, URL alternatif, error, legal, dan root demo.
- `*.report.html` dan `*.report.json`: tujuh laporan Lighthouse.
- `observations.json`: keterbatasan akses, pemeriksaan render, dan konfigurasi demo.
- `implementation-backlog.csv`: tindakan yang dapat dikerjakan dan kriteria verifikasinya.

Dasar rekomendasi mengikuti temuan live dan dokumentasi resmi yang diakses saat audit. **Audit tidak menjanjikan ranking pertama.** Google sendiri menjelaskan tidak ada perubahan yang otomatis menempatkan situs di posisi pertama. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
