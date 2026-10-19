// Split a unit into GPT batches ("parts") of about 12–18 sentences, preferring chapter and paragraph boundaries and never
// splitting a dialogue exchange when avoidable. Deterministic: the same CORE always yields the same plan.
import type { CoreUnit } from './core-format';

export interface PartPlan {
  part: string; // P01, P02 …
  ids: string[];
}

const MIN = 6;
const MAX = 22;

function partCost(m: number): number {
  if (m < MIN || m > MAX) return Infinity;
  const soft = m < 12 ? (12 - m) * 6 : m > 18 ? (m - 18) * 8 : 0;
  return 4 + 0.3 * (m - 15) ** 2 + soft;
}

export function planParts(u: CoreUnit): PartPlan[] {
  const s = u.sentences;
  const n = s.length;
  const cut = (i: number): number => {
    // cost of a cut before sentence i
    const a = s[i - 1];
    const b = s[i];
    if (a.ch !== b.ch) return 0;
    if (a.p !== b.p) return a.speaker !== undefined && b.speaker !== undefined ? 6 : 1;
    if (a.speaker !== undefined && b.speaker !== undefined) return 14;
    return 8;
  };
  if (n <= 18) return [{ part: 'P01', ids: s.map((x) => x.id) }];
  const best = new Array<number>(n + 1).fill(Infinity);
  const prev = new Array<number>(n + 1).fill(-1);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - MAX); i <= j - MIN; i++) {
      if (best[i] === Infinity) continue;
      const c = best[i] + partCost(j - i) + (j < n ? cut(j) : 0);
      if (c < best[j]) {
        best[j] = c;
        prev[j] = i;
      }
    }
  }
  const bounds: number[] = [];
  for (let j = n; j > 0; j = prev[j]) bounds.unshift(j);
  let start = 0;
  return bounds.map((end, k) => {
    const ids = s.slice(start, end).map((x) => x.id);
    start = end;
    return { part: `P${String(k + 1).padStart(2, '0')}`, ids };
  });
}
