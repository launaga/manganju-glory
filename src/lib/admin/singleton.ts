// Editor for singleton content (About, Homepage, Site Settings). One row at
// id=1; a single "Save Changes" action (upsert). Reuses the form engine.
import { renderForm, guardUnsaved, type Field } from './form';
import { getSingleton, saveSingleton, friendlyError, type Row } from './db';
import { toast } from './ui';

export async function initSingletonEditor(root: HTMLElement, table: string, fields: Field[]): Promise<void> {
  root.innerHTML = '<div class="card" style="padding:16px"><div class="skeleton sk-line" style="width:50%"></div><div class="skeleton sk-line" style="width:70%"></div></div>';
  let initial: Row = {};
  try {
    initial = (await getSingleton(table)) ?? {};
  } catch (e) {
    root.innerHTML = '<div class="state"><h3>Gagal memuat</h3><p>' + friendlyError(e) + '</p></div>';
    return;
  }

  root.innerHTML = '<div class="editor-form" id="sf"></div><div class="editor-actions" id="sa"></div>';
  const api = renderForm(root.querySelector('#sf')!, fields, initial);
  guardUnsaved(api);
  const actions = root.querySelector<HTMLElement>('#sa')!;
  actions.innerHTML = '<button class="btn btn-primary" id="save">Simpan Perubahan</button>' +
    '<span class="dirty-flag" id="df" hidden>• Perubahan belum disimpan</span>';
  const df = root.querySelector<HTMLElement>('#df')!;
  api.onDirty((d) => (df.hidden = !d));

  root.querySelector('#save')!.addEventListener('click', async () => {
    const res = await api.validate();
    if (!res.ok) { toast(res.firstError ?? 'Periksa isian.', 'error'); return; }
    const btn = root.querySelector('#save') as HTMLButtonElement;
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      await saveSingleton(table, api.getValues());
      api.markClean();
      toast('Perubahan disimpan.', 'ok');
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Simpan Perubahan';
    }
  });
}
