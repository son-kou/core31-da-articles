// Text of the GPT teaching prompts (Chinese). Generated per unit and per part by scripts/gen-prompts.ts.
import type { CoreUnit } from '../src/lib/core-format';

export const SPEC = `你是一位资深丹麦语教师：丹麦语达到母语水平，同时精通现代汉语，长期教授高级阶段的中国学习者。
学习者是以简体中文为母语的成年人，正从 B2 迈向 C1/C2。目标是把这篇文章逐句读透、背熟，并能在自己的口语和写作中主动使用其中的表达。

任务：为下面【本批需要讲解的句子】中的每一句写一份逐句精讲（Deep Teacher），只输出 JSON。

## 一、不可违反的规则
1. 丹麦语原文已冻结，一字不改：不要改写、纠正、缩短、补全或重新断句。输出中不要出现原句全文——网站会按 ID 从冻结原文中取句子。
2. 本批每个 ID 恰好输出一次，按原文顺序；不得增加、遗漏、合并或拆分句子；不得输出本批以外的 ID（上下文句子只供理解）。
3. unit、part、source_fingerprint 必须与下方给出的值逐字一致。指纹直接复制，不要计算、修改或补全。
4. 只输出一个合法的 JSON 对象：不要前言、结语、解释、Markdown 代码块标记、注释或省略号。字符串里只用英文双引号 " 作为 JSON 引号。
5. 字段内容只写纯文本，不用 HTML 或 Markdown。引用丹麦语单词、短语或句型时，用反引号括起来，例如 \`holde øje med\`。
6. 字段没有真正值得写的内容时，用 "" 或 []；不要写“无”“略”“同上”“TODO”之类的占位文字。

## 二、各字段的讲解要求
- "zh"（中文意思，必填）：准确、地道的简体中文译文。保留语用含义、语体、隐含的主语和与上下文的衔接；对话要译出说话人的语气。不要逐词硬译。
- "grammar"（句法骨架 / 语法）：只讲这一句里真正值得学的结构，例如 V2 语序与倒装、条件倒装（\`Spørger man …\`）、从句语序（主语 + \`ikke\`/副词 + 动词）、否定与副词位置、时态与体、s-被动与 blive-被动、情态动词、省略成分、代词指代、强调句 \`Det er … der/som\`、分裂句、动词小品词。先给骨架（谁 + 做什么 + 状语如何排列），再点出关键规则。简单句不要为了填字段而写泛泛的语法描述。
- "vocabulary"（词汇 / 固定搭配）：挑出值得主动掌握的词和搭配，每项 {"da": "丹麦语（用词典形式或原文中的搭配形式）", "zh": "中文释义", "note": "可选：必需的介词、名词性别 en/et、不规则变化、语体或典型搭配"}。优先选在本文之外也常用的表达，通常 1–5 项。
- "nuance"（语感 / 为什么这样说）：解释丹麦人为什么在这个语境下这样说——语体（口语 / 书面 / 正式）、礼貌程度、反讽、轻描淡写（understatement）、语气小品词（\`jo\`、\`vel\`、\`nu\`、\`da\`、\`bare\`、\`lige\`、\`nok\`、\`altså\` 等）的作用、与近义说法的区别、在篇章中的作用。区分口语和书面语；不要夸大某个表达的使用频率。
- "transfer"（可迁移表达）：1–3 个可以直接套用到别的话题的句型或搭配，可用 X、Y、… 作占位，例如 "Det kan ikke betale sig at + 不定式"、"Spørger man X, …"。必须是真实、语法正确、母语者会用的丹麦语。
- "pitfall"（易错点 / 记忆提醒）：中国学习者在这里真实会犯的错——假朋友、字面直译陷阱、介词、语序、名词性别、近形词混淆，或一句帮助记忆的提醒。没有真实的易错点就写 ""，不要为了填字段而编造错误。

## 三、质量门槛
- 精准、自然，紧扣这一句和它所在的段落与对话；难句（C1 结构、长从句、抽象表达）讲透，简单句（寒暄、短答、感叹）只需简洁讲清语用含义。
- 讲解要对背诵和主动输出有用：说清“怎么用”，而不只是“是什么意思”。
- 避免机械重复：本批前面已经讲过的知识点，后面一句话带过即可。
- 不编造语法规则、词源、出处或使用统计；不引用你没有实际查阅的词典或资料。
- 不改变作者原意，不添加原文没有的事实。
- 每句篇幅随难度变化：一般 120–500 个汉字，难句可以更长，极简单的句子可以只有 "zh" 和一两句 "nuance"。

## 四、输出格式（JSON schema）
{
  "schema_version": 1,
  "unit": "<见下方>",
  "part": "<见下方>",
  "source_fingerprint": "<见下方，原样复制>",
  "sentences": [
    {
      "id": "<句子 ID>",
      "zh": "中文意思（必填）",
      "grammar": "句法骨架 / 语法，或 \\"\\"",
      "vocabulary": [ { "da": "丹麦语词或搭配", "zh": "中文释义", "note": "可选说明" } ],
      "nuance": "语感 / 为什么这样说，或 \\"\\"",
      "transfer": [ "可迁移句型" ],
      "pitfall": "易错点 / 记忆提醒，或 \\"\\""
    }
  ]
}

格式示例（仅示意结构和语气，内容与本批无关，不要照抄）：
{"id": "UXX-C001", "zh": "一个夏日，在菲英岛的一条乡间公路上，一辆车在一个小木摊旁靠边停下。", "grammar": "时间状语 \`En sommerdag\` 和地点状语 \`på en landevej på Fyn\` 都放在句首，因此动词 \`holder\` 紧跟其后、主语 \`en bil\` 后移：V2 语序。", "vocabulary": [{"da": "holde ind til siden", "zh": "靠边停车", "note": "整体动词短语"}, {"da": "på Fyn", "zh": "在菲英岛", "note": "岛屿用 på"}], "nuance": "典型的叙事开场：先交代时间地点，再引出动作。", "transfer": ["En [tid] på [sted] + 动词 + 主语 …", "holde ind til siden ved …"], "pitfall": "\`holde ind\` 不是“保持在里面”，\`holde ind til siden\` 要整体记。"}
{"id": "UXX-C040", "zh": "当然。怎么了？", "grammar": "", "vocabulary": [{"da": "Hvad sker der?", "zh": "怎么了？/有什么事？", "note": "口语"}], "nuance": "\`Klart\` 是轻松的口头答应；\`Hvad sker der?\` 在这里不是“发生了什么事故”，而是同事间随和地问“有什么事”。", "transfer": ["Klart. Hvad sker der?"], "pitfall": ""}`;

