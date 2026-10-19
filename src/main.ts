import './styles/main.css';
import { UNITS } from './data';
import { icon } from './dom';
import { store, type Theme } from './store';
import { renderHome } from './views/home';
import { renderUnit } from './views/unit';

const THEMES: Theme[] = ['system', 'light', 'dark'];
const THEME_LABEL: Record<Theme, string> = { system: '跟随系统', light: '浅色', dark: '深色' };

function applyTheme() {
  const t = store.get().theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-btn')!;
  const label = document.createElement('span');
  label.className = 'theme-label';
  label.textContent = THEME_LABEL[t];
  btn.replaceChildren(icon(t === 'dark' ? 'moon' : t === 'light' ? 'sun' : 'auto'), label);
  btn.setAttribute('aria-label', `主题：${THEME_LABEL[t]}（点击切换）`);
  btn.title = `主题：${THEME_LABEL[t]}（点击切换）`;
}

document.getElementById('theme-btn')!.addEventListener('click', () => {
  const t = store.get().theme;
  store.set('theme', THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
  applyTheme();
});

let cleanup: (() => void) | null = null;

export function parseHash(hash: string) {
  const [unit = '', mode = '', sid = ''] = hash.replace(/^#\/?/, '').split('/');
  return { unit, mode, sid };
}

function route() {
  cleanup?.();
  cleanup = null;
  const app = document.getElementById('app')!;
  app.replaceChildren();
  const { unit, mode, sid } = parseHash(location.hash);
  if (UNITS.some((u) => u.unit === unit)) cleanup = renderUnit(app, unit, mode, sid);
  else {
    if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
    renderHome(app);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
applyTheme();
route();
