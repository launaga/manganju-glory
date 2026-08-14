// Config-driven form engine (framework-free). One implementation used by every
// content editor — the "one good CMS pattern". Handles field rendering,
// bilingual ID/EN pairs, validation, dirty tracking (unsaved-changes), slug
// auto-generation, and image upload fields.
import { slugify, slugExists, uploadImage } from './db';
import { createRichText, type RichText } from './richtext';
import { toast } from './ui';

export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'boolean'
  | 'tags' | 'select' | 'date' | 'image' | 'slug' | 'repeater';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  bilingual?: boolean;           // renders <name>_id and <name>_en
  hint?: string;
  options?: { value: string; label: string }[];
  slugFrom?: string;             // for type:'slug', source field to derive from
  slugTable?: string;            // table to check slug uniqueness against
  url?: boolean;                 // validate as http(s) URL
  maxLength?: number;
  section?: string;              // group heading
  imageFolder?: string;          // for type:'image'
  itemFields?: Field[];          // for type:'repeater' (text/textarea/bilingual/boolean subfields)
  itemLabel?: string;            // singular label for repeater items
}

export interface FormApi {
  getValues(): Record<string, any>;
  validate(): Promise<{ ok: boolean; firstError?: string }>;
  isDirty(): boolean;
  markClean(): void;
  onDirty(cb: (dirty: boolean) => void): void;
}

