// Skills manager: categories → skills. Visually communicates the relationship
// (a category card containing its skill chips) without exposing DB concepts.
import { list, insert, update, remove, nextOrder, slugify, friendlyError, type Row } from './db';
import { formModal, type Field } from './form';
import { toast, confirmDialog } from './ui';
import { esc } from './list';

const catFields: Field[] = [
  { name: 'name', label: 'Nama kategori', type: 'text', bilingual: true, required: true },
];
const skillFields: Field[] = [
  { name: 'name', label: 'Nama keahlian', type: 'text', required: true },
  { name: 'description', label: 'Deskripsi (opsional)', type: 'textarea', bilingual: true },
  { name: 'is_visible', label: 'Tampilkan di situs', type: 'boolean' },
];

export async function initSkills(root: HTMLElement): Promise<void> {
  let cats: Row[] = [];
  let skills: Row[] = [];

  const draw = () => {
    const byCat = (cid: string) => skills.filter((s) => s.category_id === cid);
    root.innerHTML =
      '<div class="list-toolbar"><span class="list-spacer"></span><button class="btn btn-primary btn-sm" data-a="cat-add">+ Kategori</button></div>' +
      (cats.length === 0 ? '<div class="state"><h3>Belum ada kategori</h3><p>Buat kategori keahlian pertama (mis. Desain, Web, Tools).</p></div>' : '') +
      cats.map((c) => `
        <div class="skill-cat card" data-cat="${esc(c.id)}" style="padding:16px">
          <div class="skill-cat-head">
            <h3>${esc(c.name_id ?? c.name_en ?? 'Kategori')}</h3>
            <span class="spacer"></span>
            <button class="btn btn-ghost btn-xs" data-a="cat-edit">Edit</button>
            <button class="btn btn-danger btn-xs" data-a="cat-del">Hapus</button>
          </div>
          <div class="skill-chips">
            ${byCat(c.id).map((s) => `
              <span class="skill-chip" data-skill="${esc(s.id)}">
                ${esc(s.name)}${s.is_visible ? '' : ' <span class="badge badge-draft" style="padding:1px 6px">tersembunyi</span>'}
                <span class="sc-act">
                  <button data-a="sk-edit" title="Edit">✎</button>
                  <button data-a="sk-del" title="Hapus">✕</button>
                </span>
              </span>`).join('')}
            <button class="btn btn-ghost btn-xs" data-a="sk-add">+ Keahlian</button>
          </div>
        </div>`).join('');
  };

  const reload = async () => {
    root.innerHTML = '<div class="card" style="padding:16px"><div class="skeleton sk-line" style="width:40%"></div></div>';
    try {
      [cats, skills] = await Promise.all([
        list('skill_categories', { order: { column: 'display_order', ascending: true } }),
        list('skills', { order: { column: 'display_order', ascending: true } }),
      ]);
      draw();
    } catch (e) {
      root.innerHTML = '<div class="state"><h3>Gagal memuat</h3><p>' + friendlyError(e) + '</p></div>';
    }
  };

  // Delegated handler bound ONCE (survives innerHTML rebuilds).
  root.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (!btn) return;
    const a = btn.dataset.a!;
    const cid = (btn.closest('[data-cat]') as HTMLElement | null)?.dataset.cat;
    const sid = (btn.closest('[data-skill]') as HTMLElement | null)?.dataset.skill;
    try {
      if (a === 'cat-add') {
        const v = await formModal({ title: 'Kategori baru', fields: catFields });
        if (v) { await insert('skill_categories', { ...v, slug: slugify(v.name_id || v.name_en || 'kategori') + '-' + Date.now().toString(36).slice(-4), display_order: await nextOrder('skill_categories') }); toast('Kategori dibuat.', 'ok'); reload(); }
      } else if (a === 'cat-edit') {
        const c = cats.find((x) => x.id === cid)!;
        const v = await formModal({ title: 'Edit kategori', fields: catFields, initial: c });
        if (v) { await update('skill_categories', cid!, v); toast('Tersimpan.', 'ok'); reload(); }
      } else if (a === 'cat-del') {
        const yes = await confirmDialog({ title: 'Hapus kategori?', message: 'Keahlian di dalamnya tidak ikut terhapus (kategorinya dikosongkan).', confirmText: 'Hapus', danger: true });
        if (yes) { await remove('skill_categories', cid!); toast('Dihapus.', 'ok'); reload(); }
      } else if (a === 'sk-add') {
        const v = await formModal({ title: 'Keahlian baru', fields: skillFields, initial: { is_visible: true } });
        if (v) { await insert('skills', { ...v, category_id: cid, display_order: await nextOrder('skills') }); toast('Ditambahkan.', 'ok'); reload(); }
      } else if (a === 'sk-edit') {
        const s = skills.find((x) => x.id === sid)!;
        const v = await formModal({ title: 'Edit keahlian', fields: skillFields, initial: s });
        if (v) { await update('skills', sid!, v); toast('Tersimpan.', 'ok'); reload(); }
      } else if (a === 'sk-del') {
        const yes = await confirmDialog({ title: 'Hapus keahlian?', confirmText: 'Hapus', danger: true });
        if (yes) { await remove('skills', sid!); toast('Dihapus.', 'ok'); reload(); }
      }
    } catch (err) { toast(friendlyError(err), 'error'); }
  });

  reload();
}
