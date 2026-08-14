// Reusable Media Library picker modal. Used by every CMS image field so upload
// logic is never duplicated. Resolves the chosen MediaItem (or null on cancel).
import { listMedia, uploadOne, validateFile, FOLDERS, type MediaItem, type Folder } from './media';
import { friendlyError } from './db';
import { toast } from './ui';

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function openMediaPicker(opts: { folder?: Folder } = {}): Promise<MediaItem | null> {
  return new Promise((resolve) => {
    let items: MediaItem[] = [];
    let selected: MediaItem | null = null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Pilih media');
    overlay.innerHTML = `
      <div class="modal media-modal" role="document">
        <div class="media-modal-head">
          <h3>Pustaka Media</h3>
          <div class="media-modal-tools">
            <input class="input mp-search" type="search" placeholder="Cari…" aria-label="Cari media">
            <select class="select mp-folder" aria-label="Folder">
              <option value="all">Semua folder</option>
              ${FOLDERS.map((f) => `<option value="${f}" ${opts.folder === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
            <label class="btn btn-ghost btn-sm mp-upload-label">Unggah<input type="file" accept="image/*" multiple hidden class="mp-upload"></label>
          </div>
        </div>
        <div class="media-grid mp-grid" aria-live="polite"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">Batal</button>
          <button class="btn btn-primary" data-act="use" disabled>Gunakan Gambar</button>
        </div>
      </div>`;

    const grid = overlay.querySelector<HTMLElement>('.mp-grid')!;
    const search = overlay.querySelector<HTMLInputElement>('.mp-search')!;
    const folder = overlay.querySelector<HTMLSelectElement>('.mp-folder')!;
    const useBtn = overlay.querySelector<HTMLButtonElement>('[data-act="use"]')!;
    const fileInput = overlay.querySelector<HTMLInputElement>('.mp-upload')!;

    const close = (val: MediaItem | null) => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(val); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };

    const draw = () => {
      if (items.length === 0) { grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>Belum ada media</h3><p>Unggah gambar pertama.</p></div>`; return; }
      grid.innerHTML = items.map((m) => `
        <button type="button" class="media-card ${selected?.id === m.id ? 'selected' : ''}" data-id="${esc(m.id)}" title="${esc(m.file_name)}">
          <span class="media-thumb"><img src="${esc(m.public_url)}" alt="${esc(m.alt_id || m.file_name)}" loading="lazy"></span>
          <span class="media-name">${esc(m.file_name)}</span>
        </button>`).join('');
    };

    const load = async () => {
      grid.innerHTML = Array.from({ length: 8 }).map(() => '<div class="media-card"><span class="media-thumb skeleton"></span></div>').join('');
      try { items = await listMedia({ search: search.value, folder: folder.value, sort: 'newest' }); draw(); }
      catch (e) { grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>Gagal memuat</h3><p>${esc(friendlyError(e))}</p></div>`; }
    };

    let t: any;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); });
    folder.addEventListener('change', load);
    grid.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
      if (!card?.dataset.id) return;
      selected = items.find((m) => m.id === card.dataset.id) ?? null;
      useBtn.disabled = !selected;
      grid.querySelectorAll('.media-card').forEach((c) => c.classList.toggle('selected', (c as HTMLElement).dataset.id === selected?.id));
    });
    fileInput.addEventListener('change', async () => {
      const files = Array.from(fileInput.files ?? []); if (!files.length) return;
      const f = folder.value === 'all' ? 'general' : (folder.value as Folder);
      let okCount = 0;
      for (const file of files) {
        const bad = validateFile(file);
        if (bad) { toast(bad, 'error'); continue; }
        try { await uploadOne(file, f); okCount++; } catch (e) { toast(friendlyError(e), 'error'); }
      }
      if (okCount) { toast(`${okCount} gambar terunggah.`, 'ok'); await load(); }
      fileInput.value = '';
    });
    overlay.addEventListener('click', (e) => {
      const t2 = e.target as HTMLElement;
      if (t2 === overlay || t2.dataset.act === 'cancel') return close(null);
      if (t2.dataset.act === 'use' && selected) return close(selected);
    });

    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    load();
  });
}
