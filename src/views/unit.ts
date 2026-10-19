// Article page: header, mode tabs, chapter navigation, full-article player, and the four learning modes on the same CORE text.
import { AudioHub } from '../audio';
import { loadAudio, loadCore, loadTeaching, UNITS } from '../data';
import { fmtTime, h, icon } from '../dom';
import type { CoreSentence, CoreUnit } from '../lib/core-format';
import type { TeacherSentence } from '../lib/teacher-schema';
import { store, type Mode } from '../store';
import { renderListen } from './listen';
import { renderRead } from './read';
import { renderRecall } from './recall';
import { renderShadow } from './shadow';

export interface Ctx {
  unit: CoreUnit;
  audio: AudioHub;
  teach: Map<string, TeacherSentence>;
  /** jump target (deep link / chapter nav) */
  sid?: string;
  onCleanup(fn: () => void): void;
  setSentence(id: string): void;
  chapterNodes: Map<number, HTMLElement>;
}

export const MODES: { key: Mode; zh: string; da: string; hint: string }[] = [
  { key: 'read', zh: '精读', da: 'Deep Teacher', hint: '原句 + 中文 + 逐句精讲' },
  { key: 'listen', zh: '听力', da: 'Lytning', hint: '先听全文，再看原文' },
  { key: 'shadow', zh: '跟读', da: 'Shadowing', hint: '一次一句：听、跟读、下一句' },
  { key: 'recall', zh: '背诵', da: 'Udenad', hint: '看提示回忆原句，标记掌握程度' },
];

export function speakerTag(s: CoreSentence) {
  if (s.speaker !== undefined) return h('span', { class: 'spk', lang: 'da' }, s.speaker);
  if (s.doc) return h('span', { class: 'doc-tag' }, '书面');
  return null;
}

export function playButton(ctx: Ctx, id: string, big = false): HTMLButtonElement {
  const ok = ctx.audio.hasClip(id);
  const b = h('button', {
    type: 'button',
    class: `play${big ? ' play-big' : ''}`,
    'data-play': id,
    disabled: !ok,
    'aria-label': ok ? `播放 ${id}` : `${id} 暂无经验证的单句音频`,
    title: ok ? '播放这一句' : '这一句没有经过验证的单句音频（不会播放错误片段）',
  });
  b.append(icon('play'));
  b.addEventListener('click', () => {
    ctx.audio.toggleSentence(id);
    ctx.setSentence(id);
  });
  return b;
}

/** Keep every play button and card in sync with the audio state. */
function syncPlayState(root: HTMLElement, audio: AudioHub) {
  root.querySelectorAll<HTMLButtonElement>('button[data-play]').forEach((b) => {
    const playing = audio.isPlaying(b.dataset.play!);
    if (b.classList.contains('is-playing') !== playing) {
      b.classList.toggle('is-playing', playing);
      b.replaceChildren(icon(playing ? 'pause' : 'play'));
    }
  });
  root.querySelectorAll<HTMLButtonElement>('button[data-loop]').forEach((b) => {
    b.setAttribute('aria-pressed', String(audio.loop && audio.clipId === b.dataset.loop));
  });
  root.querySelectorAll<HTMLElement>('[data-sid].is-playing').forEach((el) => {
    if (!audio.isPlaying(el.dataset.sid!)) el.classList.remove('is-playing');
  });
  if (audio.clipId && !audio.clip.paused) root.querySelector(`[data-sid="${audio.clipId}"]`)?.classList.add('is-playing');
}

