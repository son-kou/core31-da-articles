import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIO_JSON, SITE, UNITS } from '../scripts/paths';
import { sha256 } from '../scripts/hash';
import { loadUnit } from '../scripts/registry';

describe('audio manifests', () => {
  it.each(UNITS)('%s: full recording present; every clip maps to its exact frozen sentence, in order', (u) => {
    const m = JSON.parse(fs.readFileSync(path.join(AUDIO_JSON, `${u}.json`), 'utf8'));
    expect(m.full?.file).toBe(`audio/full/${u}.mp3`);
    expect(fs.existsSync(path.join(SITE, 'public', m.full.file))).toBe(true);
    const unit = loadUnit(u);
    let prev = -1;
    for (const s of unit.sentences) {
      const a = m.sentences[s.id];
      if (!a) continue;
      expect(a.text_sha256).toBe(sha256(s.text));
      expect(a.clip).toBe(`audio/sentences/${u}/${s.id}.mp3`);
      expect(a.full_start_s).toBeGreaterThanOrEqual(prev - 0.17); // shared-pause padding only
      expect(a.full_end_s).toBeGreaterThan(a.full_start_s);
      prev = a.full_end_s;
    }
    for (const id of Object.keys(m.sentences)) expect(unit.sentences.some((s) => s.id === id)).toBe(true);
  });

  it('no clip file exists without a manifest entry (nothing unverified is published)', () => {
    for (const u of UNITS) {
      const m = JSON.parse(fs.readFileSync(path.join(AUDIO_JSON, `${u}.json`), 'utf8'));
      const dir = path.join(SITE, 'public/audio/sentences', u);
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')) : [];
      expect(files.sort()).toEqual(Object.keys(m.sentences).map((id) => `${id}.mp3`).sort());
    }
  });
});
