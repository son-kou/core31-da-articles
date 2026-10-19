// Loads the committed CORE JSON and derives the part plan + fingerprints (single source for scripts and tests).
import fs from 'node:fs';
import path from 'node:path';
import type { CoreUnit } from '../src/lib/core-format';
import { planParts } from '../src/lib/parts';
import { CORE_JSON, DATA, UNITS } from './paths';
import { sha256 } from './hash';

export interface PartEntry {
  part: string;
  ids: string[];
  fingerprint: string;
}
export type PartsRegistry = Record<string, { all: PartEntry; parts: PartEntry[] }>;

export function loadUnit(u: string): CoreUnit {
  return JSON.parse(fs.readFileSync(path.join(CORE_JSON, `${u}.json`), 'utf8'));
}

/** Fingerprint = hash of unit, part and the exact frozen text of every sentence in it. GPT copies it; it never computes it. */
export function fingerprint(u: CoreUnit, part: string, ids: string[]): string {
  const idx = new Map(u.sentences.map((s) => [s.id, s]));
  const body = JSON.stringify([u.unit, part, ids.map((id) => [id, idx.get(id)!.speaker ?? '', idx.get(id)!.text])]);
  return `${u.unit}-${part}-${sha256(body).slice(0, 12)}`;
}

export function computeRegistry(): PartsRegistry {
  const reg: PartsRegistry = {};
  for (const u of UNITS) {
    const unit = loadUnit(u);
    const allIds = unit.sentences.map((s) => s.id);
    reg[u] = {
      all: { part: 'ALL', ids: allIds, fingerprint: fingerprint(unit, 'ALL', allIds) },
      parts: planParts(unit).map((p) => ({ ...p, fingerprint: fingerprint(unit, p.part, p.ids) })),
    };
  }
  return reg;
}

export const PARTS_JSON = path.join(DATA, 'parts.json');
export function loadCommittedRegistry(): PartsRegistry {
  return JSON.parse(fs.readFileSync(PARTS_JSON, 'utf8'));
}
