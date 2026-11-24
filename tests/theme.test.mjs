import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../applications/website/public/theme.js', import.meta.url), 'utf8');

function element() {
  return {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, handler) { this[type] = handler; },
  };
}

function setup({ savedTheme = null, restrictedStorage = false, readyState = 'complete', reducedMotion = false, viewTransitions = false } = {}) {
  const dataset = {};
  const button = element();
  const meta = element();
  const preference = { matches: true, addEventListener(type, handler) { this[type] = handler; } };
  const listeners = {};
  const transitions = [];
  const document = {
    readyState,
    documentElement: { dataset },
    querySelector: selector => ({ '.theme': button, 'meta[name="theme-color"]': meta })[selector] ?? null,
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  if (viewTransitions) {
    document.startViewTransition = update => {
      transitions.push(update);
      update();
    };
  }
  runInNewContext(source, {
    document,
    window: {
      matchMedia: query => query.includes('reduced-motion') ? { matches: reducedMotion } : preference,
    },
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
  return { dataset, button, meta, preference, listeners, transitions };
}

test('theme follows system changes until the visitor chooses explicitly', () => {
  for (const restricted of [false, true]) {
    const { dataset, button, preference } = setup({ restrictedStorage: restricted });
    assert.equal(dataset.theme, 'light');
    assert.equal(button.attributes['aria-label'], 'Switch to dark theme');
    preference.change({ matches: false });
    assert.equal(dataset.theme, 'dark');
    assert.equal(button.attributes['aria-label'], 'Switch to light theme');
    assert.equal(button.title, 'Switch to light theme');
    button.click();
    assert.equal(dataset.theme, 'light');
    preference.change({ matches: false });
    assert.equal(dataset.theme, 'light');
  }
});

test('a saved theme takes precedence over system changes', () => {
  const { dataset, meta, preference } = setup({ savedTheme: 'dark' });
  assert.equal(dataset.theme, 'dark');
  assert.equal(meta.attributes.content, '#0b0d10');
  preference.change({ matches: true });
  assert.equal(dataset.theme, 'dark');
});

test('the theme applies before the page body exists and the toggle connects once it does', () => {
  const { dataset, button, meta, listeners } = setup({ savedTheme: 'light', readyState: 'loading' });
  assert.equal(dataset.theme, 'light');
  assert.equal(meta.attributes.content, '#f6f8f9');
  assert.equal(button.click, undefined);
  listeners.DOMContentLoaded();
  assert.equal(button.attributes['aria-label'], 'Switch to dark theme');
  button.click();
  assert.equal(dataset.theme, 'dark');
  assert.equal(meta.attributes.content, '#0b0d10');
});

test('switching animates with a view transition unless reduced motion is requested', () => {
  const animated = setup({ viewTransitions: true });
  animated.button.click();
  assert.equal(animated.transitions.length, 1);
  assert.equal(animated.dataset.theme, 'dark');

  const still = setup({ viewTransitions: true, reducedMotion: true });
  still.button.click();
  assert.equal(still.transitions.length, 0);
  assert.equal(still.dataset.theme, 'dark');
});
