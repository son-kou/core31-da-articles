import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { explainJsonError, unwrapGptAnswer, validateTeacher, type Expectation } from '../src/lib/teacher-schema';
import { computeRegistry } from '../scripts/registry';
import { scanTeacherDir } from '../scripts/teacher-files';

const reg = computeRegistry();
const P = reg.U00.parts[0];
const exp: Expectation = { unit: 'U00', part: P.part, ids: P.ids, fingerprint: P.fingerprint };

function good() {
  return {
    schema_version: 1,
    unit: 'U00',
    part: P.part,
    source_fingerprint: P.fingerprint,
    sentences: P.ids.map((id) => ({
      id,
      zh: `第 ${id.slice(-3)} 句的中文意思。`,
      grammar: '主句动词 `holder` 处在第二位：V2 语序。',
      vocabulary: [{ da: 'holde ind til siden', zh: '靠边停车' }],
      nuance: '',
      transfer: ['En [tid] på [sted] + V2 …'],
      pitfall: null,
    })),
  };
}
const errs = (d: unknown) => validateTeacher(d, exp).errors;

describe('teaching JSON validation', () => {
  it('accepts a complete, well-formed part (empty fields allowed)', () => {
    expect(errs(good())).toEqual([]);
  });
  it('rejects unknown, duplicate and missing IDs (with a truncation hint)', () => {
    const d = good();
    d.sentences[1].id = 'U01-C001';
    expect(errs(d).join()).toMatch(/未知 ID/);
    const dup = good();
    dup.sentences[2].id = dup.sentences[1].id;
    expect(errs(dup).join()).toMatch(/ID 重复/);
    const trunc = good();
    trunc.sentences = trunc.sentences.slice(0, 5);
    expect(errs(trunc).join()).toMatch(/截断/);
  });
  it('rejects a wrong fingerprint, unit, part or schema version', () => {
    expect(errs({ ...good(), source_fingerprint: 'U00-P01-000000000000' }).join()).toMatch(/source_fingerprint/);
    expect(errs({ ...good(), unit: 'U01' }).join()).toMatch(/unit 应为/);
    expect(errs({ ...good(), part: 'P02' }).join()).toMatch(/part 应为/);
    expect(errs({ ...good(), schema_version: 2 }).join()).toMatch(/schema_version/);
  });
  it('rejects Danish replacement text and unknown fields', () => {
    const d = good() as any;
    d.sentences[0].da = 'En sommerdag …';
    expect(errs(d).join()).toMatch(/不得包含丹麦语原句/);
  });
  it('rejects HTML / script injection in any field', () => {
    for (const bad of ['<img src=x onerror=alert(1)>', 'javascript:alert(1)', '<script>x</script>', 'a onclick=x', '&lt;b&gt;', '${x}']) {
      const d = good() as any;
      d.sentences[0].vocabulary[0].zh = bad;
      expect(errs(d).length, bad).toBeGreaterThan(0);
    }
  });
  it('rejects placeholders presented as content', () => {
    for (const bad of ['TODO', '无', '略', '待补充', '...', 'lorem ipsum dolor']) {
      const d = good() as any;
      d.sentences[0].pitfall = bad;
      expect(errs(d).join(), bad).toMatch(/占位/);
    }
    const d = good() as any;
    d.sentences[0].zh = '';
    expect(errs(d).join()).toMatch(/zh/);
  });
  it('rejects wrong field types', () => {
    const d = good() as any;
    d.sentences[0].transfer = 'not an array';
    d.sentences[1].vocabulary = [{ da: 'x' }];
    const e = errs(d).join();
    expect(e).toMatch(/transfer/);
    expect(e).toMatch(/vocabulary\[0\]\.zh/);
  });
  it('explains syntax errors from chat answers', () => {
    const fenced = '```json\n{"a": 1}\n```';
    let err: unknown;
    try {
      JSON.parse(fenced);
    } catch (e) {
      err = e;
    }
    expect(explainJsonError(fenced, err)).toMatch(/```/);
    const cut = '{"sentences": [{"id": "U00-C001", "zh": "一个';
    try {
      JSON.parse(cut);
    } catch (e) {
      err = e;
    }
    expect(explainJsonError(cut, err)).toMatch(/截断/);
  });
  it('ingest unwraps fences and chatter but nothing else', () => {
    const inner = JSON.stringify(good());
    expect(unwrapGptAnswer('好的，下面是 JSON：\n```json\n' + inner + '\n```\n希望有帮助')).toBe(inner);
    expect(unwrapGptAnswer(inner)).toBe(inner);
  });
});

describe('drop-in discovery (filesystem)', () => {
  function tmpTree(files: Record<string, string>) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-'));
    for (const [f, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), c);
    }
    return dir;
  }
  it('picks up new part files without any registration and validates each fully', () => {
    const p2 = reg.U00.parts[1];
    const g2 = { ...good(), part: p2.part, source_fingerprint: p2.fingerprint, sentences: p2.ids.map((id) => ({ id, zh: '中文。' })) };
    const dir = tmpTree({ 'U00/P01.json': JSON.stringify(good()), 'U00/P02.json': JSON.stringify(g2), 'U00/p3.json': '{}', 'U05/P01.json': '```json\n{}' });
    const r = scanTeacherDir(dir, reg);
    const by = Object.fromEntries(r.map((x) => [x.file, x]));
    expect(by['U00/P01.json'].errors).toEqual([]);
    expect(by['U00/P02.json'].errors).toEqual([]);
    expect(by['U00/p3.json'].errors.join()).toMatch(/P03\.json/);
    expect(by['U05/P01.json'].errors.join()).toMatch(/JSON 语法错误/);
  });
  it('flags ALL.json and Pxx.json covering the same sentences', () => {
    const all = reg.U00.all;
    const gAll = { ...good(), part: 'ALL', source_fingerprint: all.fingerprint, sentences: all.ids.map((id) => ({ id, zh: '中文。' })) };
    const r = scanTeacherDir(tmpTree({ 'U00/ALL.json': JSON.stringify(gAll), 'U00/P01.json': JSON.stringify(good()) }), reg);
    expect(r.some((x) => x.errors.join().includes('同时保留'))).toBe(true);
  });
  it('an empty or missing teacher folder is fine', () => {
    expect(scanTeacherDir(path.join(os.tmpdir(), 'does-not-exist-xyz'), reg)).toEqual([]);
  });
});
