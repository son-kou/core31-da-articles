// Deterministic: CORE JSON → src/data/parts.json, prompts/Uxx_PROMPT.txt (whole unit), prompts/parts/Uxx_Pyy_PROMPT.txt, prompts/INDEX.md.
import fs from 'node:fs';
import path from 'node:path';
import { buildPrompt } from './prompt-text';
import { PROMPTS, UNITS } from './paths';
import { computeRegistry, loadUnit, PARTS_JSON } from './registry';

const reg = computeRegistry();
fs.writeFileSync(PARTS_JSON, JSON.stringify(reg) + '\n');
fs.mkdirSync(path.join(PROMPTS, 'parts'), { recursive: true });
for (const f of fs.readdirSync(path.join(PROMPTS, 'parts'))) if (f.endsWith('_PROMPT.txt')) fs.rmSync(path.join(PROMPTS, 'parts', f));
const rows: string[] = [];
let nParts = 0;
let maxChars = 0;
for (const u of UNITS) {
  const unit = loadUnit(u);
  const { all, parts } = reg[u];
  fs.writeFileSync(path.join(PROMPTS, `${u}_PROMPT.txt`), buildPrompt(unit, 'ALL', all.ids, all.fingerprint, parts.length));
  for (const p of parts) {
    const txt = buildPrompt(unit, p.part, p.ids, p.fingerprint, parts.length);
    maxChars = Math.max(maxChars, txt.length);
    fs.writeFileSync(path.join(PROMPTS, 'parts', `${u}_${p.part}_PROMPT.txt`), txt);
    nParts++;
  }
  const sizes = parts.map((p) => p.ids.length).join(' + ');
  const rec = all.ids.length <= 20 ? `整篇 ${u}_PROMPT.txt 或分批均可` : '用分批 prompt';
  rows.push(`| ${u} | ${unit.title} | ${all.ids.length} | ${parts.length} (${sizes}) | ${rec} | \`src/data/teacher/${u}/P01.json\` … \`P${String(parts.length).padStart(2, '0')}.json\` |`);
}
const index = `# GPT 教学 prompt 索引

自动生成（\`npm run prompts\`），请勿手改。共 31 个整篇 prompt、${nParts} 个分批 prompt。

**推荐做法：使用分批 prompt** \`prompts/parts/Uxx_Pyy_PROMPT.txt\`（每批 12–18 句）。
整篇 prompt \`prompts/Uxx_PROMPT.txt\` 是总览和便捷入口：只有很短的单元才建议一次生成整篇，长单元的整篇回答很容易被截断。

| 单元 | 标题 | 句数 | 分批数 (每批句数) | 建议 | 保存位置 |
|---|---|---|---|---|---|
${rows.join('\n')}

- 分批 prompt 的回答保存为 \`src/data/teacher/Uxx/Pyy.json\`（例如 \`U00_P02_PROMPT.txt\` → \`src/data/teacher/U00/P02.json\`）。
- 整篇 prompt 的回答保存为 \`src/data/teacher/Uxx/ALL.json\`。同一单元不要同时保留 ALL.json 和 Pxx.json（校验会报“重复覆盖”）。
- 每个 prompt 都自带全文上下文、句子 ID、指纹和输出格式，可以单独粘贴到新的 ChatGPT 对话中使用。
`;
fs.writeFileSync(path.join(PROMPTS, 'INDEX.md'), index);
console.log(`31 unit prompts + ${nParts} part prompts written; longest part prompt ${maxChars} chars.`);
