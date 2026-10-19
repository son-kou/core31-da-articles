import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCoreMarkdown, renderCoreMarkdown, summarize } from '../src/lib/core-format';
import { CORE_JSON, FROZEN_CORE_DIR, UNITS } from '../scripts/paths';
import { sha256 } from '../scripts/hash';
import { loadUnit } from '../scripts/registry';

const frozen = new Map(
  fs.readFileSync(path.join(CORE_JSON, 'frozen.sha256'), 'utf8').trim().split('\n').map((l) => {
    const [h, f] = l.split(/\s+/);
    return [path.basename(f, '.md'), h] as const;
  }),
);

describe('frozen CORE data', () => {
  it('has all 31 units and 1,725 sentences', () => {
    expect(UNITS).toHaveLength(31);
    expect(UNITS.reduce((n, u) => n + loadUnit(u).sentences.length, 0)).toBe(1725);
  });

  it.each(UNITS)('%s rebuilds the frozen file byte for byte (text, order, chapters, speakers, quotes)', (u) => {
    const unit = loadUnit(u);
    const md = renderCoreMarkdown(unit);
    expect(sha256(md)).toBe(frozen.get(u));
    expect(unit.chapters.length).toBe(md.split('\n').filter((l) => l.startsWith('## ')).length);
    if (fs.existsSync(FROZEN_CORE_DIR)) expect(md).toBe(fs.readFileSync(path.join(FROZEN_CORE_DIR, `${u}.md`), 'utf8'));
  });

  it('IDs are unique, consecutive and in original order', () => {
    const seen = new Set<string>();
    for (const u of UNITS)
      loadUnit(u).sentences.forEach((s, i) => {
        expect(s.id).toBe(`${u}-C${String(i + 1).padStart(3, '0')}`);
        expect(seen.has(s.id)).toBe(false);
        seen.add(s.id);
      });
  });

  it('keeps dialogue speakers (incl. multi-word) and embedded documents', () => {
    const all = UNITS.flatMap((u) => loadUnit(u).sentences);
    expect(all.filter((s) => s.speaker !== undefined).length).toBeGreaterThan(500);
    expect(all.some((s) => s.speaker?.includes(' '))).toBe(true);
    expect(all.filter((s) => s.doc).length).toBe(30);
    expect(loadUnit('U00').sentences[38]).toMatchObject({ id: 'U00-C039', speaker: 'Sara', text: 'Undskyld, har du lige to minutter?' });
  });

  it('index.json summaries match the unit data', () => {
    const idx = JSON.parse(fs.readFileSync(path.join(CORE_JSON, 'index.json'), 'utf8'));
    expect(idx).toEqual(UNITS.map((u) => summarize(loadUnit(u))));
  });
});

describe('parser', () => {
  const md = ['---', 'unit: U99', 'title: T', 'subtitle: S', 'labels: a · b', 'status: X', '---', '## Kap 1', '', 'U99-C001 Tekst én.', 'U99-C002 To.', '', '> U99-C003 Emne: brev', '> U99-C004 Hej', '', 'U99-C005 @Den unge mand: Hej, hej!', 'U99-C006 @Sara: Klart.', '', '## Kap 2', '', 'U99-C007 Slut.', ''].join('\n');

  it('round-trips quotes, multi-word speakers and paragraphs', () => {
    const u = parseCoreMarkdown(md, 'U99');
    expect(renderCoreMarkdown(u)).toBe(md);
    expect(u.sentences[2]).toMatchObject({ doc: true, text: 'Emne: brev' });
    expect(u.sentences[4]).toMatchObject({ speaker: 'Den unge mand', text: 'Hej, hej!' });
    expect(new Set(u.sentences.map((s) => s.p)).size).toBe(4);
  });

  it('never drops an unrecognised line silently', () => {
    expect(() => parseCoreMarkdown(md.replace('U99-C002 To.', 'Løs tekst uden ID'), 'U99')).toThrow(/unparsed line/);
  });
});
