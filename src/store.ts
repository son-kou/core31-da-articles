// Browser-local progress (localStorage). Versioned; unknown/old data is migrated, never silently wiped. Not synced between devices.
export type Mode = 'read' | 'listen' | 'shadow' | 'recall';
export type Mark = 'familiar' | 'practicing' | 'mastered';
export type Theme = 'system' | 'light' | 'dark';

interface UnitProgress {
  last?: string; // last sentence ID touched
  marks: Record<string, Mark>;
  visited?: number;
}
interface State {
  v: 1;
  theme: Theme;
  mode: Mode;
  speed: number;
  showZh: boolean;
  hideTranscript: boolean;
  follow: boolean;
  autoNext: boolean;
  shadowGap: number; // seconds of silence × clip length after each sentence in auto-advance
  lastUnit?: string;
  units: Record<string, UnitProgress>;
}

const KEY = 'dcdt:v1';
const DEFAULTS: State = {
  v: 1, theme: 'system', mode: 'read', speed: 1, showZh: true, hideTranscript: true, follow: true, autoNext: false, shadowGap: 1, units: {},
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const d = JSON.parse(raw);
    if (d && d.v === 1) return { ...structuredClone(DEFAULTS), ...d, units: d.units ?? {} };
  } catch {
    /* private mode or corrupt value: fall back to defaults without touching the stored value */
  }
  return structuredClone(DEFAULTS);
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — progress just isn't kept */
  }
}

export const store = {
  get: () => state,
  set<K extends keyof State>(k: K, v: State[K]) {
    state[k] = v;
    save();
  },
  unit(u: string): UnitProgress {
    return state.units[u] ?? { marks: {} };
  },
  touch(u: string, id?: string) {
    const p = (state.units[u] ??= { marks: {} });
    if (id) p.last = id;
    p.visited = Date.now();
    state.lastUnit = u;
    save();
  },
  mark(u: string, id: string, m: Mark | null) {
    const p = (state.units[u] ??= { marks: {} });
    if (m) p.marks[id] = m;
    else delete p.marks[id];
    save();
  },
  resetUnit(u: string) {
    delete state.units[u];
    if (state.lastUnit === u) delete state.lastUnit;
    save();
  },
  resetAll() {
    state = { ...structuredClone(DEFAULTS), theme: state.theme };
    save();
  },
};
