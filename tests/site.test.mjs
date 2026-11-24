import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../applications/website/public/site.js', import.meta.url), 'utf8');

function node(properties = {}) {
  const names = new Set();
  const listeners = {};
  return {
    names,
    listeners,
    attributes: {},
    classList: {
      add: (...items) => items.forEach(item => names.add(item)),
      remove: (...items) => items.forEach(item => names.delete(item)),
      toggle: (item, force) => (force ?? !names.has(item)) ? names.add(item) : names.delete(item),
      contains: item => names.has(item),
    },
    style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
    addEventListener(type, handler) { (listeners[type] ??= []).push(handler); },
    removeEventListener(type, handler) { listeners[type] = listeners[type].filter(item => item !== handler); },
    dispatch(type, event = {}) {
      for (const handler of [...listeners[type] ?? []]) handler({ target: this, ...event });
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    getBoundingClientRect: () => ({ top: 0, left: 0 }),
    closest: () => null,
    ...properties,
  };
}

function setup({ motion = true, finePointer = true, targets = [], cards = [], page = true } = {}) {
  const header = node();
  const summary = node({ focus() { this.focused = true; } });
  const panelLink = node();
  panelLink.closest = selector => selector === '.menu-panel a' ? panelLink : null;
  const menu = node({ open: false, querySelector: () => summary });
  menu.contains = target => [menu, summary, panelLink].includes(target);
  const submit = node({ disabled: false, textContent: 'Send inquiry' });
  const form = node({ querySelector: () => submit });
  const elements = page ? { '.site-header': header, '.menu': menu, 'form[method="post"]': form } : {};

  const queries = {};
  const observers = [];
  const documentEvents = node();
  const windowEvents = node();
  class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      observers.push(this);
    }
    observe(target) { this.observed.add(target); }
    unobserve(target) { this.observed.delete(target); }
  }
  const window = {
    scrollY: 0,
    innerHeight: 800,
    IntersectionObserver,
    matchMedia: query => queries[query] ??= {
      matches: query.includes('reduced-motion') ? motion : query.includes('hover') && finePointer,
      addEventListener(type, handler) { this[type] = handler; },
    },
    requestAnimationFrame: callback => callback(),
    addEventListener: windowEvents.addEventListener,
  };
  const document = {
    querySelector: selector => elements[selector] ?? null,
    querySelectorAll: selector => selector === '.card' ? cards : targets,
    addEventListener: documentEvents.addEventListener,
  };
  runInNewContext(source, { window, document, IntersectionObserver });
  return {
    header, menu, summary, panelLink, form, submit, observers, window,
    query: text => queries[text],
    fireDocument: (type, event) => documentEvents.dispatch(type, event),
    fireWindow: (type, event) => windowEvents.dispatch(type, event),
  };
}

test('the header gains a shadow once the page scrolls', () => {
  const page = setup();
  assert.equal(page.header.classList.contains('is-scrolled'), false);
  page.window.scrollY = 120;
  page.fireWindow('scroll');
  assert.equal(page.header.classList.contains('is-scrolled'), true);
});

test('the mobile menu closes on Escape, backdrop and outside clicks, menu links and page exit', () => {
  const page = setup();
  const { menu, summary } = page;
  menu.open = true;
  page.fireDocument('keydown', { key: 'Enter' });
  assert.equal(menu.open, true);
  page.fireDocument('keydown', { key: 'Escape' });
  assert.equal(menu.open, false);
  assert.equal(summary.focused, true);

  for (const target of [menu, node(), page.panelLink]) {
    menu.open = true;
    page.fireDocument('click', { target });
    assert.equal(menu.open, false);
  }
  menu.open = true;
  page.fireDocument('click', { target: summary });
  assert.equal(menu.open, true);
  page.fireWindow('pagehide');
  assert.equal(menu.open, false);
  menu.open = true;
  page.query('(min-width: 60.01rem)').change({ matches: true });
  assert.equal(menu.open, false);
});

test('content below the fold waits to be revealed while content in view never hides', () => {
  const visible = node({ getBoundingClientRect: () => ({ top: 300 }) });
  const below = node({ getBoundingClientRect: () => ({ top: 1200 }) });
  const [observer] = setup({ targets: [visible, below] }).observers;
  assert.equal(visible.names.size, 0);
  assert.deepEqual([...below.names], ['reveal', 'reveal-pending']);
  assert.deepEqual([...observer.observed], [below]);

  observer.callback([{ isIntersecting: false, target: below }]);
  assert.ok(below.classList.contains('reveal-pending'));
  observer.callback([{ isIntersecting: true, target: below }]);
  assert.ok(!below.classList.contains('reveal-pending'));
  assert.equal(observer.observed.size, 0);
  below.dispatch('transitionend', { target: node() });
  assert.ok(below.classList.contains('reveal'));
  below.dispatch('transitionend');
  assert.ok(!below.classList.contains('reveal'));
});

test('reduced motion shows all content at once and skips pointer effects', () => {
  const below = node({ getBoundingClientRect: () => ({ top: 1200 }) });
  const card = node();
  const page = setup({ motion: false, targets: [below], cards: [card] });
  assert.equal(below.names.size, 0);
  assert.equal(page.observers.length, 0);
  assert.equal(card.listeners.pointermove, undefined);
});

test('cards follow the pointer for the hover highlight only with a fine pointer', () => {
  const card = node({ getBoundingClientRect: () => ({ top: 100, left: 40 }) });
  setup({ cards: [card] });
  card.dispatch('pointermove', { clientX: 140.4, clientY: 160 });
  assert.equal(card.style.values['--spot-x'], '100px');
  assert.equal(card.style.values['--spot-y'], '60px');

  const touch = node();
  setup({ finePointer: false, cards: [touch] });
  assert.equal(touch.listeners.pointermove, undefined);
});

test('the inquiry form shows progress and blocks a second submission until the page is shown again', () => {
  const { form, submit, fireWindow } = setup();
  form.dispatch('submit');
  assert.equal(submit.disabled, true);
  assert.equal(submit.attributes['aria-busy'], 'true');
  assert.equal(submit.textContent, 'Sending inquiry…');
  fireWindow('pageshow', { persisted: true });
  assert.equal(submit.disabled, false);
  assert.equal(submit.attributes['aria-busy'], undefined);
  assert.equal(submit.textContent, 'Send inquiry');
});

test('pages without a header, menu or form still initialize', () => {
  assert.doesNotThrow(() => setup({ page: false }));
});
