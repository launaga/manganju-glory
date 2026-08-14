// Config-driven list/table for collection content. Search, filters, sort,
// status badges, row actions (edit/publish/archive/delete), and optional
// up/down reordering. Shared by every collection admin page.
import { list, setStatus, remove, reorder, friendlyError, type Row } from './db';
import { toast, confirmDialog } from './ui';

export interface Column {
  key: string;
  label: string;
  render?: (row: Row) => string; // returns escaped HTML
}
export interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}
export interface ListConfig {
  table: string;
  title: string;
  columns: Column[];
  searchColumns?: string[];
  filters?: FilterDef[];
  defaultOrder?: { column: string; ascending?: boolean };
  hasStatus?: boolean;        // enables publish/archive + status badge
  hasPublishedAt?: boolean;   // stamp published_at on publish
  reorderable?: boolean;      // up/down buttons persisting display_order
  newHref?: string;
  editHref: (row: Row) => string;
  rowLabel: (row: Row) => string; // for confirm dialogs
}

export const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const statusBadge = (s: string) =>
  `<span class="badge badge-${esc(s)}">${s === 'published' ? 'Terbit' : s === 'draft' ? 'Draf' : 'Arsip'}</span>`;

export function renderList(root: HTMLElement, cfg: ListConfig): void {
  root.innerHTML = `
    <div class="list-toolbar">
      ${cfg.searchColumns?.length ? '<input class="input list-search" type="search" placeholder="Cari…" aria-label="Cari">' : ''}
      ${(cfg.filters ?? []).map((f) => `
        <select class="select list-filter" data-name="${f.name}" aria-label="${esc(f.label)}">
          <option value="all">${esc(f.label)}: Semua</option>
          ${f.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
        </select>`).join('')}
      <span class="list-spacer"></span>
      ${cfg.newHref ? `<a class="btn btn-primary btn-sm" href="${cfg.newHref}">+ Tambah</a>` : ''}
    </div>
    <div class="list-body" id="listBody" aria-live="polite"></div>`;

  const body = root.querySelector<HTMLElement>('#listBody')!;
  const searchEl = root.querySelector<HTMLInputElement>('.list-search');
  const filterEls = Array.from(root.querySelectorAll<HTMLSelectElement>('.list-filter'));
  let rows: Row[] = [];

  const skeleton = () => {
    body.innerHTML = '<div class="card" style="padding:16px">' +
      Array.from({ length: 4 }).map(() => '<div class="skeleton sk-line" style="width:80%"></div>').join('') + '</div>';
  };

  const empty = () =>
    `<div class="state"><h3>Belum ada data</h3><p>Buat item pertama untuk mulai.</p>` +
    (cfg.newHref ? `<a class="btn btn-primary btn-sm" href="${cfg.newHref}">+ Tambah</a>` : '') + `</div>`;

  const errorState = () =>
    `<div class="state"><h3>Gagal memuat</h3><p>Tidak dapat memuat data.</p>` +
    `<button class="btn btn-ghost btn-sm" id="retry">Coba lagi</button></div>`;

  const rowHtml = (r: Row, i: number) => {
    const cells = cfg.columns.map((c) => `<td>${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('');
    const status = cfg.hasStatus ? `<td>${statusBadge(r.status)}</td>` : '';
    const order = cfg.reorderable
      ? `<td class="row-order">
           <button class="icon-btn btn-xs" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Naik">↑</button>
           <button class="icon-btn btn-xs" data-act="down" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Turun">↓</button>
         </td>` : '';
    const pubBtns = cfg.hasStatus
      ? (r.status === 'published'
          ? `<button class="btn btn-ghost btn-xs" data-act="archive">Arsipkan</button>`
          : `<button class="btn btn-ghost btn-xs" data-act="publish">Terbitkan</button>`)
      : '';
    return `<tr data-id="${esc(r.id)}">
      ${cells}${status}${order}
      <td class="row-actions">
        <a class="btn btn-ghost btn-xs" href="${cfg.editHref(r)}">Edit</a>
        ${pubBtns}
        <button class="btn btn-danger btn-xs" data-act="delete">Hapus</button>
      </td></tr>`;
  };

  const draw = () => {
    if (rows.length === 0) { body.innerHTML = empty(); return; }
    const heads = cfg.columns.map((c) => `<th>${esc(c.label)}</th>`).join('') +
      (cfg.hasStatus ? '<th>Status</th>' : '') + (cfg.reorderable ? '<th>Urut</th>' : '') + '<th></th>';
    body.innerHTML =
      `<div class="table-wrap"><table class="data-table"><thead><tr>${heads}</tr></thead>` +
      `<tbody>${rows.map(rowHtml).join('')}</tbody></table></div>`;
  };

  const load = async () => {
    skeleton();
    try {
      const filters: Record<string, any> = {};
      for (const f of filterEls) if (f.value !== 'all') filters[f.dataset.name!] = f.value;
      rows = await list(cfg.table, {
        search: searchEl?.value, searchColumns: cfg.searchColumns,
        filters, order: cfg.defaultOrder,
      });
      draw();
    } catch (e) {
      body.innerHTML = errorState();
      body.querySelector('#retry')?.addEventListener('click', load);
    }
  };

  // search debounce + filters
  let t: any;
  searchEl?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); });
  filterEls.forEach((f) => f.addEventListener('change', load));

  // row action delegation
  body.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!btn) return;
    const tr = btn.closest('tr')!; const id = tr.dataset.id!;
    const row = rows.find((r) => r.id === id)!;
    const act = btn.dataset.act!;
    try {
      if (act === 'publish') { await setStatus(cfg.table, id, 'published', cfg.hasPublishedAt); toast('Diterbitkan.', 'ok'); await load(); }
      else if (act === 'archive') { await setStatus(cfg.table, id, 'archived', cfg.hasPublishedAt); toast('Diarsipkan.', 'ok'); await load(); }
      else if (act === 'delete') {
        const yes = await confirmDialog({ title: 'Hapus item ini?', message: `“${cfg.rowLabel(row)}” akan dihapus permanen.`, confirmText: 'Hapus', danger: true });
        if (yes) { await remove(cfg.table, id); toast('Dihapus.', 'ok'); await load(); }
      } else if (act === 'up' || act === 'down') {
        const idx = rows.findIndex((r) => r.id === id);
        const j = act === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= rows.length) return;
        const ids = rows.map((r) => r.id);
        [ids[idx], ids[j]] = [ids[j], ids[idx]];
        await reorder(cfg.table, ids);
        await load();
      }
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  });

  load();
}
