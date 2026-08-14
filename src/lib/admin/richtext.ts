// Minimal rich-text editor: a contenteditable surface + a small toolbar.
// No heavy editor framework — outputs clean-ish HTML for blog_posts.content.
// Supports: bold, italic, H2/H3, lists, link, clear. Good enough for a
// portfolio blog; a richer editor can replace this behind the same interface.

const BTN = (cmd: string, label: string, title: string) =>
  `<button type="button" class="rt-btn" data-cmd="${cmd}" title="${title}" aria-label="${title}">${label}</button>`;

export interface RichText {
  el: HTMLElement;
  getHTML(): string;
  setHTML(html: string): void;
  onChange(cb: () => void): void;
}

export function createRichText(initial = ''): RichText {
  const wrap = document.createElement('div');
  wrap.className = 'rt';
  wrap.innerHTML = `
    <div class="rt-toolbar" role="toolbar" aria-label="Format">
      ${BTN('bold', '<b>B</b>', 'Tebal')}
      ${BTN('italic', '<i>I</i>', 'Miring')}
      ${BTN('h2', 'H2', 'Judul')}
      ${BTN('h3', 'H3', 'Subjudul')}
      ${BTN('ul', '• List', 'Daftar')}
      ${BTN('ol', '1. List', 'Daftar bernomor')}
      ${BTN('link', '🔗', 'Tautan')}
      ${BTN('clear', '⨯', 'Hapus format')}
    </div>
    <div class="rt-area" contenteditable="true" role="textbox" aria-multiline="true"></div>`;
  const area = wrap.querySelector<HTMLElement>('.rt-area')!;
  area.innerHTML = initial || '<p><br></p>';

  let changeCb: (() => void) | null = null;
  const fire = () => changeCb && changeCb();

  const exec = (cmd: string) => {
    area.focus();
    switch (cmd) {
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
      case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
      case 'ul': document.execCommand('insertUnorderedList'); break;
      case 'ol': document.execCommand('insertOrderedList'); break;
      case 'clear': document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'P'); break;
      case 'link': {
        const url = prompt('URL tautan (mis. https://...)');
        if (url) document.execCommand('createLink', false, url);
        break;
      }
    }
    fire();
  };

  wrap.querySelector('.rt-toolbar')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('.rt-btn') as HTMLButtonElement | null;
    if (b) { e.preventDefault(); exec(b.dataset.cmd!); }
  });
  area.addEventListener('input', fire);

  return {
    el: wrap,
    getHTML: () => (area.innerHTML === '<p><br></p>' ? '' : area.innerHTML),
    setHTML: (html: string) => { area.innerHTML = html || '<p><br></p>'; },
    onChange: (cb) => { changeCb = cb; },
  };
}
