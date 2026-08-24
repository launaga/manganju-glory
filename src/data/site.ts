// Sumber tunggal untuk konstanta situs + string "chrome" (nav, footer, langtoggle,
// loader, CTA) dalam dua bahasa. Nilai yang bisa diedit lewat admin (kontak, CTA,
// footer) diambil dari settings.json; sisanya (label menu, loader) tetap di kode.
import S from './settings.json';

export type Lang = 'id' | 'en';

export const PHONE = S.phone;
export const PHONE_DISPLAY_ID = S.phoneDisplayId;
export const PHONE_DISPLAY_EN = S.phoneDisplayEn;
export const EMAIL = S.email;

export const WA_ID = `https://wa.me/${PHONE}?text=${encodeURIComponent(S.waText_id)}`;
export const WA_EN = `https://wa.me/${PHONE}?text=${encodeURIComponent(S.waText_en)}`;

export const wa = (lang: Lang) => (lang === 'id' ? WA_ID : WA_EN);

export interface NavItem {
  idx: string;
  href: string;
  label: string;
  external?: boolean;
}

// Menu identik strukturnya di kedua bahasa. Templates menuju produk eksternal.
export const NAV: Record<Lang, NavItem[]> = {
  id: [
    { idx: '/01', href: '/', label: 'Beranda' },
    { idx: '/02', href: '/tentang', label: 'Tentang' },
    { idx: '/03', href: '/layanan', label: 'Layanan' },
    { idx: '/04', href: '/portofolio', label: 'Portofolio' },
    { idx: '/05', href: 'https://mglwebkits.com/', label: 'Templates', external: true },
    { idx: '/06', href: '/kontak', label: 'Kontak' },
  ],
  en: [
    { idx: '/01', href: '/en', label: 'Home' },
    { idx: '/02', href: '/en/about', label: 'About' },
    { idx: '/03', href: '/en/services', label: 'Services' },
    { idx: '/04', href: '/en/work', label: 'Work' },
    { idx: '/05', href: 'https://mglwebkits.com/', label: 'Templates', external: true },
    { idx: '/06', href: '/en/contact', label: 'Contact' },
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
    navCta: S.navCta_id,
    mmCta: `${S.navCta_id} ↗`,
    brandHome: 'Manganju Glory — beranda',
    footerBlurb: S.footerBlurb_id,
    footerMenu: '/ Menu',
    footerContact: '/ Hubungi saya',
    footerWa: `WhatsApp — ${PHONE_DISPLAY_ID}`,
    footerEmail: EMAIL,
    footerCta: `${S.navCta_id} ↗`,
    footerRights: S.footerRights_id,
    footerTag: S.footerTagline_id,
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
    navCta: S.navCta_en,
    mmCta: `${S.navCta_en} ↗`,
    brandHome: 'Manganju Glory — home',
    footerBlurb: S.footerBlurb_en,
    footerMenu: '/ Menu',
    footerContact: '/ Get in touch',
    footerWa: `WhatsApp — ${PHONE_DISPLAY_EN}`,
    footerEmail: EMAIL,
    footerCta: `${S.navCta_en} ↗`,
    footerRights: S.footerRights_en,
    footerTag: S.footerTagline_en,
    mailtoSubject: 'Project%20enquiry',
  },
} as const;