function playerBar(ctx: Ctx, getMode: () => Mode, onPageCleanup: (fn: () => void) => void): HTMLElement {
  const a = ctx.audio;
  const dur = a.data?.full?.duration_s ?? 0;
  const playBtn = h('button', { type: 'button', class: 'pl-play', 'aria-label': '播放 / 暂停全文' }, icon('play'));
  const restart = h('button', { type: 'button', class: 'pl-btn', 'aria-label': '回到开头', title: '回到开头' }, icon('restart'));
  const time = h('span', { class: 'pl-time' }, `0:00 / ${fmtTime(dur)}`);
  const range = h('input', { type: 'range', class: 'pl-range', min: '0', max: String(dur || 1), step: '0.1', value: '0', 'aria-label': '播放进度' });
  const speed = h('select', { class: 'pl-speed', 'aria-label': '语速' });
  for (const v of [0.6, 0.8, 1, 1.2, 1.4]) speed.append(h('option', { value: String(v), selected: store.get().speed === v }, `${v.toFixed(1)}×`));
  const follow = h('label', { class: 'pl-follow', title: '全文播放时高亮并跟随正在朗读的句子（只用经过验证的时间点）' }, h('input', { type: 'checkbox', checked: store.get().follow }), '跟随');
  const label = h('span', { class: 'pl-label' }, '全文');
  if (!a.data?.full) {
    return h('div', { class: 'player player-off' }, '本单元暂无全文音频');
  }
  let dragging = false;
  playBtn.addEventListener('click', () => a.toggleFull());
  restart.addEventListener('click', () => a.seekFull(0));
  range.addEventListener('input', () => {
    dragging = true;
    time.textContent = `${fmtTime(Number(range.value))} / ${fmtTime(dur)}`;
  });
  range.addEventListener('change', () => {
    dragging = false;
    a.seekFull(Number(range.value));
  });
  speed.addEventListener('change', () => a.setSpeed(Number(speed.value)));
  follow.querySelector('input')!.addEventListener('change', (e) => store.set('follow', (e.target as HTMLInputElement).checked));
  let lastSpeaking: string | null = null;
  const update = () => {
    const playing = !a.full.paused;
    playBtn.classList.toggle('is-playing', playing);
    playBtn.replaceChildren(icon(playing ? 'pause' : 'play'));
    const t = a.full.currentTime;
    if (!dragging) {
      range.value = String(t);
      time.textContent = `${fmtTime(t)} / ${fmtTime(a.full.duration || dur)}`;
    }
    if (String(a.full.playbackRate) !== speed.value) speed.value = String(store.get().speed);
    // highlight only where the sentence's start and end in the full recording are verified
    const sid = playing || t > 0 ? a.sentenceAt(t) : null;
    if (sid !== lastSpeaking) {
      document.querySelectorAll('.is-speaking').forEach((el) => el.classList.remove('is-speaking'));
      if (sid) {
        const el = document.querySelector<HTMLElement>(`[data-sid="${sid}"]`);
        el?.classList.add('is-speaking');
        if (el && playing && store.get().follow && getMode() !== 'shadow') {
          const r = el.getBoundingClientRect();
          if (r.top < 80 || r.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (playing) ctx.setSentence(sid);
      }
      lastSpeaking = sid;
    }
  };
  onPageCleanup(a.on(update));
  return h('div', { class: 'player', role: 'region', 'aria-label': '全文音频' }, label, restart, playBtn, time, range, speed, follow);
}

export function renderUnit(app: HTMLElement, unitId: string, modeArg: string, sid: string): () => void {
  const cleanups: (() => void)[] = [];
  let alive = true;
  const summary = UNITS.find((u) => u.unit === unitId)!;
  document.title = `${unitId} ${summary.title} · Danish CORE`;
  const shell = h('div', { class: 'unit' }, h('p', { class: 'loading' }, '载入中…'));
  app.append(shell);

  void (async () => {
    const [unit, audioData, teaching] = await Promise.all([loadCore(unitId), loadAudio(unitId), loadTeaching(unitId)]);
    if (!alive || !unit) return;
    const audio = new AudioHub(audioData);
    cleanups.push(() => audio.destroy());
    let mode: Mode = (MODES.some((m) => m.key === modeArg) ? modeArg : store.get().mode) as Mode;
    let modeCleanups: (() => void)[] = [];
    const chapterNodes = new Map<number, HTMLElement>();
    const ctx: Ctx = {
      unit,
      audio,
      teach: teaching.byId,
      sid: sid || undefined,
      chapterNodes,
      onCleanup: (fn) => modeCleanups.push(fn),
      setSentence: (id) => {
        store.touch(unitId, id);
        history.replaceState(null, '', `#/${unitId}/${mode}/${id}`);
      },
    };
    store.touch(unitId);

    const nTaught = unit.sentences.filter((s) => teaching.byId.has(s.id)).length;
    const nClips = Object.keys(audioData?.sentences ?? {}).length;
    const dur = audioData?.full?.duration_s;
    const head = h(
      'header',
      { class: 'u-head' },
      h('a', { class: 'back', href: '#/' }, icon('back'), '全部单元'),
      h('div', { class: 'series' }, `Danish C1 Corpus · ${unit.unit} · Deep Teacher`),
      h('h1', { lang: 'da' }, unit.title),
      h('p', { class: 'u-sub', lang: 'da' }, unit.subtitle),
      h(
        'p',
        { class: 'u-meta' },
        `${unit.sentences.length} 句 · ${unit.chapters.length} 章`,
        dur ? ` · 全文 ${fmtTime(dur)}` : '',
        ` · 单句音频 ${nClips}/${unit.sentences.length}`,
        ' · ',
        nTaught ? `讲解 ${nTaught}/${unit.sentences.length}` : h('span', { class: 'pending' }, '讲解制作中'),
      ),
      h('p', { class: 'u-labels', lang: 'da' }, unit.labels.join(' · ')),
    );
    const tabs = h('nav', { class: 'modes', role: 'tablist', 'aria-label': '学习模式' });
    const tocList = h(
      'ol',
      { class: 'toc-list' },
      unit.chapters.map((c, i) =>
        h(
          'li',
          null,
          h('button', { type: 'button', class: 'toc-link', 'data-ch': String(i) }, h('span', { class: 'toc-n' }, `${i + 1}.`), h('span', { lang: 'da' }, c.title)),
        ),
      ),
    );
    tocList.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-ch]');
      if (!b) return;
      const ch = Number(b.dataset.ch);
      const node = chapterNodes.get(ch);
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else {
        // shadow mode: jump to the chapter's first sentence
        const first = unit.sentences.find((s) => s.ch === ch);
        if (first) {
          ctx.sid = first.id;
          switchMode(mode);
        }
      }
      tocM.open = false;
    });
    const tocM = h('details', { class: 'toc-m' }, h('summary', null, '章节导航', icon('chev')));
    const tocInner = h('div', { class: 'toc-inner' }, h('div', { class: 'toc-title' }, '章节导航'));
    const aside = h('aside', { class: 'toc', 'aria-label': '章节导航' }, tocInner);
    const placeToc = () => (window.matchMedia('(min-width: 1100px)').matches ? tocInner.append(tocList) : tocM.append(tocList));
    placeToc();
    const mq = window.matchMedia('(min-width: 1100px)');
    const onMq = () => placeToc();
    mq.addEventListener('change', onMq);
    cleanups.push(() => mq.removeEventListener('change', onMq));

    const content = h('div', { class: 'u-content' });
    const problems = teaching.problems.length
      ? h('p', { class: 'notice' }, `有 ${teaching.problems.length} 个教学文件未通过校验，已跳过：${teaching.problems.join('；')}`)
      : null;
    const resetBtn = h('button', { type: 'button', class: 'btn btn-link' }, '重置本单元的学习进度');
    resetBtn.addEventListener('click', () => {
      if (confirm(`清除 ${unitId} 的句子标记和阅读位置？`)) {
        store.resetUnit(unitId);
        switchMode(mode);
      }
    });
    const main = h('main', { class: 'u-main' }, tocM, problems, content, h('footer', { class: 'u-foot' }, resetBtn, h('span', null, '进度只保存在本浏览器。')));
    const bar = playerBar(ctx, () => mode, (fn) => cleanups.push(fn));

    function switchMode(m: Mode) {
      modeCleanups.forEach((f) => f());
      modeCleanups = [];
      audio.stopClip();
      audio.onClipEnded(null);
      audio.setLoop(false);
      chapterNodes.clear();
      mode = m;
      store.set('mode', m);
      shell.dataset.mode = m;
      tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
      history.replaceState(null, '', `#/${unitId}/${m}${ctx.sid ? '/' + ctx.sid : ''}`);
      content.replaceChildren();
      const r = { read: renderRead, listen: renderListen, shadow: renderShadow, recall: renderRecall }[m];
      content.append(r(ctx));
      ctx.onCleanup(audio.on(() => syncPlayState(content, audio)));
      ctx.sid = undefined;
    }
    for (const m of MODES) {
      const b = h('button', { type: 'button', role: 'tab', class: 'mode', 'data-mode': m.key, title: m.hint }, h('span', { class: 'mode-zh' }, m.zh), h('span', { class: 'mode-da', lang: 'da' }, m.da));
      b.addEventListener('click', () => {
        if (m.key !== mode) {
          ctx.sid = store.unit(unitId).last;
          switchMode(m.key);
        }
      });
      tabs.append(b);
    }
    audio.full.dataset.role = 'full';
    audio.clip.dataset.role = 'clip';
    shell.replaceChildren(head, tabs, h('div', { class: 'u-body' }, aside, main), bar, h('div', { hidden: true }, audio.full, audio.clip));
    switchMode(mode);
    cleanups.push(() => modeCleanups.forEach((f) => f()));
  })();

  return () => {
    alive = false;
    cleanups.forEach((f) => f());
  };
}
