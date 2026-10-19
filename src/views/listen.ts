// Mode B — 听力: listen to the whole article (or from a chapter) first, then reveal the transcript.
// Highlighting and click-to-seek use only sentences whose start/end in the full recording are verified.
import { h, icon } from '../dom';
import { store } from '../store';
import { speakerTag, type Ctx } from './unit';

export function renderListen(ctx: Ctx): HTMLElement {
  const { unit, audio } = ctx;
  const timed = audio.data?.sentences ?? {};
  const nTimed = unit.sentences.filter((s) => timed[s.id]).length;
  const root = h('div', { class: 'listen' + (store.get().hideTranscript ? ' hide-text' : '') });

  /** Start of a chapter in the full recording: its first sentence's verified start, or the verified end of the sentence before. */
  const chapterStart = (ch: number): number | null => {
    const i = unit.sentences.findIndex((s) => s.ch === ch);
    if (i < 0) return null;
    if (i === 0) return 0;
    const a = timed[unit.sentences[i].id];
    if (a) return a.full_start_s;
    const b = timed[unit.sentences[i - 1].id];
    return b ? b.full_end_s : null;
  };

  const toggle = h('button', { type: 'button', class: 'btn', 'aria-pressed': String(store.get().hideTranscript) });
  const label = () => (toggle.textContent = store.get().hideTranscript ? '显示原文' : '隐藏原文');
  label();
  toggle.addEventListener('click', () => {
    const hide = !store.get().hideTranscript;
    store.set('hideTranscript', hide);
    root.classList.toggle('hide-text', hide);
    toggle.setAttribute('aria-pressed', String(hide));
    label();
  });
  const playAll = h('button', { type: 'button', class: 'btn btn-primary', disabled: !audio.data?.full }, icon('play'), '从头播放全文');
  playAll.addEventListener('click', () => audio.seekFull(0, true));

  root.append(
    h(
      'div',
      { class: 'listen-intro' },
      h('p', null, '先不看原文听一遍：抓主旨、人物和转折；再打开原文对照，最后回到精读或跟读。'),
      h('div', { class: 'mode-bar' }, playAll, toggle),
      h(
        'p',
        { class: 'mode-note' },
        `高亮与点句跳转只用于时间点经过验证的句子（${nTimed}/${unit.sentences.length}）；其余句子不显示同步，以免错位。`,
      ),
    ),
  );

  let ch = -1;
  let section: HTMLElement | null = null;
  let para = -1;
  let p: HTMLElement | null = null;
  for (const s of unit.sentences) {
    if (s.ch !== ch) {
      ch = s.ch;
      const start = chapterStart(ch);
      const go = h('button', { type: 'button', class: 'btn btn-small', disabled: start === null || !audio.data?.full, title: start === null ? '本章起点时间未经验证' : '从本章开始播放' }, icon('play'), '从本章听');
      const myCh = ch;
      go.addEventListener('click', () => {
        const t = chapterStart(myCh);
        if (t !== null) audio.seekFull(t, true);
      });
      const h2 = h('h2', { class: 'ch-title', lang: 'da' }, h('span', { class: 'ch-n' }, `${ch + 1}.`), unit.chapters[ch].title);
      ctx.chapterNodes.set(ch, h2);
      section = h('section', { class: 'chapter' }, h('div', { class: 'ch-head' }, h2, go), h('div', { class: 'masked' }, '原文已隐藏'));
      root.append(section);
      para = -1;
    }
    if (s.p !== para) {
      para = s.p;
      p = h('p', { class: 'flow' + (s.speaker !== undefined ? ' flow-dlg' : s.doc ? ' flow-doc' : ''), lang: 'da' });
      section!.append(p);
    }
    const a = timed[s.id];
    const span = h('span', { class: 'fs' + (a ? ' timed' : ''), 'data-sid': s.id, title: a ? '点击从这一句开始播放' : '这一句的时间点未经验证' }, s.text);
    if (a) span.addEventListener('click', () => audio.seekFull(a.full_start_s, true));
    if (s.speaker !== undefined) p!.append(h('span', { class: 'fl-line' }, speakerTag(s), span));
    else if (s.doc) p!.append(h('span', { class: 'fl-line' }, span));
    else p!.append(span, ' ');
  }
  return root;
}
