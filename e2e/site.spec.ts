import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fixtureJson, SITE } from './fixture';

const index = JSON.parse(fs.readFileSync(path.join(SITE, 'src/data/core/index.json'), 'utf8')) as { unit: string; title: string; sentences: number; chapters: string[] }[];
const audioU00 = JSON.parse(fs.readFileSync(path.join(SITE, 'src/data/audio/U00.json'), 'utf8'));
const u00 = JSON.parse(fs.readFileSync(path.join(SITE, 'src/data/core/U00.json'), 'utf8'));

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function noHorizontalOverflow(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, 'horizontal overflow').toBeLessThanOrEqual(cw);
}

test('home lists all 31 units; search and order toggle work', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./');
  await expect(page.locator('.ucard')).toHaveCount(31);
  await expect(page.locator('.shelf')).toHaveCount(5);
  await page.getByRole('searchbox').fill('pelikan tillid');
  await expect(page.locator('.ucard')).toHaveCount(0);
  await page.getByRole('searchbox').fill('tillid');
  await expect(page.locator('.ucard[data-unit="U00"]')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: '按 U00–U30 顺序' }).click();
  const units = await page.locator('.ucard').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.unit));
  expect(units).toEqual(index.map((u) => u.unit));
  await noHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('all 31 article links open with every frozen sentence', async ({ page }) => {
  const errors = watchErrors(page);
  for (const u of index) {
    await page.goto(`./#/${u.unit}/read`);
    await expect(page.locator('h1')).toHaveText(u.title);
    await expect(page.locator('.card')).toHaveCount(u.sentences);
    await expect(page.locator('h2.ch-title')).toHaveCount(u.chapters.length);
  }
  expect(errors).toEqual([]);
});

test('Danish text on the page is exactly the frozen CORE text', async ({ page }) => {
  await page.goto('./#/U00/read');
  const shown = await page.locator('.card').evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.sid, e.querySelector('.da-sent')!.textContent]));
  expect(shown).toEqual(u00.sentences.map((s: { id: string; text: string }) => [s.id, s.text]));
});

test('direct open and refresh of a deep link keep the route', async ({ page }) => {
  await page.goto('./#/U05/shadow');
  await expect(page.locator('.mode[aria-selected="true"]')).toContainText('跟读');
  await page.reload();
  await expect(page.locator('.mode[aria-selected="true"]')).toContainText('跟读');
  await expect(page.locator('.sh-text')).toBeVisible();
});

test('chapter navigation jumps to the chapter', async ({ page }) => {
  await page.goto('./#/U00/read');
  const last = u00.chapters.length - 1;
  const toc = page.locator(`.toc-link[data-ch="${last}"]`);
  if (!(await toc.isVisible())) await page.locator('.toc-m summary').click();
  await toc.click();
  await expect(page.locator('h2.ch-title').nth(last)).toBeInViewport();
});

test('teaching JSON dropped in renders; sections reveal and collapse; missing parts show 讲解制作中', async ({ page }) => {
  const errors = watchErrors(page);
  const fx = fixtureJson();
  await page.goto('./#/U30/read');
  const first = page.locator(`.card[data-sid="${fx.sentences[0].id}"]`);
  await expect(first.locator('.t-zh')).toContainText('E2E 测试译文 1');
  await expect(first.locator('.t-details')).toHaveCount(0);
  await first.locator('details.teach summary').click();
  await expect(first.locator('.t-details')).toContainText('E2E 语法说明');
  await expect(first.locator('.t-details p .da')).toHaveText('ved vi');
  await expect(first.locator('.t-pitfall')).toContainText('E2E 易错点');
  await first.locator('details.teach summary').click();
  await expect(first.locator('.t-details')).toBeHidden();
  // a sentence outside the fixture part has no teaching yet
  const later = index.find((u) => u.unit === 'U30')!.sentences;
  await expect(page.locator(`.card[data-sid="U30-C${String(later).padStart(3, '0')}"] .pending`)).toHaveText('讲解制作中');
  // Chinese can be hidden for recall, and is remembered
  await page.getByRole('button', { name: '隐藏中文' }).click();
  await expect(first.locator('.t-zh')).toBeHidden();
  await page.reload();
  await expect(first.locator('.t-zh')).toBeHidden();
  await page.getByRole('button', { name: '显示中文' }).first().click();
  // home shows partial coverage for U30, none for U00
  await page.goto('./');
  await expect(page.locator('.ucard[data-unit="U30"] .pill')).toHaveText(`讲解 ${fx.sentences.length}/${later}`);
  await expect(page.locator('.ucard[data-unit="U00"] .pill')).toHaveText('讲解制作中');
  expect(errors).toEqual([]);
});

