// Media Library page controller: responsive grid, multi-upload with per-file
// status, search/filter/sort, and a detail drawer (edit alt/folder, copy URL,
// reference-protected delete). Reuses the shared toast/confirm + media layer.
import {
  listMedia, uploadOne, validateFile, updateMediaMeta, deleteMedia, findReferences,
  copyToClipboard, FOLDERS, friendlyError, type MediaItem, type Folder,
} from './media';
import { toast, confirmDialog } from './ui';

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fmtSize = (b: number | null) => (b == null ? '—' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const fmtDate = (v: string) => new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export function initMediaLibrary(root: HTMLElement): void {
  let items: MediaItem[] = [];

  root.innerHTML = `
    <div class="list-toolbar">
      <input class="input list-search ml-search" type="search" placeholder="Cari nama / alt…" aria-label="Cari media">
      <select class="select ml-folder" aria-label="Folder">
        <option value="all">Semua folder</option>
        ${FOLDERS.map((f) => `<option value="${f}">${f}</option>`).join('')}
      </select>
      <select class="select ml-sort" aria-label="Urutkan">
        <option value="newest">Terbaru</option>
        <option value="oldest">Terlama</option>
        <option value="name">Nama</option>
      </select>
      <span class="list-spacer"></span>
      <label class="btn btn-primary btn-sm ml-upload-label">+ Unggah Media<input class="ml-upload" type="file" accept="image/*" multiple hidden></label>
    </div>
    <div class="ml-progress" id="mlProgress" hidden></div>
    <div class="media-grid" id="mlGrid" aria-live="polite"></div>
    <div class="drawer-scrim" id="mlScrim" hidden></div>
    <aside class="media-drawer" id="mlDrawer" aria-hidden="true"></aside>`;

  const grid = root.querySelector<HTMLElement>('#mlGrid')!;
  const search = root.querySelector<HTMLInputElement>('.ml-search')!;
  const folder = root.querySelector<HTMLSelectElement>('.ml-folder')!;
  const sort = root.querySelector<HTMLSelectElement>('.ml-sort')!;
  const upload = root.querySelector<HTMLInputElement>('.ml-upload')!;
  const progress = root.querySelector<HTMLElement>('#mlProgress')!;
  const drawer = root.querySelector<HTMLElement>('#mlDrawer')!;
  const scrim = root.querySelector<HTMLElement>('#mlScrim')!;

  const draw = () => {
    if (items.length === 0) {
      grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>Belum ada media</h3><p>Unggah gambar pertama untuk dipakai di seluruh portofolio.</p><label class="btn btn-primary btn-sm ml-upload-label">+ Unggah Media<input class="ml-upload2" type="file" accept="image/*" multiple hidden></label></div>`;
      grid.querySelector<HTMLInputElement>('.ml-upload2')?.addEventListener('change', (e) => handleFiles((e.target as HTMLInputElement).files));
      return;
    }
    grid.innerHTML = items.map((m) => `
      <button type="button" class="media-card" data-id="${esc(m.id)}" title="${esc(m.file_name)}">
        <span class="media-thumb"><img src="${esc(m.public_url)}" alt="${esc(m.alt_id || m.file_name)}" loading="lazy"></span>
        <span class="media-name">${esc(m.file_name)}</span>
        <span class="media-meta">${esc(m.folder)}${m.width ? ` · ${m.width}×${m.height}` : ''}</span>
      </button>`).join('');
  };

  const load = async () => {
    grid.innerHTML = Array.from({ length: 10 }).map(() => '<div class="media-card"><span class="media-thumb skeleton"></span></div>').join('');
    try { items = await listMedia({ search: search.value, folder: folder.value, sort: sort.value as any }); draw(); }
    catch (e) { grid.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>Gagal memuat</h3><p>Tidak dapat memuat media.</p><button class="btn btn-ghost btn-sm" id="mlRetry">Coba lagi</button></div>`; grid.querySelector('#mlRetry')?.addEventListener('click', load); }
  };

  // multi-upload with per-file status
  const handleFiles = async (fl: FileList | null) => {
    const files = Array.from(fl ?? []); if (!files.length) return;
    const f = folder.value === 'all' ? 'general' : (folder.value as Folder);
    progress.hidden = false;
    progress.innerHTML = files.map((file, i) => `<div class="up-row" data-i="${i}"><span class="up-name">${esc(file.name)}</span><span class="up-state">Menunggu…</span></div>`).join('');
    const setState = (i: number, text: string, cls: string) => {
      const s = progress.querySelector(`.up-row[data-i="${i}"] .up-state`) as HTMLElement | null;
      if (s) { s.textContent = text; s.className = 'up-state ' + cls; }
    };
    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      const bad = validateFile(files[i]);
      if (bad) { setState(i, 'Ditolak', 'err'); fail++; continue; }
      setState(i, 'Mengunggah…', '');
      try { await uploadOne(files[i], f); setState(i, 'Selesai', 'ok'); ok++; }
      catch (e) { setState(i, 'Gagal', 'err'); fail++; }
    }
    if (ok) toast(`${ok} gambar terunggah.`, 'ok');
    if (fail) toast(`${fail} gagal diunggah.`, 'error');
    await load();
    setTimeout(() => { progress.hidden = true; progress.innerHTML = ''; }, 2500);
    upload.value = '';
  };
  upload.addEventListener('change', () => handleFiles(upload.files));

  // detail drawer
  const closeDrawer = () => { drawer.classList.remove('open'); scrim.hidden = true; drawer.setAttribute('aria-hidden', 'true'); };
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  const openDrawer = (m: MediaItem) => {
    drawer.innerHTML = `
      <div class="drawer-head"><h3>Detail Media</h3><button class="icon-btn" id="dClose" aria-label="Tutup">✕</button></div>
      <div class="drawer-body">
        <div class="drawer-preview"><img src="${esc(m.public_url)}" alt="${esc(m.alt_id || m.file_name)}"></div>
        <dl class="drawer-meta">
          <div><dt>Nama</dt><dd>${esc(m.file_name)}</dd></div>
          <div><dt>Tipe</dt><dd>${esc(m.mime_type ?? '—')}</dd></div>
          <div><dt>Ukuran</dt><dd>${esc(fmtSize(m.file_size))}</dd></div>
          <div><dt>Dimensi</dt><dd>${m.width ? `${m.width}×${m.height}px` : '—'}</dd></div>
          <div><dt>Diunggah</dt><dd>${esc(fmtDate(m.created_at))}</dd></div>
        </dl>
        <div class="field"><label>Alt text (ID)</label><input class="input" id="dAltId" value="${esc(m.alt_id ?? '')}"></div>
        <div class="field"><label>Alt text (EN)</label><input class="input" id="dAltEn" value="${esc(m.alt_en ?? '')}"></div>
        <div class="field"><label>Folder</label><select class="select" id="dFolder">${FOLDERS.map((f) => `<option ${f === m.folder ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="drawer-actions">
          <button class="btn btn-primary btn-sm" id="dSave">Simpan</button>
          <button class="btn btn-ghost btn-sm" id="dCopy">Salin URL</button>
          <button class="btn btn-danger btn-sm" id="dDelete">Hapus</button>
        </div>
      </div>`;
    drawer.classList.add('open'); scrim.hidden = false; drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelector('#dClose')!.addEventListener('click', closeDrawer);
    drawer.querySelector('#dCopy')!.addEventListener('click', async () => { await copyToClipboard(m.public_url); toast('URL gambar disalin.', 'ok'); });
    drawer.querySelector('#dSave')!.addEventListener('click', async () => {
      const btn = drawer.querySelector('#dSave') as HTMLButtonElement; btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await updateMediaMeta(m.id, {
          alt_id: (drawer.querySelector('#dAltId') as HTMLInputElement).value.trim(),
          alt_en: (drawer.querySelector('#dAltEn') as HTMLInputElement).value.trim(),
          folder: (drawer.querySelector('#dFolder') as HTMLSelectElement).value,
        });
        toast('Metadata disimpan.', 'ok'); await load();
      } catch (e) { toast(friendlyError(e), 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Simpan'; }
    });
    drawer.querySelector('#dDelete')!.addEventListener('click', async () => {
      // reference protection
      let refs; try { refs = await findReferences(m.public_url); } catch { refs = []; }
      if (refs.length > 0) {
        const total = refs.reduce((n, r) => n + r.count, 0);
        await confirmDialog({ title: 'Gambar sedang dipakai', message: `Gambar ini digunakan oleh ${total} konten (${refs.map((r) => r.label).join(', ')}). Lepaskan dulu referensinya sebelum menghapus.`, confirmText: 'Mengerti', cancelText: 'Tutup' });
        return;
      }
      const yes = await confirmDialog({ title: 'Hapus gambar ini?', message: 'File akan dihapus dari pustaka media. Tindakan ini tidak dapat dibatalkan.', confirmText: 'Hapus', danger: true });
      if (!yes) return;
      try { await deleteMedia(m); toast('Gambar dihapus.', 'ok'); closeDrawer(); await load(); }
      catch (e) { toast(friendlyError(e), 'error'); }
    });
  };

  grid.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
    if (!card?.dataset.id) return;
    const m = items.find((x) => x.id === card.dataset.id); if (m) openDrawer(m);
  });

  let t: any;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); });
  folder.addEventListener('change', load);
  sort.addEventListener('change', load);

  load();
}
