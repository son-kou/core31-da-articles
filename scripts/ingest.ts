// npm run ingest — paste GPT answers as files into inbox/ (any name, .json or .txt). This strips ```json fences and chatter,
// reads unit + part from the answer itself, validates it, and writes src/data/teacher/Uxx/Pyy.json. Invalid answers stay in inbox/.
import fs from 'node:fs';
import path from 'node:path';
import { unwrapGptAnswer } from '../src/lib/teacher-schema';
import { SITE, TEACHER } from './paths';
import { loadCommittedRegistry } from './registry';
import { checkTeacherText } from './teacher-files';

const INBOX = path.join(SITE, 'inbox');
const reg = loadCommittedRegistry();
fs.mkdirSync(INBOX, { recursive: true });
const files = fs.readdirSync(INBOX).filter((f) => /\.(json|txt)$/i.test(f));
if (!files.length) console.log('inbox/ 里没有 .json 或 .txt 文件。把 GPT 的回答粘贴保存到 inbox/ 里再运行。');
let fail = 0;
for (const f of files) {
  const raw = fs.readFileSync(path.join(INBOX, f), 'utf8');
  const text = unwrapGptAnswer(raw);
  let head: { unit?: unknown; part?: unknown } = {};
  try {
    head = JSON.parse(text);
  } catch {
    /* reported below */
  }
  const unit = typeof head.unit === 'string' ? head.unit : '';
  const part = typeof head.part === 'string' ? head.part : '';
  const r = unit && part ? checkTeacherText(text, unit, part, reg) : { errors: ['无法读出 unit / part（JSON 不完整或被截断？）'], warnings: [] };
  if (r.errors.length) {
    fail++;
    console.error(`✗ inbox/${f}`);
    for (const e of r.errors) console.error(`    - ${e}`);
    continue;
  }
  const dest = path.join(TEACHER, unit, `${part}.json`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const existed = fs.existsSync(dest);
  fs.writeFileSync(dest, JSON.stringify(JSON.parse(text), null, 2) + '\n');
  fs.renameSync(path.join(INBOX, f), path.join(INBOX, `${f}.done`));
  console.log(`✓ inbox/${f} → src/data/teacher/${unit}/${part}.json${existed ? '（覆盖了旧文件）' : ''}`);
  for (const w of r.warnings) console.warn(`    ! ${w}`);
}
if (fail) process.exit(1);