const el = (tag: string, cls?: string, html?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

const isUrl = (v: string) => /^https?:\/\/[^\s]+$/.test(v);

export function renderForm(
  container: HTMLElement,
  fields: Field[],
  initial: Record<string, any> = {}
): FormApi {
  container.innerHTML = '';
  const getters: Record<string, () => any> = {};
  const errorEls: Record<string, HTMLElement> = {};
  const richByName: Record<string, RichText> = {};
  let dirty = false;
  let dirtyCb: ((d: boolean) => void) | null = null;
  const markDirty = () => { if (!dirty) { dirty = true; dirtyCb && dirtyCb(true); } };

  // group by section
  const sections = new Map<string, Field[]>();
  for (const f of fields) {
    const s = f.section ?? '';
    if (!sections.has(s)) sections.set(s, []);
    sections.get(s)!.push(f);
  }

  const makeInput = (name: string, value: any, type: string, ph = ''): HTMLInputElement => {
    const i = el('input', 'input') as HTMLInputElement;
    i.type = type; i.value = value ?? ''; if (ph) i.placeholder = ph;
    i.addEventListener('input', markDirty);
    return i;
  };
  const errBox = (name: string) => {
    const e = el('div', 'field-error'); errorEls[name] = e; return e;
  };

  for (const [section, fs] of sections) {
    if (section) container.appendChild(el('div', 'form-section-title', section));
    for (const f of fs) {
      const wrap = el('div', 'field');
      const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';

      if (f.bilingual) {
        wrap.appendChild(el('label', '', f.label + req));
        const grid = el('div', 'bi-grid');
        for (const lang of ['id', 'en'] as const) {
          const key = `${f.name}_${lang}`;
          const col = el('div', 'bi-col');
          col.appendChild(el('span', 'bi-tag', lang.toUpperCase()));
          let input: HTMLInputElement | HTMLTextAreaElement;
          if (f.type === 'textarea') {
            input = el('textarea', 'textarea') as HTMLTextAreaElement;
            (input as HTMLTextAreaElement).value = initial[key] ?? '';
            input.addEventListener('input', markDirty);
          } else {
            input = makeInput(key, initial[key], 'text');
          }
          getters[key] = () => (input as any).value.trim();
          col.appendChild(input);
          grid.appendChild(col);
        }
        wrap.appendChild(grid);
      } else if (f.type === 'textarea') {
        wrap.appendChild(el('label', '', f.label + req));
        const t = el('textarea', 'textarea') as HTMLTextAreaElement;
        t.value = initial[f.name] ?? ''; t.addEventListener('input', markDirty);
        getters[f.name] = () => t.value.trim();
        wrap.appendChild(t);
      } else if (f.type === 'richtext') {
        wrap.appendChild(el('label', '', f.label + req));
        const rt = createRichText(initial[f.name] ?? '');
        rt.onChange(markDirty); richByName[f.name] = rt;
        getters[f.name] = () => rt.getHTML();
        wrap.appendChild(rt.el);
      } else if (f.type === 'boolean') {
        const row = el('label', 'switch');
        const cb = el('input') as HTMLInputElement; cb.type = 'checkbox';
        cb.checked = !!initial[f.name]; cb.addEventListener('change', markDirty);
        getters[f.name] = () => cb.checked;
        row.appendChild(cb); row.appendChild(el('span', '', f.label));
        wrap.appendChild(row);
      } else if (f.type === 'select') {
        wrap.appendChild(el('label', '', f.label + req));
        const s = el('select', 'select') as HTMLSelectElement;
        for (const o of f.options ?? []) {
          const opt = el('option') as HTMLOptionElement;
          opt.value = o.value; opt.textContent = o.label;
          if ((initial[f.name] ?? '') === o.value) opt.selected = true;
          s.appendChild(opt);
        }
        s.addEventListener('change', markDirty);
        getters[f.name] = () => s.value;
        wrap.appendChild(s);
      } else if (f.type === 'tags') {
        wrap.appendChild(el('label', '', f.label + req));
        const input = makeInput(f.name, (initial[f.name] ?? []).join(', '), 'text', 'Pisahkan dengan koma');
        getters[f.name] = () => input.value.split(',').map((t) => t.trim()).filter(Boolean);
        wrap.appendChild(input);
      } else if (f.type === 'image') {
        wrap.appendChild(el('label', '', f.label + req));
        const box = el('div', 'image-field');
        const preview = el('img', 'image-preview') as HTMLImageElement;
        let current = initial[f.name] ?? '';
        const setPrev = () => { preview.src = current || ''; preview.style.display = current ? 'block' : 'none'; };
        setPrev();
        const url = makeInput(f.name, current, 'text', 'URL gambar atau unggah');
        url.addEventListener('input', () => { current = url.value.trim(); setPrev(); });
        const file = el('input') as HTMLInputElement; file.type = 'file'; file.accept = 'image/*';
        file.className = 'file-input';
        file.addEventListener('change', async () => {
          const f0 = file.files?.[0]; if (!f0) return;
          try {
            box.classList.add('uploading');
            const u = await uploadImage(f0, f.imageFolder ?? 'general');
            current = u; url.value = u; setPrev(); markDirty();
            toast('Gambar terunggah.', 'ok');
          } catch (e) {
            toast('Gagal mengunggah gambar.', 'error');
          } finally { box.classList.remove('uploading'); }
        });
        getters[f.name] = () => current.trim();
        box.appendChild(preview); box.appendChild(url); box.appendChild(file);
        wrap.appendChild(box);
      } else if (f.type === 'slug') {
        wrap.appendChild(el('label', '', f.label + req));
        const input = makeInput(f.name, initial[f.name], 'text');
        let edited = !!initial[f.name];
        input.addEventListener('input', () => { edited = true; });
        // auto-fill from source until the user edits the slug manually
        if (f.slugFrom) {
          const bind = () => {
            const src = getters[f.slugFrom!]?.();
            if (!edited && src) input.value = slugify(src);
          };
          document.addEventListener('input', bind);
        }
        getters[f.name] = () => input.value.trim();
        wrap.appendChild(input);
      } else if (f.type === 'repeater') {
        wrap.appendChild(el('label', '', f.label + req));
        const listBox = el('div', 'rep-list');
        const itemFields = f.itemFields ?? [];
        const items: (() => any)[] = [];

        const subInput = (col: HTMLElement, sf: Field, key: string, value: any): (() => any) => {
          if (sf.type === 'boolean') {
            const row = el('label', 'switch'); const cb = el('input') as HTMLInputElement;
            cb.type = 'checkbox'; cb.checked = !!value; cb.addEventListener('change', markDirty);
            row.appendChild(cb); row.appendChild(el('span', '', sf.label)); col.appendChild(row);
            return () => cb.checked;
          }
          col.appendChild(el('span', 'bi-tag', sf.label));
          const inp = (sf.type === 'textarea' ? el('textarea', 'textarea') : (() => { const i = el('input', 'input') as HTMLInputElement; i.type = 'text'; return i; })()) as HTMLInputElement | HTMLTextAreaElement;
          (inp as any).value = value ?? ''; inp.addEventListener('input', markDirty);
          col.appendChild(inp);
          return () => (inp as any).value.trim();
        };

        const addItem = (data: Record<string, any>) => {
          const item = el('div', 'rep-item');
          const grid = el('div', 'rep-grid');
          const getters2: Record<string, () => any> = {};
          for (const sf of itemFields) {
            if (sf.bilingual) {
              for (const lang of ['id', 'en'] as const) {
                const key = `${sf.name}_${lang}`; const col = el('div', 'bi-col');
                col.appendChild(el('span', 'bi-tag', `${sf.label} (${lang.toUpperCase()})`));
                const inp = (sf.type === 'textarea' ? el('textarea', 'textarea') : (() => { const i = el('input', 'input') as HTMLInputElement; i.type = 'text'; return i; })()) as any;
                inp.value = data[key] ?? ''; inp.addEventListener('input', markDirty);
                col.appendChild(inp); grid.appendChild(col); getters2[key] = () => inp.value.trim();
              }
            } else {
              const col = el('div', 'bi-col'); getters2[sf.name] = subInput(col, sf, sf.name, data[sf.name]); grid.appendChild(col);
            }
          }
          const bar = el('div', 'rep-bar');
          bar.innerHTML = `<button type="button" class="icon-btn btn-xs" data-a="up" aria-label="Naik">↑</button>
            <button type="button" class="icon-btn btn-xs" data-a="down" aria-label="Turun">↓</button>
            <button type="button" class="btn btn-danger btn-xs" data-a="rm">Hapus</button>`;
          bar.addEventListener('click', (e) => {
            const a = (e.target as HTMLElement).dataset.a; if (!a) return;
            if (a === 'rm') { item.remove(); const i = items.indexOf(get); if (i >= 0) items.splice(i, 1); markDirty(); }
            else { const sib = a === 'up' ? item.previousElementSibling : item.nextElementSibling;
              if (sib) { a === 'up' ? listBox.insertBefore(item, sib) : listBox.insertBefore(sib, item); reindex(); markDirty(); } }
          });
          const get = () => { const o: Record<string, any> = {}; for (const [k, g] of Object.entries(getters2)) o[k] = g(); return o; };
          (item as any)._get = get;
          item.appendChild(grid); item.appendChild(bar); listBox.appendChild(item); items.push(get);
        };
        const reindex = () => { items.length = 0; listBox.querySelectorAll('.rep-item').forEach((it) => items.push((it as any)._get)); };
        (initial[f.name] ?? []).forEach((d: any) => addItem(d || {}));
        const addBtn = el('button', 'btn btn-ghost btn-sm') as HTMLButtonElement;
        addBtn.type = 'button'; addBtn.textContent = `+ Tambah ${f.itemLabel ?? 'item'}`;
        addBtn.addEventListener('click', () => { addItem({}); markDirty(); });
        wrap.appendChild(listBox); wrap.appendChild(addBtn);
        getters[f.name] = () => items.map((g) => g());
      } else { // text / number / date
        wrap.appendChild(el('label', '', f.label + req));
        const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
        const input = makeInput(f.name, initial[f.name], type);
        getters[f.name] = () =>
          f.type === 'number'
            ? (input.value === '' ? null : Number(input.value))
            : input.value.trim();
        wrap.appendChild(input);
      }

      if (f.hint) wrap.appendChild(el('div', 'hint', f.hint));
      wrap.appendChild(errBox(f.bilingual ? `${f.name}_id` : f.name));
      container.appendChild(wrap);
    }
  }

  const clearErrors = () => Object.values(errorEls).forEach((e) => (e.textContent = ''));
  const setError = (name: string, msg: string) => { if (errorEls[name]) errorEls[name].textContent = msg; };

  return {
    getValues() {
      const out: Record<string, any> = {};
      for (const [k, g] of Object.entries(getters)) out[k] = g();
      return out;
    },
    async validate() {
      clearErrors();
      let firstError: string | undefined;
      const fail = (name: string, msg: string) => { setError(name, msg); if (!firstError) firstError = msg; };
      const v = this.getValues();
      for (const f of fields) {
        if (f.bilingual) {
          if (f.required && !v[`${f.name}_id`]) fail(`${f.name}_id`, `${f.label} (ID) wajib diisi.`);
          continue;
        }
        const val = v[f.name];
        if (f.required && (val === '' || val == null || (Array.isArray(val) && val.length === 0)))
          fail(f.name, `${f.label} wajib diisi.`);
        if (f.url && val && !isUrl(String(val))) fail(f.name, 'Harus diawali http:// atau https://');
        if (f.maxLength && typeof val === 'string' && val.length > f.maxLength)
          fail(f.name, `Maksimal ${f.maxLength} karakter.`);
        if (f.type === 'slug' && val && f.slugTable) {
          try {
            if (await slugExists(f.slugTable, String(val), initial.id))
              fail(f.name, 'Slug sudah dipakai. Pilih yang lain.');
          } catch { /* uniqueness re-checked by DB constraint on save */ }
        }
      }
      return { ok: !firstError, firstError };
    },
    isDirty: () => dirty,
    markClean() { dirty = false; dirtyCb && dirtyCb(false); },
    onDirty(cb) { dirtyCb = cb; },
  };
}

/** A form inside a modal (used for quick create/edit, e.g. skills). Resolves
 *  the field values on save, or null on cancel. */
export function formModal(opts: { title: string; fields: Field[]; initial?: Record<string, any>; submitText?: string }): Promise<Record<string, any> | null> {
  return new Promise((resolve) => {
    const overlay = el('div', 'modal-overlay');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `<div class="modal modal-form" role="document">
      <h3>${opts.title.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))}</h3>
      <div class="modal-form-body"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="cancel">Batal</button>
        <button class="btn btn-primary" data-act="save">${opts.submitText ?? 'Simpan'}</button>
      </div></div>`;
    const api = renderForm(overlay.querySelector('.modal-form-body')!, opts.fields, opts.initial ?? {});
    const close = (val: Record<string, any> | null) => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(val); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
    overlay.addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      if (t === overlay || t.dataset.act === 'cancel') return close(null);
      if (t.dataset.act === 'save') {
        const res = await api.validate();
        if (!res.ok) return;
        close(api.getValues());
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
  });
}

/** Wire the browser "unsaved changes" guard to a FormApi. Returns a detach fn. */
export function guardUnsaved(api: FormApi): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    if (api.isDirty()) { e.preventDefault(); e.returnValue = ''; }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}
