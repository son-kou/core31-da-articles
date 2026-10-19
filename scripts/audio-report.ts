// reports/AUDIO_COVERAGE.tsv (written by scripts/audio/build_audio.py) → reports/AUDIO_COVERAGE.md (human-readable, Chinese).
import fs from 'node:fs';
import path from 'node:path';
import { AUDIO_JSON, REPORTS, UNITS } from './paths';
import { loadUnit } from './registry';

const rows = fs.readFileSync(path.join(REPORTS, 'AUDIO_COVERAGE.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => {
  const [unit, id, status, reason, similarity] = l.split('\t');
  return { unit, id, status, reason, similarity };
});
const why = (r: string) =>
  r.startsWith('alignment_uncertain:boundary') ? '句子边界未能经停顿 + ASR 双重确认（多为连续短对话）'
  : r.startsWith('alignment_uncertain') && r.includes('too_short') ? '片段过短，无法独立验证'
  : r.startsWith('clip_check_failed') ? `切出的片段独立复核未通过（${r.replace('clip_check_failed:', '')}）`
  : r;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
let total = 0;
let ok = 0;
let rec = 0;
const table: string[] = [];
const missing: string[] = [];
for (const u of UNITS) {
  const m = JSON.parse(fs.readFileSync(path.join(AUDIO_JSON, `${u}.json`), 'utf8'));
  const unit = loadUnit(u);
  const rs = rows.filter((r) => r.unit === u);
  const v = rs.filter((r) => r.status === 'verified').length;
  const re = rs.filter((r) => r.status === 'recovered').length;
  total += unit.sentences.length;
  ok += v + re;
  rec += re;
  table.push(`| ${u} | ${m.full ? fmt(m.full.duration_s) : '—'} | ${v + re}/${unit.sentences.length} | ${unit.sentences.length - v - re} |`);
  for (const r of rs.filter((x) => x.status === 'unavailable')) {
    const s = unit.sentences.find((x) => x.id === r.id)!;
    missing.push(`| ${r.id} | ${s.speaker ? s.speaker + ': ' : ''}${s.text.replace(/\|/g, '\\|')} | ${why(r.reason)} |`);
  }
}
const md = `# 音频覆盖报告

自动生成（\`python3 scripts/audio/build_audio.py\` → \`npx tsx scripts/audio-report.ts\`）。没有调用任何 TTS 或付费 API。

## 结论

- **全文音频：31/31 单元**，即原有的 \`V3_CORE_AUDIO/Uxx_CORE.mp3\`（逐字节复制，未重新合成）。
- **单句音频：${ok}/${total} 句（${((ok / total) * 100).toFixed(1)}%）经过验证**，其中 ${rec} 句是本次通过独立复核“救回”的。
- 其余 ${total - ok} 句**不提供单句播放**（按钮置灰），也不在听力模式里高亮——宁缺毋错。这些句子在全文音频里都能听到。

## 验证方法

1. 句子边界来自 Anki 整合阶段的离线对齐（\`V3_ANKI_INTEGRATION/WORK/audio_align/Uxx_LINES_EXACT.tsv\`）：边界必须落在无损 WAV 中检测到的停顿里，并且与本地 ASR（faster-whisper small）的词间隙吻合。按字数比例估算的 \`*_LINES_APPROX.tsv\` 从未使用。
2. 对齐行的原句与文本 SHA-256 必须与冻结 CORE 完全一致；分段 WAV 的 SHA-256 必须与对齐时相同。
3. 从无损分段 WAV 切出 MP3（CBR 48 kbps，单声道，24 kHz，与 Anki 版相同），检查可完整解码、长度等于验证区间（±0.08 s）、首尾静音 ≤ 0.35 s。
4. **独立复核**：单独转写每个片段，与冻结原句的字母相似度 ≥ 0.80，且首尾各 10 个字母相似度 ≥ 0.6（防止截掉开头或结尾）。
5. 网站构建前 \`npm run validate:audio\` 再次核对：片段文件 SHA-256、句子文本哈希、区间顺序与时长。

“全文跟随高亮”使用同一批经过验证的区间（分段在全文 MP3 中的偏移 + 句内边界），未验证的句子不高亮。

## 各单元

| 单元 | 全文时长 | 单句音频 | 缺失 |
|---|---|---|---|
${table.join('\n')}

## 没有单句音频的句子（${missing.length}）

| 句子 | 原文 | 原因 |
|---|---|---|
${missing.join('\n')}
`;
fs.writeFileSync(path.join(REPORTS, 'AUDIO_COVERAGE.md'), md);
console.log(`AUDIO_COVERAGE.md: ${ok}/${total} sentences with verified clips; ${missing.length} unavailable.`);
