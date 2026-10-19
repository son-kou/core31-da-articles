import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE = path.join(SITE, 'src/data/teacher/U30/P01.json');
export const FIXTURE_MARK = path.join(SITE, 'dist-e2e/.fixture-ids.json');

/** A structurally complete teaching file for U30/P01 (test-only; removed again right after the build). */
export function fixtureJson() {
  const reg = JSON.parse(fs.readFileSync(path.join(SITE, 'src/data/parts.json'), 'utf8'));
  const p = reg.U30.parts[0];
  return {
    schema_version: 1,
    unit: 'U30',
    part: 'P01',
    source_fingerprint: p.fingerprint,
    sentences: p.ids.map((id: string, i: number) => ({
      id,
      zh: `E2E 测试译文 ${i + 1}。`,
      grammar: i === 0 ? 'E2E 语法说明，含 `ved vi` 片段。' : '',
      vocabulary: i === 0 ? [{ da: 'E2E ord', zh: 'E2E 词', note: 'E2E 注' }] : [],
      nuance: i === 0 ? 'E2E 语感。' : '',
      transfer: i === 0 ? ['E2E mønster X'] : [],
      pitfall: i === 0 ? 'E2E 易错点。' : '',
    })),
  };
}
