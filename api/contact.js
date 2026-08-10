// Vercel Serverless Function — POST /api/contact
// Receives the contact form and emails it to Glory via Resend.
// Requires env var: RESEND_API_KEY  (set it in Vercel → Project → Settings → Environment Variables)

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Where enquiries are delivered, and the verified "from" address.
const TO = 'manganjuglory@gmail.com';
// Until you verify your own domain in Resend, use their test sender below.
// After verifying (e.g. manganjulaurencius.com), change this to something like
// "Portfolio <hello@manganjulaurencius.com>".
const FROM = 'Portfolio <onboarding@resend.dev>';

const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

// Attachment limits. These are re-checked here and not merely trusted from the
// browser: anything can POST to this endpoint directly. Vercel rejects request
// bodies over 4.5MB and base64 inflates ~33%, so 3MB raw is the real ceiling.
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
const ALLOWED_EXT = /\.(pdf|docx?|png|jpe?g|webp|txt|zip)$/i;

// Strip any directory component and header-injection characters from a filename.
const safeName = (n) =>
  String(n).split(/[\\/]/).pop().replace(/[\r\n"]/g, '').trim().slice(0, 120);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Layanan email belum dikonfigurasi.' });
  }

  try {
    // Vercel parses JSON bodies automatically when Content-Type is application/json
    const { name = '', email = '', message = '', company = '', attachments = [] } = req.body || {};

    // Honeypot: real users never fill "company"; bots often do.
    if (company) return res.status(200).json({ ok: true });

    const n = String(name).trim();
    const e = String(email).trim();
    const m = String(message).trim();

    if (!n || !e || !m) return res.status(400).json({ error: 'Mohon lengkapi semua kolom.' });
    if (!isEmail(e)) return res.status(400).json({ error: 'Alamat email itu sepertinya keliru.' });
    if (m.length > 5000) return res.status(400).json({ error: 'Pesannya agak terlalu panjang — mohon dipersingkat sedikit.' });

    const files = [];
    if (attachments != null && attachments !== '') {
      if (!Array.isArray(attachments)) return res.status(400).json({ error: 'Lampiran tidak valid.' });
      if (attachments.length > MAX_FILES) return res.status(400).json({ error: `Maksimal ${MAX_FILES} lampiran.` });

      let total = 0;
      for (const a of attachments) {
        const filename = safeName(a && a.filename);
        const content = String((a && a.content) || '');
        if (!filename || !content) return res.status(400).json({ error: 'Lampiran tidak valid.' });
        if (!ALLOWED_EXT.test(filename)) return res.status(400).json({ error: `Tipe file tidak didukung: ${filename}` });

        const buf = Buffer.from(content, 'base64');
        if (!buf.length) return res.status(400).json({ error: `Lampiran kosong atau rusak: ${filename}` });
        total += buf.length;
        if (total > MAX_TOTAL_BYTES) return res.status(400).json({ error: 'Total lampiran melebihi 3 MB.' });

        files.push({ filename, content: buf });
      }
    }

    const fileNote = files.length
      ? `\n\nLampiran (${files.length}): ${files.map((f) => f.filename).join(', ')}`
      : '';

    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: e,
      subject: `Pertanyaan proyek baru dari ${n}`,
      text: `${m}\n\n— ${n} (${e})${fileNote}`,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">
        <p style="white-space:pre-wrap">${escapeHtml(m)}</p>
        <hr style="border:none;border-top:1px solid #ddd">
        <p style="color:#555">Dari <strong>${escapeHtml(n)}</strong> — <a href="mailto:${escapeHtml(e)}">${escapeHtml(e)}</a></p>
        ${files.length ? `<p style="color:#555">Lampiran (${files.length}): ${files.map((f) => escapeHtml(f.filename)).join(', ')}</p>` : ''}
      </div>`,
      ...(files.length ? { attachments: files } : {}),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact error:', err);
    return res.status(500).json({ error: 'Gagal mengirim saat ini. Silakan hubungi langsung via WhatsApp.' });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
