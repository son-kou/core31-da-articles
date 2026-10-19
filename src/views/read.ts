// Mode A — 精读 / Deep Teacher: every CORE sentence as a card; Chinese and the detailed explanation can be revealed.
import { h, icon } from '../dom';
import type { CoreSentence } from '../lib/core-format';
import { store } from '../store';
import { detailsBlock, hasDetails, zhRow } from './teach';
import { playButton, speakerTag, type Ctx } from './unit';

function card(ctx: Ctx, s: CoreSentence): HTMLElement {
  const t = ctx.teach.get(s.id);
  const loop = h('button', { type: 'button', class: 'loop', 'data-loop': s.id, 'aria-pressed': 'false', title: '单句循环', 'aria-label': `循环播放 ${s.id}`, disabled: !ctx.audio.hasClip(s.id) }, icon('loop'));
  loop.addEventListener('click', () => {
    const on = !(ctx.audio.loop && ctx.audio.clipId === s.id);
    if (on) {
      ctx.audio.playSentence(s.id);
      ctx.audio.setLoop(true);
    } else ctx.audio.setLoop(false);
    ctx.setSentence(s.id);
  });
  const src = h(
    'div',
    { class: 'card-src' },
    h('div', { class: 'card-meta' }, h('span', { class: 'sid' }, s.id), speakerTag(s), h('span', { class: 'grow' }), playButton(ctx, s.id), loop),
    h('p', { class: `da-sent${s.doc ? ' is-doc' : ''}`, lang: 'da' }, s.text),
  );
  const body = h('div', { class: 'card-body' });
  if (t) {
    const zh = zhRow(t);
    const zhReveal = h('button', { type: 'button', class: 'reveal-zh' }, '显示中文');
    zhReveal.addEventListener('click', () => zh.classList.add('force'));
    body.append(zh, zhReveal);
    if (hasDetails(t)) {
      const det = h('details', { class: 'teach' }, h('summary', null, h('span', null, '精讲'), icon('chev')));
      let built = false;
      det.addEventListener('toggle', () => {
        if (det.open && !built) {
          det.append(detailsBlock(t));
          built = true;
        }
        if (det.open) ctx.setSentence(s.id);
      });
      body.append(det);
    }
  } else {
    body.append(h('span', { class: 'pending' }, '讲解制作中'));
  }
  return h('article', { class: 'card', id: `s-${s.id}`, 'data-sid': s.id }, src, body);
}

export function renderRead(ctx: Ctx): HTMLElement {
  const { unit } = ctx;
  const anyTeach = unit.sentences.some((s) => ctx.teach.has(s.id));
  const root = h('div', { class: 'read' + (store.get().showZh ? '' : ' hide-zh') + (anyTeach ? '' : ' no-teach') });
  const zhToggle = h('button', { type: 'button', class: 'btn', 'aria-pressed': String(!store.get().showZh) }, store.get().showZh ? '隐藏中文' : '显示中文');
  zhToggle.addEventListener('click', () => {
    const show = !store.get().showZh;
    store.set('showZh', show);
    root.classList.toggle('hide-zh', !show);
    root.querySelectorAll('.t-zh.force').forEach((e) => e.classList.remove('force'));
    zhToggle.textContent = show ? '隐藏中文' : '显示中文';
    zhToggle.setAttribute('aria-pressed', String(!show));
  });
  const expand = h('button', { type: 'button', class: 'btn' }, '展开全部精讲');
  let open = false;
  expand.addEventListener('click', () => {
    open = !open;
    root.querySelectorAll<HTMLDetailsElement>('details.teach').forEach((d) => {
      d.open = open;
    });
    expand.textContent = open ? '收起全部精讲' : '展开全部精讲';
  });
  const last = store.unit(unit.unit).last;
  const resume = last && !ctx.sid ? h('button', { type: 'button', class: 'btn btn-quiet' }, `回到上次位置 ${last.slice(4)}`) : null;
  resume?.addEventListener('click', () => document.getElementById(`s-${last}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  root.append(
    h(
      'div',
      { class: 'mode-bar' },
      anyTeach ? zhToggle : null,
      anyTeach ? expand : null,
      resume,
      anyTeach ? null : h('span', { class: 'mode-note' }, '本单元的逐句讲解还在制作中；原文和音频已可使用。'),
    ),
  );
  let ch = -1;
  let section: HTMLElement | null = null;
  let para = -1;
  let group: HTMLElement | null = null;
  for (const s of unit.sentences) {
    if (s.ch !== ch) {
      ch = s.ch;
      const h2 = h('h2', { class: 'ch-title', id: `ch-${ch}`, lang: 'da' }, h('span', { class: 'ch-n' }, `${ch + 1}.`), unit.chapters[ch].title);
      ctx.chapterNodes.set(ch, h2);
      section = h('section', { class: 'chapter' }, h2);
      root.append(section);
      para = -1;
    }
    if (s.p !== para) {
      para = s.p;
      group = h('div', { class: 'para' + (s.speaker !== undefined ? ' para-dlg' : s.doc ? ' para-doc' : '') });
      section!.append(group);
    }
    group!.append(card(ctx, s));
  }
  // remember the reading position (topmost card in view)
  const io = new IntersectionObserver(
    (entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) store.touch(unit.unit, (top.target as HTMLElement).dataset.sid);
    },
    { rootMargin: '-15% 0px -60% 0px' },
  );
  requestAnimationFrame(() => root.querySelectorAll('.card').forEach((c) => io.observe(c)));
  ctx.onCleanup(() => io.disconnect());
  const target = ctx.sid;
  if (target)
    requestAnimationFrame(() => {
      const el = document.getElementById(`s-${target}`);
      el?.scrollIntoView({ block: 'center' });
      el?.classList.add('flash');
    });
  return root;
}
