// Mode D — 背诵: recall the Danish from a cue (Chinese when available, otherwise position + word count), reveal, mark.
// Marks are a convenience stored in this browser only; vocabulary SRS stays in Anki.
import { h } from '../dom';
import type { CoreSentence } from '../lib/core-format';
import { store, type Mark } from '../store';
import { playButton, speakerTag, type Ctx } from './unit';

const MARKS: { key: Mark; zh: string }[] = [
  { key: 'familiar', zh: '熟悉' },
  { key: 'practicing', zh: '练习中' },
  { key: 'mastered', zh: '已掌握' },
];
type Filter = 'all' | 'none' | Mark;

/** Word-shaped mask: shows the sentence's rhythm (word count and length) without its letters. */
function mask(text: string) {
  return text.split(/\s+/).map((w) => h('span', { class: 'mask-w', style: `width:${Math.min(12, Math.max(1.2, w.length * 0.55)).toFixed(2)}em` }));
}

export function renderRecall(ctx: Ctx): HTMLElement {
  const { unit } = ctx;
  const u = unit.unit;
  let filter: Filter = 'all';
  const root = h('div', { class: 'recall' });
  const filters = h('div', { class: 'filters', role: 'group', 'aria-label': '按标记筛选' });
  const list = h('div', { class: 'rc-list' });
  const revealAll = h('button', { type: 'button', class: 'btn' }, '全部显示原文');
  let allShown = false;
  revealAll.addEventListener('click', () => {
    allShown = !allShown;
    list.querySelectorAll<HTMLElement>('.rc').forEach((el) => setShown(el, allShown));
    revealAll.textContent = allShown ? '全部隐藏原文' : '全部显示原文';
  });

  function setShown(el: HTMLElement, on: boolean) {
    el.classList.toggle('shown', on);
    const b = el.querySelector<HTMLButtonElement>('.rc-reveal');
    if (b) b.textContent = on ? '隐藏原文' : '显示原文';
  }

  function drawFilters() {
    const marks = store.unit(u).marks;
    const count = (f: Filter) => unit.sentences.filter((s) => (f === 'all' ? true : f === 'none' ? !marks[s.id] : marks[s.id] === f)).length;
    filters.replaceChildren(
      ...([['all', '全部'], ['none', '未标记'], ...MARKS.map((m) => [m.key, m.zh])] as [Filter, string][]).map(([k, l]) => {
        const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(filter === k) }, `${l} ${count(k)}`);
        b.addEventListener('click', () => {
          filter = k;
          drawFilters();
          drawList();
        });
        return b;
      }),
    );
  }

  function item(s: CoreSentence) {
    const t = ctx.teach.get(s.id);
    const el = h('article', { class: 'rc', 'data-sid': s.id });
    const reveal = h('button', { type: 'button', class: 'btn btn-small rc-reveal' }, '显示原文');
    reveal.addEventListener('click', () => {
      setShown(el, !el.classList.contains('shown'));
      ctx.setSentence(s.id);
    });
    const marks = h('div', { class: 'rc-marks', role: 'group', 'aria-label': '掌握程度' });
    const drawMarks = () => {
      const cur = store.unit(u).marks[s.id];
      marks.replaceChildren(
        ...MARKS.map((m) => {
          const b = h('button', { type: 'button', class: `chip chip-${m.key}`, 'aria-pressed': String(cur === m.key) }, m.zh);
          b.addEventListener('click', () => {
            store.mark(u, s.id, cur === m.key ? null : m.key);
            store.touch(u, s.id);
            drawMarks();
            drawFilters();
          });
          return b;
        }),
      );
    };
    drawMarks();
    const words = s.text.split(/\s+/).length;
    const cue = t
      ? h('p', { class: 'rc-cue' }, t.zh)
      : h('p', { class: 'rc-cue rc-cue-weak' }, `${unit.chapters[s.ch].title} · ${words} 个词（中文提示待讲解完成后出现）`);
    el.append(
      h('div', { class: 'rc-head' }, h('span', { class: 'sid' }, s.id), speakerTag(s), h('span', { class: 'grow' }), playButton(ctx, s.id)),
      cue,
      h('div', { class: 'rc-da' }, h('p', { class: 'rc-text', lang: 'da' }, s.text), h('p', { class: 'rc-mask', 'aria-hidden': 'true' }, mask(s.text))),
      h('div', { class: 'rc-actions' }, reveal, marks),
    );
    if (allShown) setShown(el, true);
    return el;
  }

  function drawList() {
    const marks = store.unit(u).marks;
    const ss = unit.sentences.filter((s) => (filter === 'all' ? true : filter === 'none' ? !marks[s.id] : marks[s.id] === filter));
    list.replaceChildren(...(ss.length ? ss.map(item) : [h('p', { class: 'empty' }, '这一类还没有句子。')]));
  }

  root.append(
    h('div', { class: 'mode-bar' }, revealAll),
    filters,
    h('p', { class: 'mode-note' }, '先根据提示说出或写出丹麦语原句，再显示原文核对。标记只保存在本浏览器，不是间隔重复算法——词汇复习请继续用 Anki。'),
    list,
  );
  drawFilters();
  drawList();
  const target = ctx.sid;
  if (target) requestAnimationFrame(() => list.querySelector(`[data-sid="${target}"]`)?.scrollIntoView({ block: 'center' }));
  return root;
}
