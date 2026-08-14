// Shared editor for collection content (new + edit). Renders the config-driven
// form plus a consistent action bar (Save Draft / Publish / Archive / Delete /
// Preview) and wires validation, dirty-guard, slug handling, and redirects.
import { renderForm, guardUnsaved, type Field } from './form';
import {
  getOne, insert, update, remove, setStatus, nextOrder, friendlyError, type Row,
} from './db';
import { toast, confirmDialog } from './ui';

export interface EditorConfig {
  table: string;
  fields: Field[];
  listHref: string;
  hasStatus?: boolean;
  hasPublishedAt?: boolean;
  reorderable?: boolean;             // assign display_order on create
  createDefaults?: Row;
  rowLabel?: (v: Row) => string;
  editHref: (id: string) => string;
  previewHref?: (v: Row) => string | null; // null → preview not available yet
}

export async function initEditor(root: HTMLElement, cfg: EditorConfig, id?: string): Promise<void> {
  root.innerHTML = '<div class="card" style="padding:16px"><div class="skeleton sk-line" style="width:60%"></div><div class="skeleton sk-line" style="width:80%"></div></div>';

  let initial: Row = cfg.createDefaults ? { ...cfg.createDefaults } : {};
  if (id) {
    try {
      const row = await getOne(cfg.table, id);
      if (!row) { root.innerHTML = '<div class="state"><h3>Tidak ditemukan</h3><p>Item ini tidak ada atau telah dihapus.</p><a class="btn btn-ghost btn-sm" href="' + cfg.listHref + '">Kembali</a></div>'; return; }
      initial = row;
    } catch (e) {
      root.innerHTML = '<div class="state"><h3>Gagal memuat</h3><p>' + friendlyError(e) + '</p></div>';
      return;
    }
  }

  root.innerHTML = '<div class="editor-form" id="editorForm"></div><div class="editor-actions" id="editorActions"></div>';
  const formEl = root.querySelector<HTMLElement>('#editorForm')!;
  const actions = root.querySelector<HTMLElement>('#editorActions')!;
  const api = renderForm(formEl, cfg.fields, initial);
  const detach = guardUnsaved(api);

  const status = initial.status as string | undefined;
  actions.innerHTML = `
    <button class="btn btn-ghost" id="saveDraft">Simpan Draf</button>
    ${cfg.hasStatus ? '<button class="btn btn-primary" id="publish">Terbitkan</button>' : '<button class="btn btn-primary" id="saveOnly">Simpan</button>'}
    ${cfg.previewHref ? '<button class="btn btn-ghost" id="preview">Pratinjau</button>' : ''}
    ${id && cfg.hasStatus && status === 'published' ? '<button class="btn btn-ghost" id="archive">Arsipkan</button>' : ''}
    <span class="list-spacer"></span>
    ${id ? '<button class="btn btn-danger" id="del">Hapus</button>' : ''}
    <span class="dirty-flag" id="dirtyFlag" hidden>• Perubahan belum disimpan</span>`;

  const dirtyFlag = root.querySelector<HTMLElement>('#dirtyFlag')!;
  api.onDirty((d) => (dirtyFlag.hidden = !d));

  const busy = (on: boolean) =>
    actions.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = on));

  const save = async (targetStatus?: 'draft' | 'published'): Promise<string | null> => {
    const res = await api.validate();
    if (!res.ok) { toast(res.firstError ?? 'Periksa kembali isian.', 'error'); return null; }
    const values = api.getValues();
    const patch: Row = { ...values };
    if (cfg.hasStatus && targetStatus) {
      patch.status = targetStatus;
      if (cfg.hasPublishedAt && targetStatus === 'published' && !initial.published_at)
        patch.published_at = new Date().toISOString();
    }
    busy(true);
    try {
      let saved: Row;
      if (id) {
        saved = await update(cfg.table, id, patch);
      } else {
        if (cfg.hasStatus && !patch.status) patch.status = 'draft';
        if (cfg.reorderable) patch.display_order = await nextOrder(cfg.table);
        saved = await insert(cfg.table, patch);
      }
      api.markClean();
      initial = saved;
      return saved.id;
    } catch (e) {
      toast(friendlyError(e), 'error');
      return null;
    } finally {
      busy(false);
    }
  };

  root.querySelector('#saveDraft')?.addEventListener('click', async () => {
    const sid = await save(cfg.hasStatus ? 'draft' : undefined);
    if (sid) { toast('Draf disimpan.', 'ok'); if (!id) redirect(sid); }
  });
  root.querySelector('#saveOnly')?.addEventListener('click', async () => {
    const sid = await save();
    if (sid) { toast('Tersimpan.', 'ok'); if (!id) redirect(sid); }
  });
  root.querySelector('#publish')?.addEventListener('click', async () => {
    const sid = await save('published');
    if (sid) { toast('Diterbitkan.', 'ok'); if (!id) redirect(sid); }
  });
  root.querySelector('#archive')?.addEventListener('click', async () => {
    if (!id) return;
    busy(true);
    try { await setStatus(cfg.table, id, 'archived', cfg.hasPublishedAt); toast('Diarsipkan.', 'ok'); location.reload(); }
    catch (e) { toast(friendlyError(e), 'error'); busy(false); }
  });
  root.querySelector('#del')?.addEventListener('click', async () => {
    if (!id) return;
    const label = cfg.rowLabel ? cfg.rowLabel(initial) : 'item ini';
    const yes = await confirmDialog({ title: 'Hapus item ini?', message: `“${label}” akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`, confirmText: 'Hapus', danger: true });
    if (!yes) return;
    busy(true);
    try { await remove(cfg.table, id); api.markClean(); toast('Dihapus.', 'ok'); location.href = cfg.listHref; }
    catch (e) { toast(friendlyError(e), 'error'); busy(false); }
  });
  root.querySelector('#preview')?.addEventListener('click', () => {
    const href = cfg.previewHref?.(api.getValues());
    if (href) window.open(href, '_blank');
    else toast('Pratinjau tersedia setelah situs publik terhubung ke CMS (fase berikutnya).', 'info');
  });

  function redirect(newId: string) {
    detach();
    window.location.href = cfg.editHref(newId);
  }
}
