// Teaching JSON (GPT output) — schema, validation and safety rules. Pure; used by `npm run validate:teacher`, tests and the site.
// The Danish text never comes from these files: the site looks every sentence up in the frozen CORE by ID.

export interface VocabItem {
  da: string;
  zh: string;
  note?: string;
}

export interface TeacherSentence {
  id: string;
  zh: string;
  grammar?: string | null;
  vocabulary?: VocabItem[] | null;
  nuance?: string | null;
  transfer?: string[] | null;
  pitfall?: string | null;
}

export interface TeacherFile {
  schema_version: 1;
  unit: string;
  part: string;
  source_fingerprint: string;
  sentences: TeacherSentence[];
}

export interface Expectation {
  unit: string;
  part: string; // P01 … or ALL
  ids: string[];
  fingerprint: string;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const TOP_KEYS = ['schema_version', 'unit', 'part', 'source_fingerprint', 'sentences'];
const SENT_KEYS = ['id', 'zh', 'grammar', 'vocabulary', 'nuance', 'transfer', 'pitfall'];
const VOCAB_KEYS = ['da', 'zh', 'note'];
const MAX_LEN = 4000;

// Markup or script in a teaching string is never rendered (the site uses textContent), but it is rejected so nothing
// half-broken is committed.
const UNSAFE = [
  { re: /<\s*\/?\s*[a-z!?]/i, why: 'HTML 标签' },
  { re: /javascript\s*:/i, why: 'javascript: 链接' },
  { re: /\bon[a-z]{3,}\s*=/i, why: '事件属性 (onclick= 等)' },
  { re: /&(#\d+|#x[0-9a-f]+|[a-z]+);/i, why: 'HTML 实体' },
  { re: /\{\{|\}\}|\$\{/, why: '模板占位语法' },
];
const PLACEHOLDER_WHOLE = /^(todo|tbd|n\/?a|none|null|undefined|xxx+|\.\.\.|…+|-+|—+|待补充?|待定|待填写?|略|同上|暂无|无|占位|placeholder|lorem ipsum.*)$/i;
const PLACEHOLDER_ANY = /\bTODO\b|\bTBD\b|\bFIXME\b|lorem ipsum|待补|待填|占位符|此处填写|在这里填写/i;
const CJK = /[一-鿿]/;

function str(v: unknown): v is string {
  return typeof v === 'string';
}

function checkText(where: string, v: string, errors: string[]) {
  if (v.length > MAX_LEN) errors.push(`${where}: 文本过长（${v.length} 字符，上限 ${MAX_LEN}）`);
  for (const u of UNSAFE) if (u.re.test(v)) errors.push(`${where}: 含有 ${u.why}，请删除（只允许纯文本，丹麦语片段用反引号 \`...\`）`);
  if (PLACEHOLDER_WHOLE.test(v.trim()) || PLACEHOLDER_ANY.test(v))
    errors.push(`${where}: 看起来是占位文字（${JSON.stringify(v.slice(0, 30))}）。没有内容的字段请写 "" 或 []`);
}

export function validateTeacher(data: unknown, exp: Expectation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { errors: ['顶层必须是一个 JSON 对象 { ... }'], warnings };
  }
  const d = data as Record<string, unknown>;
  for (const k of Object.keys(d)) if (!TOP_KEYS.includes(k)) errors.push(`顶层不允许的字段 "${k}"（只允许 ${TOP_KEYS.join(', ')}）`);
  if (d.schema_version !== 1) errors.push(`schema_version 必须是 1（现在是 ${JSON.stringify(d.schema_version)}）`);
  if (d.unit !== exp.unit) errors.push(`unit 应为 "${exp.unit}"（现在是 ${JSON.stringify(d.unit)}）——文件是否放错了文件夹？`);
  if (d.part !== exp.part) errors.push(`part 应为 "${exp.part}"（现在是 ${JSON.stringify(d.part)}）——文件名与内容不一致？`);
  if (d.source_fingerprint !== exp.fingerprint)
    errors.push(`source_fingerprint 应为 "${exp.fingerprint}"（现在是 ${JSON.stringify(d.source_fingerprint)}）——请用对应 prompt 的回答，并原样复制指纹`);
  if (!Array.isArray(d.sentences)) {
    errors.push('sentences 必须是数组 [ ... ]');
    return { errors, warnings };
  }
  const want = new Set(exp.ids);
  const seen = new Set<string>();
  const order: string[] = [];
  d.sentences.forEach((raw, i) => {
    const at = `sentences[${i}]`;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      errors.push(`${at}: 必须是对象`);
      return;
    }
    const s = raw as Record<string, unknown>;
    const id = s.id;
    const w = str(id) ? `${at} (${id})` : at;
    if (!str(id)) {
      errors.push(`${at}: 缺少 id`);
      return;
    }
    if (!want.has(id)) errors.push(`${w}: 未知 ID——不属于 ${exp.unit} ${exp.part}（本批应为 ${exp.ids[0]} … ${exp.ids[exp.ids.length - 1]}）`);
    if (seen.has(id)) errors.push(`${w}: ID 重复`);
    seen.add(id);
    order.push(id);
    for (const k of Object.keys(s)) {
      if (SENT_KEYS.includes(k)) continue;
      const hint = /^(da|danish|text|sentence|original|source)$/i.test(k) ? '——教学 JSON 不得包含丹麦语原句，原句只来自冻结 CORE' : '';
      errors.push(`${w}: 不允许的字段 "${k}"${hint}；请删除`);
    }
    if (!str(s.zh) || !s.zh.trim()) errors.push(`${w}: zh（中文意思）必填`);
    else {
      if (!CJK.test(s.zh)) errors.push(`${w}: zh 里没有中文`);
      checkText(`${w}.zh`, s.zh, errors);
    }
    for (const k of ['grammar', 'nuance', 'pitfall'] as const) {
      const v = s[k];
      if (v === undefined || v === null) continue;
      if (!str(v)) errors.push(`${w}.${k}: 必须是字符串（没有内容就写 ""）`);
      else if (v.trim()) checkText(`${w}.${k}`, v, errors);
    }
    const voc = s.vocabulary;
    if (voc !== undefined && voc !== null) {
      if (!Array.isArray(voc)) errors.push(`${w}.vocabulary: 必须是数组`);
      else
        voc.forEach((it, j) => {
          const vw = `${w}.vocabulary[${j}]`;
          if (typeof it !== 'object' || it === null || Array.isArray(it)) {
            errors.push(`${vw}: 必须是 {"da": "...", "zh": "..."}`);
            return;
          }
          const o = it as Record<string, unknown>;
          for (const k of Object.keys(o)) if (!VOCAB_KEYS.includes(k)) errors.push(`${vw}: 不允许的字段 "${k}"（只允许 da, zh, note）`);
          for (const k of ['da', 'zh'] as const) {
            if (!str(o[k]) || !(o[k] as string).trim()) errors.push(`${vw}.${k}: 必填字符串`);
            else checkText(`${vw}.${k}`, o[k] as string, errors);
          }
          if (o.note !== undefined && o.note !== null) {
            if (!str(o.note)) errors.push(`${vw}.note: 必须是字符串`);
            else if (o.note.trim()) checkText(`${vw}.note`, o.note, errors);
          }
        });
    }
    const tr = s.transfer;
    if (tr !== undefined && tr !== null) {
      if (!Array.isArray(tr)) errors.push(`${w}.transfer: 必须是字符串数组`);
      else
        tr.forEach((t, j) => {
          if (!str(t) || !t.trim()) errors.push(`${w}.transfer[${j}]: 必须是非空字符串`);
          else checkText(`${w}.transfer[${j}]`, t, errors);
        });
    }
  });
  const missing = exp.ids.filter((x) => !seen.has(x));
  if (missing.length) {
    const tail = missing[missing.length - 1] === exp.ids[exp.ids.length - 1] ? '（缺的是结尾部分，GPT 回复很可能被截断：请在新对话里重新发送这一批的 prompt）' : '';
    errors.push(`缺少 ${missing.length} 句：${missing.join(', ')}${tail}`);
  }
  if (!errors.length && order.join() !== exp.ids.filter((x) => seen.has(x)).join())
    warnings.push('句子顺序与原文不同（不影响显示，网站按原文顺序排列）');
  return { errors, warnings };
}

/** Friendly message for a JSON syntax error, with a guess at the usual causes. */
export function explainJsonError(text: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const hints: string[] = [];
  const t = text.trim();
  if (t.startsWith('```')) hints.push('文件以 ``` 开头：请删掉 GPT 回复里的 ```json 和结尾的 ```（或用 npm run ingest 自动处理）');
  else if (!t.startsWith('{')) hints.push('文件不是以 { 开头：请删掉 JSON 前面的说明文字');
  if (!t.endsWith('}') && !t.endsWith('```')) hints.push('文件不是以 } 结尾：GPT 回复很可能被截断了。让 GPT “从中断处继续” 往往会产生无法拼接的半截 JSON，最稳妥的是重新生成这一批');
  if (/[“”]/.test(t.replace(/"(?:[^"\\]|\\.)*"/g, ''))) hints.push('字符串外出现了中文引号 “ ”：JSON 只能用英文双引号 "');
  if (/,\s*[}\]]/.test(t)) hints.push('有多余的逗号（, 后面紧跟 } 或 ]）');
  return `JSON 语法错误：${msg}${hints.length ? '\n    可能原因：\n    - ' + hints.join('\n    - ') : ''}`;
}

/** Strip what chat UIs typically wrap around a JSON answer. Used by `npm run ingest` (never silently by the validator). */
export function unwrapGptAnswer(text: string): string {
  let t = text.replace(/^﻿/, '').trim();
  const fence = /```(?:json)?\s*\n([\s\S]*?)\n?```/i.exec(t);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a > 0 || (b >= 0 && b < t.length - 1)) t = t.slice(Math.max(0, a), b + 1);
  return t;
}