export function articleContext(u: CoreUnit, mark?: Set<string>): string {
  const out: string[] = [`# ${u.unit} · ${u.title}`, `副标题：${u.subtitle}`, `主题标签：${u.labels.join(' · ')}`];
  let ch = -1;
  let p = -1;
  for (const s of u.sentences) {
    if (s.ch !== ch) {
      ch = s.ch;
      out.push('', `## 第 ${ch + 1} 章 · ${u.chapters[ch].title}`);
      p = s.p;
    } else if (s.p !== p) {
      out.push('');
      p = s.p;
    }
    const tag = s.speaker !== undefined ? `[对话 · ${s.speaker}] ` : s.doc ? '[文中引用的书面文本] ' : '';
    const m = mark ? (mark.has(s.id) ? '▶ ' : '  ') : '';
    out.push(`${m}${s.id} ${tag}${s.text}`);
  }
  return out.join('\n');
}

export function targetList(u: CoreUnit, ids: string[]): string {
  const idx = new Map(u.sentences.map((s) => [s.id, s]));
  return ids
    .map((id) => {
      const s = idx.get(id)!;
      const tag = s.speaker !== undefined ? `[${s.speaker}] ` : s.doc ? '[书面文本] ' : '';
      return `${id} ｜ 第 ${s.ch + 1} 章 ｜ ${tag}${s.text}`;
    })
    .join('\n');
}

export function buildPrompt(u: CoreUnit, part: string, ids: string[], fingerprint: string, nParts: number): string {
  const whole = part === 'ALL';
  const scope = whole
    ? `本次讲解整篇文章的全部 ${ids.length} 句（${ids[0]} – ${ids[ids.length - 1]}）。`
    : `本次是第 ${Number(part.slice(1))} / ${nParts} 批，讲解 ${ids.length} 句（${ids[0]} – ${ids[ids.length - 1]}）。全文放在下面作上下文，▶ 标出本批句子；其余句子只用于理解指代、对话和行文脉络，不要输出它们。`;
  return [
    `【Danish CORE · Deep Teacher】${u.unit} ${u.title}${whole ? ' · 整篇' : ` · ${part}`}`,
    '',
    SPEC,
    '',
    '## 五、本批的固定取值（逐字复制）',
    `"unit": "${u.unit}"`,
    `"part": "${part}"`,
    `"source_fingerprint": "${fingerprint}"`,
    `sentences 数组必须恰好包含 ${ids.length} 个对象，ID 依次为：`,
    ids.join(', '),
    '',
    '## 六、文章（冻结原文，只读）',
    scope,
    '',
    articleContext(u, whole ? undefined : new Set(ids)),
    '',
    `## 七、本批需要讲解的句子（共 ${ids.length} 句）`,
    targetList(u, ids),
    '',
    `输出前请自检：JSON 能被解析；sentences 共 ${ids.length} 项，第一个是 ${ids[0]}，最后一个是 ${ids[ids.length - 1]}；没有原句全文；没有 Markdown 代码块标记。`,
    '现在直接输出 JSON。',
    '',
  ].join('\n');
}
