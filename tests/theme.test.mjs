import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../applications/website/public/theme.js', import.meta.url), 'utf8');

function setup(savedTheme, restrictedStorage = false) {
  const dataset = {};
  const button = { addEventListener(type, handler) { this[type] = handler; } };
  const preference = { matches: true, addEventListener(type, handler) { this[type] = handler; } };
  runInNewContext(source, {
    document: { documentElement: { dataset }, querySelector: () => button },
    window: { matchMedia: () => preference },
    localStorage: {
      getItem() {
        if (restrictedStorage) throw new Error('Storage unavailable');
        return savedTheme;
      },
      setItem() {
        if (restrictedStorage) throw new Error('Storage unavailable');
      },
    },
  });
  return { dataset, button, preference };
}

test('theme follows system changes until the visitor chooses explicitly', () => {
  for (const restricted of [false, true]) {
    const { dataset, button, preference } = setup(null, restricted);
    assert.equal(dataset.theme, 'light');
    preference.change({ matches: false });
    assert.equal(dataset.theme, 'dark');
    assert.equal(button.textContent, 'Light mode');
    button.click();
    assert.equal(dataset.theme, 'light');
    preference.change({ matches: false });
    assert.equal(dataset.theme, 'light');
  }
});

test('a saved theme takes precedence over system changes', () => {
  const { dataset, preference } = setup('dark');
  assert.equal(dataset.theme, 'dark');
  preference.change({ matches: true });
  assert.equal(dataset.theme, 'dark');
});
