// Tiny DOM helpers. Content from data files is only ever inserted as text (textContent), never as HTML.
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs)
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  append(el, children);
  return el;
}

export function append(el: Node, children: (Child | Child[])[]) {
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

/** Plain text with `backtick` Danish fragments → spans (class "da", lang da). */
export function rich(text: string): DocumentFragment {
  const f = document.createDocumentFragment();
  text.split(/(`[^`]+`)/g).forEach((part) => {
    if (!part) return;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) f.appendChild(h('span', { class: 'da', lang: 'da' }, part.slice(1, -1)));
    else f.appendChild(document.createTextNode(part));
  });
  return f;
}

export function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function icon(name: 'play' | 'pause' | 'loop' | 'prev' | 'next' | 'restart' | 'back' | 'sun' | 'moon' | 'auto' | 'chev'): SVGSVGElement {
  const paths: Record<string, string> = {
    play: 'M8 5.5v13l11-6.5z',
    pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
    loop: 'M17 2l4 4-4 4V7H7a3 3 0 00-3 3v1H2v-1a5 5 0 015-5h10zM7 22l-4-4 4-4v3h10a3 3 0 003-3v-1h2v1a5 5 0 01-5 5H7z',
    prev: 'M6 5h2v14H6zM20 5v14L9 12z',
    next: 'M16 5h2v14h-2zM4 5l11 7-11 7z',
    restart: 'M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z',
    back: 'M15 5l-7 7 7 7',
    sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3z',
    moon: 'M20 15.5A8.5 8.5 0 018.5 4 8.5 8.5 0 1020 15.5z',
    auto: 'M12 3a9 9 0 100 18V3z',
    chev: 'M7 10l5 5 5-5',
  };
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ic');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', paths[name]);
  if (name === 'back' || name === 'chev') {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
  }
  svg.appendChild(p);
  return svg;
}
