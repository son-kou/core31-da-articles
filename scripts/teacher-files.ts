// Discover and validate every teaching JSON under src/data/teacher/. Shared by validate:teacher, ingest and tests.
import fs from 'node:fs';
import path from 'node:path';
import { explainJsonError, validateTeacher, type Expectation } from '../src/lib/teacher-schema';
import type { PartsRegistry } from './registry';

export interface FileReport {
  file: string; // relative to the teacher dir, e.g. U00/P01.json
  unit?: string;
  part?: string;
  errors: string[];
  warnings: string[];
  ids: string[];
}

export function expectationFor(reg: PartsRegistry, unit: string, part: string): Expectation | undefined {
  const u = reg[unit];
  if (!u) return undefined;
  const p = part === 'ALL' ? u.all : u.parts.find((x) => x.part === part);
  return p && { unit, part, ids: p.ids, fingerprint: p.fingerprint };
}

export function checkTeacherText(text: string, unit: string, part: string, reg: PartsRegistry): Omit<FileReport, 'file'> {
  const r = { unit, part, errors: [] as string[], warnings: [] as string[], ids: [] as string[] };
  const exp = expectationFor(reg, unit, part);
  if (!exp) {
    const known = reg[unit] ? reg[unit].parts.map((p) => p.part).join(', ') + ', ALL' : '';
    r.errors.push(reg[unit] ? `${unit} 没有 ${part}（这个单元的分批是 ${known}）` : `未知单元 ${unit}`);
    return r;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    r.errors.push(explainJsonError(text, e));
    return r;
  }
  const v = validateTeacher(data, exp);
  r.errors.push(...v.errors);
  r.warnings.push(...v.warnings);
  if (!v.errors.length) r.ids = exp.ids;
  return r;
}

export function scanTeacherDir(dir: string, reg: PartsRegistry): FileReport[] {
  const out: FileReport[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (ent.name.startsWith('.') || ent.name.toLowerCase().endsWith('.md')) continue;
    if (!ent.isDirectory() || !/^U\d{2}$/.test(ent.name) || !reg[ent.name]) {
      out.push({ file: ent.name, errors: [`不认识的${ent.isDirectory() ? '文件夹' : '文件'}：教学文件应放在 src/data/teacher/U00 … U30/ 里`], warnings: [], ids: [] });
      continue;
    }
    const unitFiles: FileReport[] = [];
    for (const f of fs.readdirSync(path.join(dir, ent.name)).sort()) {
      if (f.startsWith('.') || f.toLowerCase().endsWith('.md')) continue;
      const rel = `${ent.name}/${f}`;
      const m = /^(P\d{2}|ALL)\.json$/.exec(f);
      if (!m) {
        const guess = /^p?(\d{1,2})\.json$/i.exec(f) ? `（应命名为 P${f.replace(/\D/g, '').padStart(2, '0')}.json）` : '';
        unitFiles.push({ file: rel, errors: [`文件名不对${guess}：只接受 P01.json、P02.json … 或 ALL.json`], warnings: [], ids: [] });
        continue;
      }
      const text = fs.readFileSync(path.join(dir, ent.name, f), 'utf8');
      unitFiles.push({ file: rel, ...checkTeacherText(text, ent.name, m[1], reg) });
    }
    const owner = new Map<string, string>();
    for (const r of unitFiles)
      for (const id of r.ids) {
        if (owner.has(id)) r.errors.push(`${id} 已由 ${owner.get(id)} 覆盖——同一单元不要同时保留 ALL.json 和 Pxx.json`);
        else owner.set(id, r.file);
      }
    out.push(...unitFiles);
  }
  return out;
}
