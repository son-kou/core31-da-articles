// npm run validate:core — CI-safe integrity check of the committed CORE data (no access to the original files needed):
// every unit JSON must rebuild the frozen Markdown byte for byte (SHA-256 = frozen.sha256, copied from CORE_FROZEN.sha256),
// IDs must be unique and consecutive, and parts.json must equal the deterministic plan.
import fs from 'node:fs';
import path from 'node:path';
import { renderCoreMarkdown, summarize } from '../src/lib/core-format';
import { CORE_JSON, FROZEN_CORE_DIR, UNITS } from './paths';
import { sha256 } from './hash';
import { computeRegistry, loadCommittedRegistry, loadUnit } from './registry';

const errors: string[] = [];
const frozen = new Map(
  fs.readFileSync(path.join(CORE_JSON, 'frozen.sha256'), 'utf8').trim().split('\n').map((l) => {
    const [h, f] = l.split(/\s+/);
    return [path.basename(f, '.md'), h] as const;
  }),
);
if (frozen.size !== 31) errors.push(`frozen.sha256 lists ${frozen.size} units, expected 31`);
let total = 0;
const allIds = new Set<string>();
for (const u of UNITS) {
  const file = path.join(CORE_JSON, `${u}.json`);
  if (!fs.existsSync(file)) {
    errors.push(`${u}: missing ${file}`);
    continue;
  }
  const unit = loadUnit(u);
  const md = renderCoreMarkdown(unit);
  if (sha256(md) !== frozen.get(u)) errors.push(`${u}: rebuilt text does not match the frozen SHA-256 — CORE data was altered`);
  unit.sentences.forEach((s, i) => {
    const want = `${u}-C${String(i + 1).padStart(3, '0')}`;
    if (s.id !== want) errors.push(`${u}: sentence ${i + 1} has ID ${s.id}, expected ${want}`);
    if (allIds.has(s.id)) errors.push(`${u}: duplicate ID ${s.id}`);
    allIds.add(s.id);
    if (!s.text.trim()) errors.push(`${s.id}: empty text`);
  });
  if (!unit.chapters.length) errors.push(`${u}: no chapters`);
  total += unit.sentences.length;
  // optional: compare with the original files when they are present (owner's machine)
  const orig = path.join(FROZEN_CORE_DIR, `${u}.md`);
  if (fs.existsSync(orig) && fs.readFileSync(orig, 'utf8') !== md) errors.push(`${u}: differs from the original ${orig}`);
}
const idx = JSON.parse(fs.readFileSync(path.join(CORE_JSON, 'index.json'), 'utf8'));
if (JSON.stringify(idx) !== JSON.stringify(UNITS.map((u) => summarize(loadUnit(u))))) errors.push('src/data/core/index.json is stale — run `npm run extract:core`');
const committed = JSON.stringify(loadCommittedRegistry());
if (committed !== JSON.stringify(computeRegistry())) errors.push('src/data/parts.json is stale — run `npm run prompts`');
if (errors.length) {
  for (const e of errors) console.error('✗ ' + e);
  process.exit(1);
}
const local = fs.existsSync(FROZEN_CORE_DIR) ? ' and identical to the original frozen files' : '';
console.log(`✓ CORE integrity: 31 units, ${total} sentences, SHA-256 match ${frozen.size}/31${local}; parts plan current.`);
