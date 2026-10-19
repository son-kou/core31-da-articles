import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPTS, UNITS } from '../scripts/paths';
import { buildPrompt } from '../scripts/prompt-text';
import { computeRegistry, fingerprint, loadCommittedRegistry, loadUnit } from '../scripts/registry';

const reg = computeRegistry();

describe('part plan', () => {
  it('committed parts.json equals the deterministic plan', () => {
    expect(loadCommittedRegistry()).toEqual(reg);
  });

  it.each(UNITS)('%s: every sentence in exactly one part, in order, 12–18 per part', (u) => {
    const ids = loadUnit(u).sentences.map((s) => s.id);
    const parts = reg[u].parts;
    expect(parts.flatMap((p) => p.ids)).toEqual(ids);
    parts.forEach((p, i) => {
      expect(p.part).toBe(`P${String(i + 1).padStart(2, '0')}`);
      expect(p.ids.length).toBeGreaterThanOrEqual(12);
      expect(p.ids.length).toBeLessThanOrEqual(18);
    });
    expect(reg[u].all.ids).toEqual(ids);
  });

  it('fingerprints are unique and change when the text changes', () => {
    const fps = Object.values(reg).flatMap((u) => [u.all, ...u.parts].map((p) => p.fingerprint));
    expect(new Set(fps).size).toBe(fps.length);
    const u = loadUnit('U00');
    const p = reg.U00.parts[0];
    const altered = { ...u, sentences: u.sentences.map((s, i) => (i === 0 ? { ...s, text: s.text + ' ' } : s)) };
    expect(fingerprint(altered, p.part, p.ids)).not.toBe(p.fingerprint);
  });
});

describe('prompt files', () => {
  it('31 unit prompts and one prompt per part exist and are current', () => {
    let n = 0;
    for (const u of UNITS) {
      const unit = loadUnit(u);
      const { all, parts } = reg[u];
      expect(fs.readFileSync(path.join(PROMPTS, `${u}_PROMPT.txt`), 'utf8')).toBe(buildPrompt(unit, 'ALL', all.ids, all.fingerprint, parts.length));
      for (const p of parts) {
        expect(fs.readFileSync(path.join(PROMPTS, 'parts', `${u}_${p.part}_PROMPT.txt`), 'utf8')).toBe(buildPrompt(unit, p.part, p.ids, p.fingerprint, parts.length));
        n++;
      }
    }
    expect(fs.readdirSync(path.join(PROMPTS, 'parts')).filter((f) => f.endsWith('_PROMPT.txt'))).toHaveLength(n);
  });

  it('a part prompt carries the exact frozen sentences, IDs, fingerprint and full context', () => {
    const u = loadUnit('U08');
    const p = reg.U08.parts[0];
    const txt = buildPrompt(u, p.part, p.ids, p.fingerprint, reg.U08.parts.length);
    expect(txt).toContain(`"source_fingerprint": "${p.fingerprint}"`);
    for (const s of u.sentences) expect(txt).toContain(`${s.id} `);
    for (const id of p.ids) expect(txt).toContain(`▶ ${id} `);
    for (const id of p.ids) expect(txt).toContain(u.sentences.find((s) => s.id === id)!.text);
    expect(txt).toContain('一字不改');
  });
});
