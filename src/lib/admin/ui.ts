// Reusable admin UI primitives: toasts + confirm dialog. Framework-free
// (plain DOM) so any admin page can `import { toast, confirmDialog }`.

type ToastKind = 'ok' | 'error' | 'warn' | 'info';

const ICONS: Record<ToastKind, string> = {
  ok: '<path d="M20 6 9 17l-5-5"/>',
  error: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4m0 4h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>',
};

function ensureContainer(): HTMLElement {
  let c = document.querySelector<HTMLElement>('.toast-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toast-container';
    c.setAttribute('aria-live', 'polite');
    document.body.appendChild(c);
  }
  return c;
}

/** Show a transient notification. */
export function toast(message: string, kind: ToastKind = 'ok', ms = 3500): void {
  const c = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML =
    `<svg class="t-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</svg>` +
    `<span></span>`;
  el.querySelector('span')!.textContent = message;
  c.appendChild(el);
  const remove = () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 180); };
  setTimeout(remove, ms);
}

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/** Promise-based confirmation modal. Resolves true on confirm, false otherwise. */
export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal" role="document">
        <h3></h3>
        <p></p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel"></button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-act="ok"></button>
        </div>
      </div>`;
    overlay.querySelector('h3')!.textContent = opts.title;
    const p = overlay.querySelector('p')!;
    if (opts.message) p.textContent = opts.message; else p.remove();
    overlay.querySelector('[data-act="cancel"]')!.textContent = opts.cancelText ?? 'Batal';
    overlay.querySelector('[data-act="ok"]')!.textContent = opts.confirmText ?? 'Konfirmasi';

    const close = (val: boolean) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(val);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };

    overlay.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === overlay) close(false);
      if (t.dataset.act === 'cancel') close(false);
      if (t.dataset.act === 'ok') close(true);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector<HTMLButtonElement>('[data-act="ok"]')!.focus();
  });
}
