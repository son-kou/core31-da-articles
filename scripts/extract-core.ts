// Frozen CORE (read-only) → src/data/core/Uxx.json + frozen.sha256 + index.json.
// Every unit must round-trip: renderCoreMarkdown(json) === original bytes, and its SHA-256 must equal CORE_FROZEN.sha256.
import fs from 'node:fs';
import path from 'node:path';
import { parseCoreMarkdown, renderCoreMarkdown, summarize, type UnitSummary } from '../src/lib/core-format';
import { CORE_JSON, FROZEN_CORE_DIR, UNITS } from './paths';
import { sha256 } from './hash';

const frozenFile = path.join(FROZEN_CORE_DIR, '..', 'CORE_FROZEN.sha256');
const frozen = new Map(
  fs.readFileSync(frozenFile, 'utf8').trim().split('\n').map((l) => {
    const [h, f] = l.split(/\s+/);
    return [path.basename(f, '.md'), h] as const;
  }),
);
fs.mkdirSync(CORE_JSON, { recursive: true });
let total = 0;
const manifest: string[] = [];
const index: UnitSummary[] = [];
for (const u of UNITS) {
  const buf = fs.readFileSync(path.join(FROZEN_CORE_DIR, `${u}.md`));
  const md = buf.toString('utf8');
  const h = sha256(buf);
  if (frozen.get(u) !== h) throw new Error(`${u}: source SHA-256 ${h} differs from CORE_FROZEN.sha256 — frozen CORE changed?`);
  const unit = parseCoreMarkdown(md, u);
  if (renderCoreMarkdown(unit) !== md) throw new Error(`${u}: round trip failed (parser would lose or alter text)`);
  fs.writeFileSync(path.join(CORE_JSON, `${u}.json`), JSON.stringify(unit, null, 1) + '\n');
  manifest.push(`${h}  CORE/${u}.md`);
  index.push(summarize(unit));
  total += unit.sentences.length;
  console.log(`${u}  ${String(unit.sentences.length).padStart(3)} sentences  ${unit.chapters.length} chapters  round-trip OK  sha ${h.slice(0, 12)}`);
}
fs.writeFileSync(path.join(CORE_JSON, 'frozen.sha256'), manifest.join('\n') + '\n');
fs.writeFileSync(path.join(CORE_JSON, 'index.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`\n31 units, ${total} sentences extracted; all byte-identical to the frozen source.`);
