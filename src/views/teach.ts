// Deep Teacher sections for one sentence (layout follows the U00 Deep Teacher PDF: small terracotta labels, quiet boxes).
import { h, rich } from '../dom';
import type { TeacherSentence } from '../lib/teacher-schema';

export const LABELS = {
  zh: '中文意思',
  grammar: '句法骨架 / 语法',
  vocabulary: '词汇 / 固定搭配',
  nuance: '语感 / 为什么这样说',
  transfer: '可迁移表达',
  pitfall: '易错点 / 记忆提醒',
} as const;

const filled = (s?: string | null) => !!s && !!s.trim();

export function hasDetails(t: TeacherSentence) {
  return filled(t.grammar) || !!t.vocabulary?.length || filled(t.nuance) || !!t.transfer?.length || filled(t.pitfall);
}

export function zhRow(t: TeacherSentence) {
  return h('div', { class: 't-row t-zh' }, h('span', { class: 't-lab' }, LABELS.zh), h('p', { class: 't-val' }, t.zh));
}

export function detailsBlock(t: TeacherSentence): HTMLElement {
  const box = h('div', { class: 't-details' });
  if (filled(t.grammar)) box.append(h('div', { class: 't-row' }, h('span', { class: 't-lab' }, LABELS.grammar), h('p', { class: 't-val' }, rich(t.grammar!))));
  if (t.vocabulary?.length)
    box.append(
      h(
        'div',
        { class: 't-row' },
        h('span', { class: 't-lab' }, LABELS.vocabulary),
        h(
          'ul',
          { class: 't-val t-vocab' },
          t.vocabulary.map((v) =>
            h('li', null, h('span', { class: 'da', lang: 'da' }, v.da), h('span', { class: 'eq' }, ' = '), rich(v.zh), v.note?.trim() ? h('span', { class: 'note' }, '（', rich(v.note), '）') : null),
          ),
        ),
      ),
    );
  if (filled(t.nuance)) box.append(h('div', { class: 't-row' }, h('span', { class: 't-lab' }, LABELS.nuance), h('p', { class: 't-val' }, rich(t.nuance!))));
  if (t.transfer?.length)
    box.append(
      h(
        'div',
        { class: 't-box t-transfer' },
        h('span', { class: 't-lab' }, LABELS.transfer),
        h('ul', { class: 't-val' }, t.transfer.map((x) => h('li', { lang: 'da' }, rich(x)))),
      ),
    );
  if (filled(t.pitfall)) box.append(h('div', { class: 't-box t-pitfall' }, h('span', { class: 't-lab' }, LABELS.pitfall), h('p', { class: 't-val' }, rich(t.pitfall!))));
  return box;
}
