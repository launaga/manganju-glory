// Admin inbox for contact_submissions. List → detail modal, with mark-read /
// archive / delete, search, status filter, newest-first. Reuses the shared
// data layer + toast/confirm. Kept intentionally small (not a CRM).
import { list, update, remove, friendlyError, type Row } from './db';
import { toast, confirmDialog } from './ui';
import { esc } from './list';

const fmtDate = (v: string) =>
  new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const badge = (s: string) =>
  `<span class="badge badge-${s === 'new' ? 'draft' : s === 'archived' ? 'archived' : 'published'}">${s === 'new' ? 'Baru' : s === 'read' ? 'Dibaca' : 'Arsip'}</span>`;

export function initMessages(root: HTMLElement): void {
  let rows: Row[] = [];

  root.innerHTML = `
    <div class="list-toolbar">
      <input class="input list-search msg-search" type="search" placeholder="Cari nama / email / pesan…" aria-label="Cari pesan">
      <select class="select msg-filter" aria-label="Status">
        <option value="all">Semua status</option>
        <option value="new">Baru</option>
        <option value="read">Dibaca</option>
        <option value="archived">Arsip</option>
      </select>
    </div>
    <div class="list-body" id="msgBody" aria-live="polite"></div>`;

  const body = root.querySelector<HTMLElement>('#msgBody')!;
  const search = root.querySelector<HTMLInputElement>('.msg-search')!;
  const filter = root.querySelector<HTMLSelectElement>('.msg-filter')!;

  const draw = () => {
    if (rows.length === 0) {
      body.innerHTML = `<div class="state"><h3>Belum ada pesan</h3><p>Pesan dari formulir kontak akan muncul di sini.</p></div>`;
      return;
    }
    body.innerHTML =
      `<div class="table-wrap"><table class="data-table"><thead><tr>
        <th>Nama</th><th>Email</th><th>Pesan</th><th>Status</th><th>Tanggal</th><th></th></tr></thead><tbody>` +
      rows.map((m) => `<tr data-id="${esc(m.id)}" class="${m.status === 'new' ? 'msg-unread' : ''}">
        <td><strong>${esc(m.name)}</strong></td>
        <td>${esc(m.email)}</td>
        <td>${esc(String(m.message).slice(0, 60))}${String(m.message).length > 60 ? '…' : ''}</td>
        <td>${badge(m.status)}</td>
        <td>${esc(fmtDate(m.created_at))}</td>
        <td class="row-actions"><button class="btn btn-ghost btn-xs" data-act="open">Buka</button></td>
      </tr>`).join('') + `</tbody></table></div>`;
  };

  const load = async () => {
    body.innerHTML = '<div class="card" style="padding:16px"><div class="skeleton sk-line" style="width:70%"></div><div class="skeleton sk-line" style="width:50%"></div></div>';
    try {
      const filters: Record<string, any> = {};
      if (filter.value !== 'all') filters.status = filter.value;
      rows = await list('contact_submissions', {
        search: search.value, searchColumns: ['name', 'email', 'message'],
        filters, order: { column: 'created_at', ascending: false },
      });
      draw();
    } catch (e) {
      body.innerHTML = `<div class="state"><h3>Gagal memuat</h3><p>Tidak dapat memuat pesan.</p><button class="btn btn-ghost btn-sm" id="msgRetry">Coba lagi</button></div>`;
      body.querySelector('#msgRetry')?.addEventListener('click', load);
    }
  };

  const openDetail = async (m: Row) => {
    // Opening a "new" message marks it read.
    if (m.status === 'new') { try { await update('contact_submissions', m.id, { status: 'read' }); m.status = 'read'; } catch { /* non-fatal */ } }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `<div class="modal" role="document" style="max-width:560px">
      <h3>Pesan dari ${esc(m.name)}</h3>
      <dl class="drawer-meta" style="margin:0 0 14px">
        <div><dt>Email</dt><dd><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></dd></div>
        <div><dt>Tanggal</dt><dd>${esc(fmtDate(m.created_at))}</dd></div>
        <div><dt>Status</dt><dd>${badge(m.status)}</dd></div>
      </dl>
      <div class="msg-full">${esc(m.message)}</div>
      <div class="modal-actions" style="margin-top:18px">
        <a class="btn btn-ghost" href="mailto:${esc(m.email)}?subject=Re:%20pesan%20Anda">Balas via email</a>
        <button class="btn btn-ghost" data-act="archive">Arsipkan</button>
        <button class="btn btn-danger" data-act="del">Hapus</button>
        <button class="btn btn-primary" data-act="close">Tutup</button>
      </div></div>`;
    const close = () => { document.removeEventListener('keydown', onKey); overlay.remove(); load(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', async (e) => {
      const t = e.target as HTMLElement; const act = t.dataset.act;
      if (t === overlay || act === 'close') return close();
      try {
        if (act === 'archive') { await update('contact_submissions', m.id, { status: 'archived' }); toast('Diarsipkan.', 'ok'); close(); }
        else if (act === 'del') {
          const yes = await confirmDialog({ title: 'Hapus pesan ini?', message: 'Pesan akan dihapus permanen.', confirmText: 'Hapus', danger: true });
          if (yes) { await remove('contact_submissions', m.id); toast('Dihapus.', 'ok'); close(); }
        }
      } catch (err) { toast(friendlyError(err), 'error'); }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  };

  body.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-act="open"]') as HTMLElement | null;
    if (!btn) return;
    const id = btn.closest('tr')!.dataset.id!;
    const m = rows.find((r) => r.id === id); if (m) openDetail(m);
  });

  let t: any;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); });
  filter.addEventListener('change', load);
  load();
}
