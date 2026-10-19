// Mode C — 跟读 / Shadowing: one sentence at a time — hear it, say it aloud, move on. No microphone, no grading.
import { h, icon } from '../dom';
import { store } from '../store';
import { playButton, speakerTag, type Ctx } from './unit';

export function renderShadow(ctx: Ctx): HTMLElement {
  const { unit, audio } = ctx;
  const ss = unit.sentences;
  const last = ctx.sid ?? store.unit(unit.unit).last;
  let i = Math.max(0, ss.findIndex((s) => s.id === last));
  let gapTimer: number | undefined;

  const root = h('div', { class: 'shadow' });
  const stage = h('div', { class: 'sh-stage' });
  const pick = h('select', { class: 'sh-pick', 'aria-label': '跳到句子' });
  ss.forEach((s, k) => pick.append(h('option', { value: String(k) }, `${s.id.slice(4)}  ${s.text.slice(0, 42)}${s.text.length > 42 ? '…' : ''}`)));
  pick.addEventListener('change', () => go(Number(pick.value), false));

  const loopBtn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false' }, icon('loop'), '单句循环');
  loopBtn.addEventListener('click', () => {
    audio.setLoop(!audio.loop);
    if (audio.loop) {
      autoBox.checked = false;
      store.set('autoNext', false);
      audio.playSentence(ss[i].id, true);
    }
  });
  const autoBox = h('input', { type: 'checkbox', checked: store.get().autoNext });
  autoBox.addEventListener('change', () => {
    store.set('autoNext', autoBox.checked);
    if (autoBox.checked) audio.setLoop(false);
  });
  const gapSel = h('select', { class: 'sh-gap', 'aria-label': '跟读停顿' });
  for (const [v, l] of [[0, '不停顿'], [1, '停顿 = 1× 句长'], [1.5, '停顿 = 1.5× 句长'], [2, '停顿 = 2× 句长']] as const)
    gapSel.append(h('option', { value: String(v), selected: store.get().shadowGap === v }, l));
  gapSel.addEventListener('change', () => store.set('shadowGap', Number(gapSel.value)));

  const speed = h('select', { class: 'sh-gap', 'aria-label': '语速' });
  for (const v of [0.6, 0.8, 1, 1.2, 1.4]) speed.append(h('option', { value: String(v), selected: store.get().speed === v }, `语速 ${v.toFixed(1)}×`));
  speed.addEventListener('change', () => audio.setSpeed(Number(speed.value)));
  const nClip = ss.filter((s) => audio.hasClip(s.id)).length;
  root.append(
    h('div', { class: 'mode-bar' }, pick),
    stage,
    h(
      'div',
      { class: 'sh-options' },
      loopBtn,
      h('label', { class: 'chk', title: '播放结束后（停顿给你跟读的时间）自动进入下一句；只经过有验证音频的句子' }, autoBox, '自动下一句'),
      gapSel,
      speed,
    ),
    h('p', { class: 'mode-note' }, `键盘：空格 播放 · ← → 上一句/下一句 · L 循环 · Z 显示中文。单句音频 ${nClip}/${ss.length}；没有验证音频的句子只显示文字。`),
  );

  function nextWithClip(from: number): number {
    for (let k = from + 1; k < ss.length; k++) if (audio.hasClip(ss[k].id)) return k;
    return -1;
  }

  function draw() {
    const s = ss[i];
    const t = ctx.teach.get(s.id);
    pick.value = String(i);
    const prev = h('button', { type: 'button', class: 'sh-nav', disabled: i === 0, 'aria-label': '上一句' }, icon('prev'));
    const next = h('button', { type: 'button', class: 'sh-nav', disabled: i === ss.length - 1, 'aria-label': '下一句' }, icon('next'));
    prev.addEventListener('click', () => go(i - 1, true));
    next.addEventListener('click', () => go(i + 1, true));
    const zh = t ? h('p', { class: 'sh-zh', hidden: true }, t.zh) : null;
    const zhBtn = t ? h('button', { type: 'button', class: 'btn btn-quiet sh-zh-btn' }, '显示中文') : h('span', { class: 'pending' }, '中文讲解制作中');
    if (t && zh)
      zhBtn.addEventListener('click', () => {
        zh.hidden = !zh.hidden;
        zhBtn.textContent = zh.hidden ? '显示中文' : '隐藏中文';
      });
    stage.replaceChildren(
      h(
        'div',
        { class: 'sh-card', 'data-sid': s.id },
        h('div', { class: 'sh-pos' }, h('span', null, `${i + 1} / ${ss.length}`), h('span', { class: 'sh-ch', lang: 'da' }, `${s.ch + 1}. ${unit.chapters[s.ch].title}`)),
        h('div', { class: 'sh-meta' }, h('span', { class: 'sid' }, s.id), speakerTag(s)),
        h('p', { class: 'sh-text', lang: 'da' }, s.text),
        audio.hasClip(s.id) ? null : h('p', { class: 'mode-note' }, '这一句没有经过验证的单句音频。'),
        h('div', { class: 'sh-controls' }, prev, playButton(ctx, s.id, true), next),
        h('div', { class: 'sh-zh-wrap' }, zhBtn, zh),
      ),
    );
    loopBtn.setAttribute('aria-pressed', String(audio.loop));
  }

  function go(k: number, play: boolean) {
    window.clearTimeout(gapTimer);
    i = Math.max(0, Math.min(ss.length - 1, k));
    ctx.setSentence(ss[i].id);
    draw();
    if (play) {
      if (!audio.playSentence(ss[i].id, true)) audio.stopClip();
    } else audio.stopClip();
  }

  audio.onClipEnded((id) => {
    if (!store.get().autoNext || id !== ss[i].id) return;
    const k = nextWithClip(i);
    if (k < 0) return;
    const wait = (audio.clip.duration || 3) * store.get().shadowGap * 1000;
    gapTimer = window.setTimeout(() => go(k, true), wait / (store.get().speed || 1));
  });
  ctx.onCleanup(audio.on(() => loopBtn.setAttribute('aria-pressed', String(audio.loop))));

  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      audio.toggleSentence(ss[i].id);
    } else if (e.key === 'ArrowRight') go(i + 1, true);
    else if (e.key === 'ArrowLeft') go(i - 1, true);
    else if (e.key.toLowerCase() === 'l') loopBtn.click();
    else if (e.key.toLowerCase() === 'z') stage.querySelector<HTMLButtonElement>('.sh-zh-btn')?.click();
  };
  window.addEventListener('keydown', onKey);
  ctx.onCleanup(() => {
    window.removeEventListener('keydown', onKey);
    window.clearTimeout(gapTimer);
  });
  draw();
  return root;
}
