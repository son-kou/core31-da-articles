// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { rich } from '../src/dom';

describe('teaching text rendering', () => {
  it('inserts text only — markup in data never becomes DOM', () => {
    const div = document.createElement('div');
    div.append(rich('看 `holde øje med` <img src=x onerror="alert(1)"> <script>alert(2)</script>'));
    expect(div.querySelector('img, script')).toBeNull();
    expect(div.querySelector('span.da')?.textContent).toBe('holde øje med');
    expect(div.textContent).toContain('<img src=x');
  });
});
