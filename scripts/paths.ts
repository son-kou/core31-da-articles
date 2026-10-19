import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(SITE, 'src/data');
export const CORE_JSON = path.join(DATA, 'core');
export const TEACHER = path.join(DATA, 'teacher');
export const AUDIO_JSON = path.join(DATA, 'audio');
export const PROMPTS = path.join(SITE, 'prompts');
export const REPORTS = path.join(SITE, 'reports');
/** Read-only frozen source; only needed by `npm run extract:core` on the owner's machine (not in CI). */
export const FROZEN_CORE_DIR =
  process.env.CORE_DIR ?? path.resolve(SITE, '../V3_CORPUS_WRITING/DANISH_C1_CORPUS_V3/CORE');
export const UNITS = Array.from({ length: 31 }, (_, i) => `U${String(i).padStart(2, '0')}`);
