// Sumber tunggal untuk konstanta situs + string "chrome" (nav, footer, langtoggle,
// loader, CTA) dalam dua bahasa. Konten badan tiap halaman ada di masing-masing
// file .astro; di sini hanya elemen yang berulang di seluruh halaman.

export type Lang = 'id' | 'en';

export const PHONE = '6285927277560';
export const PHONE_DISPLAY_ID = '0859 2727 7560';
export const PHONE_DISPLAY_EN = '+62 859 2727 7560';
export const EMAIL = 'manganjuglory@gmail.com';

export const WA_ID =
  `https://wa.me/${PHONE}?text=Hi!%20Saya%20ingin%20Konsultasi%20Website...`;
export const WA_EN =
  `https://wa.me/${PHONE}?text=Hi!%20I'd%20like%20to%20talk%20about%20a%20website%20project...`;

export const wa = (lang: Lang) => (lang === 'id' ? WA_ID : WA_EN);

export interface NavItem {
  idx: string;
  href: string;
  label: string;
}

// Menu 7 item, identik strukturnya di kedua bahasa (EN kini juga punya Design System).
export const NAV: Record<Lang, NavItem[]> = {
  id: [
    { idx: '/01', href: '/', label: 'Beranda' },
    { idx: '/02', href: '/tentang', label: 'Tentang' },
    { idx: '/03', href: '/layanan', label: 'Layanan' },
    { idx: '/04', href: '/harga', label: 'Harga' },
    { idx: '/05', href: '/portofolio', label: 'Portofolio' },
    { idx: '/06', href: '/sistem-desain', label: 'Sistem Desain' },
    { idx: '/07', href: '/kontak', label: 'Kontak' },
  ],
  en: [
    { idx: '/01', href: '/en', label: 'Home' },
    { idx: '/02', href: '/en/about', label: 'About' },
    { idx: '/03', href: '/en/services', label: 'Services' },
    { idx: '/04', href: '/en/pricing', label: 'Pricing' },
    { idx: '/05', href: '/en/work', label: 'Work' },
    { idx: '/06', href: '/en/design-system', label: 'Design System' },
    { idx: '/07', href: '/en/contact', label: 'Contact' },
  ],
};

export const UI = {
  id: {
    htmlLang: 'id-ID',
    ogLocale: 'id_ID',
    ogLocaleAlt: 'en_US',
    skipToLang: 'English',
    loader: 'Memuat kejelasan',
    menuOpen: 'Buka menu',
    menuClose: '[ TUTUP ]',
    navCta: 'Konsultasi Gratis',
    mmCta: 'Konsultasi Gratis ↗',
    brandHome: 'Manganju Glory — beranda',
    footerBlurb:
      'Konsultan, desainer, dan developer website independen. Saya membuat website yang membuat bisnis lebih mudah dipahami.',
    footerMenu: '/ Menu',
    footerContact: '/ Hubungi saya',
    footerWa: `WhatsApp — ${PHONE_DISPLAY_ID}`,
    footerEmail: EMAIL,
    footerCta: 'Konsultasi Gratis ↗',
    footerRights: '©2026 Manganju Glory Laurencius — Seluruh Hak Cipta.',
    footerTag: 'Kejelasan sebelum palet warna.',
    mailtoSubject: 'Pertanyaan%20Proyek',
  },
  en: {
    htmlLang: 'en-US',
    ogLocale: 'en_US',
    ogLocaleAlt: 'id_ID',
    skipToLang: 'Bahasa Indonesia',
    loader: 'Loading clarity',
    menuOpen: 'Open menu',
    menuClose: '[ CLOSE ]',
    navCta: 'Free Consultation',
    mmCta: 'Free Consultation ↗',
    brandHome: 'Manganju Glory — home',
    footerBlurb:
      'Independent website consultant, designer, and developer. I build websites that make businesses easier to understand.',
    footerMenu: '/ Menu',
    footerContact: '/ Get in touch',
    footerWa: `WhatsApp — ${PHONE_DISPLAY_EN}`,
    footerEmail: EMAIL,
    footerCta: 'Free Consultation ↗',
    footerRights: '©2026 Manganju Glory Laurencius — All rights reserved.',
    footerTag: 'Clarity before colour palettes.',
    mailtoSubject: 'Project%20enquiry',
  },
} as const;
