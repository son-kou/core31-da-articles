// npm run validate:audio — every sentence-audio mapping must point at the exact frozen sentence and at a real, unchanged file.
// Checks: known unit/ID, text SHA-256 = frozen CORE text, clip file present with the recorded SHA-256, clip length = verified
// interval, intervals inside the full recording and in CORE order without overlap. Missing clips are allowed (reported).
import fs from 'node:fs';
import path from 'node:path';
import { AUDIO_JSON, SITE, UNITS } from './paths';
import { sha256 } from './hash';
import { loadUnit } from './registry';

interface SA {
  clip: string;
  clip_s: number;
  clip_sha256: string;
  full_start_s: number;
  full_end_s: number;
  text_sha256: string;
}
const PAD = 0.17;
const errors: string[] = [];
let clips = 0;
let total = 0;
let fullOk = 0;
for (const u of UNITS) {
  const unit = loadUnit(u);
  total += unit.sentences.length;
  const p = path.join(AUDIO_JSON, `${u}.json`);
  if (!fs.existsSync(p)) {
    errors.push(`${u}: no audio manifest`);
    continue;
  }
  const m = JSON.parse(fs.readFileSync(p, 'utf8')) as { unit: string; full: { file: string; duration_s: number; sha256: string } | null; sentences: Record<string, SA> };
  if (m.unit !== u) errors.push(`${u}: manifest says unit ${m.unit}`);
  const dur = m.full?.duration_s ?? 0;
  if (m.full) {
    const f = path.join(SITE, 'public', m.full.file);
    if (!fs.existsSync(f)) errors.push(`${u}: full audio ${m.full.file} missing`);
    else if (sha256(fs.readFileSync(f)) !== m.full.sha256) errors.push(`${u}: full audio ${m.full.file} changed`);
    else fullOk++;
  }
  let prevEnd = -1;
  const order = unit.sentences.map((s) => s.id);
  const known = new Map(unit.sentences.map((s) => [s.id, s]));
  for (const id of Object.keys(m.sentences)) if (!known.has(id)) errors.push(`${u}: audio for unknown sentence ${id}`);
  for (const id of order) {
    const a = m.sentences[id];
    if (!a) continue;
    const s = known.get(id)!;
    if (a.text_sha256 !== sha256(s.text)) errors.push(`${id}: audio was cut for a different text`);
    if (a.clip !== `audio/sentences/${u}/${id}.mp3`) errors.push(`${id}: unexpected clip path ${a.clip}`);
    const f = path.join(SITE, 'public', a.clip);
    if (!fs.existsSync(f)) errors.push(`${id}: clip file missing`);
    else if (sha256(fs.readFileSync(f)) !== a.clip_sha256) errors.push(`${id}: clip file changed since verification`);
    if (!(a.full_end_s > a.full_start_s)) errors.push(`${id}: empty interval`);
    if (dur && a.full_end_s > dur + 0.05) errors.push(`${id}: interval beyond the full recording`);
    // clips keep 0.05 s lead / 0.12 s tail of silence; two clips may share a short pause, never speech
    if (a.full_start_s < prevEnd - PAD) errors.push(`${id}: interval overlaps the previous sentence`);
    if (Math.abs(a.full_end_s - a.full_start_s - a.clip_s) > 0.1) errors.push(`${id}: clip length ≠ verified interval`);
    prevEnd = a.full_end_s;
    clips++;
  }
}
if (errors.length) {
  for (const e of errors.slice(0, 50)) console.error('✗ ' + e);
  if (errors.length > 50) console.error(`… and ${errors.length - 50} more`);
  process.exit(1);
}
console.log(`✓ audio: full recordings ${fullOk}/31; verified sentence clips ${clips}/${total} (${((clips / total) * 100).toFixed(1)}%); all mapped to the exact frozen text.`);
