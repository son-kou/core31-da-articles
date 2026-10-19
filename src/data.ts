// Build-time discovery of all data. New teaching files (src/data/teacher/Uxx/Pyy.json) are picked up by the glob below —
// no imports, registries or routes to edit.
import type { CoreUnit, UnitSummary } from './lib/core-format';
import { validateTeacher, type TeacherFile, type TeacherSentence } from './lib/teacher-schema';
import coreIndex from './data/core/index.json';
import partsJson from './data/parts.json';

export interface PartEntry {
  part: string;
  ids: string[];
  fingerprint: string;
}
export const PARTS = partsJson as Record<string, { all: PartEntry; parts: PartEntry[] }>;
export const UNITS = coreIndex as UnitSummary[];

export interface SentenceAudio {
  clip: string;
  clip_s: number;
  full_start_s: number;
  full_end_s: number;
  text_sha256: string;
  method: string;
}
export interface UnitAudio {
  unit: string;
  full: { file: string; duration_s: number } | null;
  sentences: Record<string, SentenceAudio>;
}

const coreModules = import.meta.glob<CoreUnit>('./data/core/U*.json', { import: 'default' });
const audioModules = import.meta.glob<UnitAudio>('./data/audio/U*.json', { import: 'default' });
const audioIndexModule = import.meta.glob<Record<string, { duration_s: number | null; clips: number }>>('./data/audio/index.json', {
  import: 'default',
  eager: true,
});
const teacherModules = import.meta.glob<unknown>('./data/teacher/*/*.json', { import: 'default' });

export const AUDIO_INDEX = Object.values(audioIndexModule)[0] ?? {};

/** Which teaching files exist (known at build time, before loading any of them). */
export function teacherFilesFor(unit: string): { key: string; part: string }[] {
  return Object.keys(teacherModules)
    .map((key) => {
      const m = /\/teacher\/(U\d{2})\/(P\d{2}|ALL)\.json$/.exec(key);
      return m && m[1] === unit ? { key, part: m[2] } : null;
    })
    .filter((x): x is { key: string; part: string } => !!x);
}

/** Sentences covered by teaching files present for this unit (by file name; content is validated at build time). */
export function teachingCoverage(unit: string): number {
  const p = PARTS[unit];
  if (!p) return 0;
  const ids = new Set<string>();
  for (const f of teacherFilesFor(unit)) {
    const e = f.part === 'ALL' ? p.all : p.parts.find((x) => x.part === f.part);
    e?.ids.forEach((id) => ids.add(id));
  }
  return ids.size;
}

export async function loadCore(unit: string): Promise<CoreUnit | null> {
  const m = coreModules[`./data/core/${unit}.json`];
  return m ? m() : null;
}

export async function loadAudio(unit: string): Promise<UnitAudio | null> {
  const m = audioModules[`./data/audio/${unit}.json`];
  try {
    return m ? await m() : null;
  } catch {
    return null;
  }
}

export interface TeachingLoad {
  byId: Map<string, TeacherSentence>;
  problems: string[];
}

/** Load and re-check every part of a unit. A bad file is skipped (and reported), never rendered half-way. */
export async function loadTeaching(unit: string): Promise<TeachingLoad> {
  const byId = new Map<string, TeacherSentence>();
  const problems: string[] = [];
  const p = PARTS[unit];
  for (const f of teacherFilesFor(unit)) {
    const e = f.part === 'ALL' ? p?.all : p?.parts.find((x) => x.part === f.part);
    if (!e) {
      problems.push(`${unit}/${f.part}.json: unknown part`);
      continue;
    }
    let data: unknown;
    try {
      data = await teacherModules[f.key]();
    } catch {
      problems.push(`${unit}/${f.part}.json: cannot be parsed`);
      continue;
    }
    const v = validateTeacher(data, { unit, part: f.part, ids: e.ids, fingerprint: e.fingerprint });
    if (v.errors.length) {
      problems.push(`${unit}/${f.part}.json: ${v.errors[0]}`);
      continue;
    }
    for (const s of (data as TeacherFile).sentences) if (!byId.has(s.id)) byId.set(s.id, s);
  }
  return { byId, problems };
}

export function assetUrl(rel: string): string {
  return import.meta.env.BASE_URL + rel;
}
