import { AUDIO_INDEX, PARTS, teachingCoverage, UNITS } from '../data';
import { fmtTime, h } from '../dom';
import { GROUPS } from '../lib/groups';
import type { UnitSummary } from '../lib/core-format';
import { store } from '../store';

function unitCard(u: UnitSummary) {
  const total = u.sentences;
  const taught = teachingCoverage(u.unit);
  const dur = AUDIO_INDEX[u.unit]?.duration_s;
  const marks = Object.values(store.unit(u.unit).marks);
  const mastered = marks.filter((m) => m === 'mastered').length;
  const familiar = marks.filter((m) => m === 'familiar').length;
  const practicing = marks.filter((m) => m === 'practicing').length;
  const teach =
    taught === 0
      ? h('span', { class: 'pill pill-muted' }, '讲解制作中')
      : taught === total
        ? h('span', { class: 'pill pill-ok' }, '讲解完整')
        : h('span', { class: 'pill' }, `讲解 ${taught}/${total}`);
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  return h(
    'a',
    { class: 'ucard', href: `#/${u.unit}`, 'data-unit': u.unit },
    h('div', { class: 'ucard-top' }, h('span', { class: 'unum' }, u.unit), teach),
    h('h3', { class: 'ucard-title', lang: 'da' }, u.title),
    h('p', { class: 'ucard-sub', lang: 'da' }, u.subtitle),
    h('p', { class: 'ucard-labels', lang: 'da' }, u.labels.join(' · ')),
    h(
      'div',
      { class: 'ucard-meta' },
      `${total} 句 · ${u.chapters.length} 章`,
      dur ? ` · ${fmtTime(dur)}` : '',
    ),
    marks.length
      ? h(
          'div',
          { class: 'progress', title: `已掌握 ${mastered} · 熟悉 ${familiar} · 练习中 ${practicing}` },
          h('span', { class: 'pg pg-m', style: `width:${pct(mastered)}` }),
          h('span', { class: 'pg pg-f', style: `width:${pct(familiar)}` }),
          h('span', { class: 'pg pg-p', style: `width:${pct(practicing)}` }),
        )
      : null,
    marks.length ? h('div', { class: 'ucard-prog' }, `已掌握 ${mastered} · 熟悉 ${familiar} · 练习中 ${practicing}`) : null,
  );
}

export function renderHome(app: HTMLElement) {
  document.title = 'Danish CORE · Deep Teacher';
  const totalSent = UNITS.reduce((n, u) => n + u.sentences, 0);
  const totalDur = UNITS.reduce((n, u) => n + (AUDIO_INDEX[u.unit]?.duration_s ?? 0), 0);
  const totalTaught = UNITS.reduce((n, u) => n + teachingCoverage(u.unit), 0);
  const totalClips = UNITS.reduce((n, u) => n + (AUDIO_INDEX[u.unit]?.clips ?? 0), 0);
  const hrs = Math.floor(totalDur / 3600);
  const mins = Math.round((totalDur % 3600) / 60);
  const st = store.get();
  const last = st.lastUnit && UNITS.find((u) => u.unit === st.lastUnit);

  const search = h('input', { type: 'search', class: 'search', placeholder: '搜索：标题、主题、单元号…', 'aria-label': '搜索单元', lang: 'da' });
  let byTheme = true;
  const viewBtn = h('button', { type: 'button', class: 'btn btn-quiet', 'aria-pressed': 'false' }, '按 U00–U30 顺序');
  const shelves = h('div', { class: 'shelves' });
  const empty = h('p', { class: 'empty', hidden: true }, '没有匹配的单元。');

  function matches(u: UnitSummary, q: string) {
    if (!q) return true;
    const hay = [u.unit, u.title, u.subtitle, u.labels.join(' '), u.chapters.join(' ')].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }

  function draw() {
    const q = search.value.trim();
    shelves.replaceChildren();
    let shown = 0;
    if (byTheme) {
      for (const g of GROUPS) {
        const us = g.units.map((id) => UNITS.find((u) => u.unit === id)!).sort((a, b) => a.unit.localeCompare(b.unit)).filter((u) => matches(u, q));
        if (!us.length) continue;
        shown += us.length;
        shelves.append(
          h('section', { class: 'shelf' }, h('h2', { class: 'shelf-title' }, g.zh, h('span', { class: 'shelf-da', lang: 'da' }, g.da)), h('div', { class: 'grid' }, us.map(unitCard))),
        );
      }
    } else {
      const us = UNITS.filter((u) => matches(u, q));
      shown = us.length;
      shelves.append(h('div', { class: 'grid' }, us.map(unitCard)));
    }
    empty.hidden = shown > 0;
  }
  search.addEventListener('input', draw);
  viewBtn.addEventListener('click', () => {
    byTheme = !byTheme;
    viewBtn.textContent = byTheme ? '按 U00–U30 顺序' : '按主题分组';
    viewBtn.setAttribute('aria-pressed', String(!byTheme));
    draw();
  });

  const resetAll = h('button', { type: 'button', class: 'btn btn-link' }, '清除本浏览器中的全部学习进度');
  resetAll.addEventListener('click', () => {
    if (confirm('清除全部单元的学习标记和阅读位置？（主题设置保留）')) {
      store.resetAll();
      app.replaceChildren();
      renderHome(app);
    }
  });

  app.append(
    h(
      'div',
      { class: 'home' },
      h(
        'header',
        { class: 'hero' },
        h('div', { class: 'series' }, 'Danish C1 Corpus · CORE · Deep Teacher'),
        h('h1', null, '31 篇丹麦语精读'),
        h('p', { class: 'hero-sub' }, '冻结原文逐句精讲 · 全文朗读与单句跟读 · 精读、听力、跟读、背诵四种模式'),
        h(
          'p',
          { class: 'stats' },
          `31 单元 · ${totalSent.toLocaleString('zh-CN')} 句 · 全文音频 ${hrs} 小时 ${mins} 分 · 单句音频 ${totalClips}/${totalSent} · 讲解 ${totalTaught}/${totalSent}`,
        ),
      ),
      last
        ? h(
            'a',
            { class: 'continue', href: `#/${last.unit}/${st.mode}` },
            h('span', { class: 'continue-k' }, '继续学习'),
            h('span', { class: 'continue-u' }, last.unit),
            h('span', { class: 'continue-t', lang: 'da' }, last.title),
            store.unit(last.unit).last ? h('span', { class: 'continue-s' }, store.unit(last.unit).last!) : null,
          )
        : null,
      h('div', { class: 'toolbar' }, search, viewBtn),
      shelves,
      empty,
      h(
        'footer',
        { class: 'foot' },
        h('p', null, '学习进度（阅读位置、句子标记、模式、语速、主题）只保存在当前浏览器的 localStorage 中，不会上传，也不会在设备之间同步。'),
        h('p', null, `丹麦语原文来自冻结的 V3 CORE（${Object.keys(PARTS).length} 单元，逐字节校验）；讲解由 GPT 生成后经校验加入。`),
        resetAll,
      ),
    ),
  );
  draw();
}