test('four learning modes work on the same text', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./#/U00/read');
  await page.getByRole('tab', { name: /听力/ }).click();
  await expect(page.locator('.listen .masked').first()).toBeVisible();
  await page.getByRole('button', { name: '显示原文' }).click();
  await expect(page.locator('.listen .fs')).toHaveCount(u00.sentences.length);
  await page.getByRole('tab', { name: /跟读/ }).click();
  await expect(page.locator('.sh-text')).toHaveCount(1);
  const t1 = await page.locator('.sh-text').textContent();
  await page.getByRole('button', { name: '下一句' }).click();
  await expect(page.locator('.sh-text')).not.toHaveText(t1!);
  await page.getByRole('tab', { name: /背诵/ }).click();
  await expect(page.locator('.rc')).toHaveCount(u00.sentences.length);
  const rc = page.locator('.rc').first();
  await expect(rc.locator('.rc-text')).toBeHidden();
  await rc.getByRole('button', { name: '显示原文' }).click();
  await expect(rc.locator('.rc-text')).toBeVisible();
  await rc.getByRole('button', { name: '已掌握' }).click();
  await page.reload();
  await expect(page.locator('.rc').first().getByRole('button', { name: '已掌握' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.chip', { hasText: '已掌握 1' }).click();
  await expect(page.locator('.rc')).toHaveCount(1);
  await page.goto('./');
  await expect(page.locator('.ucard[data-unit="U00"] .ucard-prog')).toContainText('已掌握 1');
  expect(errors).toEqual([]);
});

test('sentence audio: correct clip, speed, loop, no overlap with the full player', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./#/U00/read');
  const clip = page.locator('audio[data-role="clip"]');
  const full = page.locator('audio[data-role="full"]');
  // full article first
  await page.locator('.pl-play').click();
  await expect.poll(() => full.evaluate((a: HTMLAudioElement) => !a.paused && a.currentTime > 0.3)).toBe(true);
  // a verified sentence clip: starting it pauses the full recording
  const id = 'U00-C003';
  await page.locator(`button[data-play="${id}"]`).click();
  await expect.poll(() => clip.evaluate((a: HTMLAudioElement) => a.src)).toContain(`audio/sentences/U00/${id}.mp3`);
  await expect.poll(() => full.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await expect.poll(() => clip.evaluate((a: HTMLAudioElement) => !a.paused)).toBe(true);
  await expect(page.locator(`.card[data-sid="${id}"]`)).toHaveClass(/is-playing/);
  // speed applies to both players
  await page.locator('.pl-speed').selectOption('1.4');
  expect(await clip.evaluate((a: HTMLAudioElement) => a.playbackRate)).toBe(1.4);
  expect(await full.evaluate((a: HTMLAudioElement) => a.playbackRate)).toBe(1.4);
  // pause
  await page.locator(`button[data-play="${id}"]`).click();
  await expect.poll(() => clip.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  // loop: the shortest verified clip restarts by itself after it ends
  const shortest = Object.entries(audioU00.sentences as Record<string, { clip_s: number }>).sort((a, b) => a[1].clip_s - b[1].clip_s)[0][0];
  await page.locator(`button[data-loop="${shortest}"]`).click();
  await clip.evaluate((a: HTMLAudioElement) => {
    (window as unknown as { plays: number }).plays = 0;
    a.addEventListener('play', () => (window as unknown as { plays: number }).plays++);
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { plays: number }).plays), { timeout: 15000 }).toBeGreaterThanOrEqual(1);
  await page.locator(`button[data-loop="${shortest}"]`).click();
  expect(errors).toEqual([]);
});

test('sentences without verified audio have no playable button', async ({ page }) => {
  const missing = u00.sentences.map((s: { id: string }) => s.id).filter((id: string) => !audioU00.sentences[id]);
  test.skip(!missing.length, 'U00 has full sentence coverage');
  await page.goto('./#/U00/read');
  for (const id of missing) await expect(page.locator(`button[data-play="${id}"]`)).toBeDisabled();
});

test('listening mode highlights only verified sentences during full playback', async ({ page }) => {
  await page.goto('./#/U00/listen');
  await page.getByRole('button', { name: '显示原文' }).click();
  await page.getByRole('button', { name: '从头播放全文' }).click();
  const first = Object.keys(audioU00.sentences)[0];
  await expect(page.locator(`.fs.is-speaking[data-sid="${first}"]`)).toBeVisible({ timeout: 10000 });
  const speaking = await page.locator('.is-speaking').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sid));
  for (const id of speaking) expect(audioU00.sentences[id!]).toBeTruthy();
});

test('themes switch and persist; layout has no horizontal overflow in every mode', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('./#/U04/read');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('#theme-btn').click(); // system → light
  const light = await bg();
  await page.locator('#theme-btn').click(); // light → dark
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  const dark = await bg();
  expect(dark).not.toBe(light);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  for (const m of ['read', 'listen', 'shadow', 'recall']) {
    await page.goto(`./#/U04/${m}`);
    await page.locator('.u-content > *').first().waitFor();
    await noHorizontalOverflow(page);
  }
  await page.locator('#theme-btn').click(); // dark → system
  expect(errors).toEqual([]);
});

test('screenshots for visual review', async ({ page }, info) => {
  const out = path.join(SITE, 'reports/screenshots');
  fs.mkdirSync(out, { recursive: true });
  const tag = info.project.name;
  await page.goto('./');
  await page.screenshot({ path: path.join(out, `${tag}-home.png`) });
  await page.goto('./#/U30/read');
  await page.locator('.card details.teach summary').first().click();
  await page.screenshot({ path: path.join(out, `${tag}-read.png`) });
  await page.goto('./#/U00/shadow/U00-C039');
  await page.screenshot({ path: path.join(out, `${tag}-shadow.png`) });
  await page.goto('./#/U00/recall');
  await page.screenshot({ path: path.join(out, `${tag}-recall.png`) });
  await page.goto('./#/U00/listen');
  await page.getByRole('button', { name: '显示原文' }).click();
  await page.screenshot({ path: path.join(out, `${tag}-listen.png`) });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/U30/read');
  await page.locator('.card details.teach summary').first().click();
  await page.screenshot({ path: path.join(out, `${tag}-read-dark.png`) });
});
