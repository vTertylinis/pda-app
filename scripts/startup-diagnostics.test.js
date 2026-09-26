const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
const script = html.match(/<script id="startup-diagnostics">([\s\S]*?)<\/script>/)[1];
const queueKey = 'pda-startup-diagnostics-v1';

function start(options = {}) {
  const storage = options.storage || new Map();
  const requests = [];
  const timers = [];
  let reloads = 0;
  function target() {
    const listeners = {};
    return {
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      emit(type, detail = {}) { for (const fn of listeners[type] || []) fn(detail); },
    };
  }
  const window = target();
  const elements = Object.fromEntries(['startup-screen', 'startup-title', 'startup-message', 'startup-help', 'startup-retry']
    .map(id => [id, { ...target(), hidden: id === 'startup-help', textContent: '' }]));
  const document = {
    ...target(), visibilityState: 'visible', scripts: [{ src: 'http://shop/main-HASH.js?private=value' }],
    getElementById: id => elements[id],
  };
  class XHR {
    constructor() { requests.push(this); }
    open(method, url) { this.url = url; }
    setRequestHeader() {}
    send(body) { this.entries = JSON.parse(body).entries; }
    respond(body, status = 200) { this.status = status; this.responseText = JSON.stringify(body); this.onload(); }
  }
  vm.runInNewContext(script, {
    window, document, URL, Date, Math, Array, JSON, String,
    location: { href: 'http://shop/tabs/tab1?private=value', protocol: 'http:', origin: 'http://shop', reload() { reloads++; } },
    navigator: { onLine: options.online !== false, userAgent: 'test' },
    performance: { getEntriesByType: () => [{ type: 'navigate', responseStart: 5000, responseEnd: 5100 }] },
    localStorage: {
      getItem(key) { if (options.brokenStorage) throw Error('disabled'); return storage.get(key) || null; },
      setItem(key, value) { if (options.brokenStorage) throw Error('full'); storage.set(key, value); },
    },
    XMLHttpRequest: XHR,
    setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimeout(timer) { timer.cancelled = true; },
    setInterval(fn, ms) { timers.push({ fn, ms, interval: true }); },
  });
  return {
    window, document, elements, requests, storage,
    events: () => JSON.parse(storage.get(queueKey) || '[]'),
    run(ms) { const timer = timers.find(t => t.ms === ms && !t.cancelled && !t.ran); assert.ok(timer, `timer ${ms}`); if (!timer.interval) timer.ran = true; timer.fn(); },
    reloads: () => reloads,
  };
}

test('slow startup remains visible with help, never auto-reloads, then recovers', () => {
  const page = start();
  page.run(12000);
  assert.equal(page.elements['startup-help'].hidden, false);
  assert.equal(page.elements['startup-screen'].hidden, false);
  assert.equal(page.reloads(), 0);
  page.window.emit('app-startup-ready');
  assert.equal(page.elements['startup-screen'].hidden, true);
  assert.deepEqual(page.events().map(e => e.stage), ['started', 'slow-start', 'ready']);
  page.window.emit('error', { message: 'Later error' });
  page.elements['startup-retry'].emit('click');
  assert.equal(page.reloads(), 0);
  assert.equal(page.events().length, 3);
});

test('bundle and Angular errors offer retry; retry persists before reload', () => {
  const page = start();
  page.window.emit('error', { target: { tagName: 'SCRIPT', src: 'http://shop/chunk.js?secret=1' } });
  page.window.emit('app-startup-error', { detail: Error('Lazy route failed') });
  assert.equal(page.elements['startup-help'].hidden, false);
  assert.equal(page.events()[1].detail.message, 'Failed to load: http://shop/chunk.js');
  page.elements['startup-retry'].emit('click');
  assert.equal(page.events().at(-1).stage, 'retry-click');
  assert.equal(page.reloads(), 1);
  const next = start({ storage: page.storage });
  assert.equal(next.events().length, 5);
  assert.equal(next.events()[0].appInstanceId, next.events().at(-1).appInstanceId);
  assert.notEqual(next.events()[0].attemptId, next.events().at(-1).attemptId);
});

test('old backend, timeouts and partial ACKs preserve pending/new events', () => {
  const page = start();
  page.run(0);
  assert.equal(page.requests[0].url, 'http://shop/client-diagnostics');
  page.requests[0].respond({ accepted: 0 });
  assert.equal(page.events().length, 1);
  page.run(15000);
  page.requests[1].ontimeout();
  assert.equal(page.events().length, 1);
  page.run(15000);
  const sent = page.requests[2].entries;
  page.window.emit('app-startup-ready');
  page.requests[2].respond({ acceptedEventIds: sent.map(e => e.eventId) });
  assert.deepEqual(page.events().map(e => e.stage), ['ready']);
  page.run(0);
  page.requests[3].respond({ acceptedEventIds: page.requests[3].entries.map(e => e.eventId) });
  assert.equal(page.events().length, 0);
});

test('storage failures keep an in-memory queue and do not block recovery', () => {
  const page = start({ brokenStorage: true, online: false });
  assert.equal(page.elements['startup-help'].hidden, false);
  page.run(0);
  assert.equal(page.requests[0].entries[0].stage, 'started');
  page.requests[0].onerror();
  page.window.emit('app-startup-ready');
  assert.equal(page.elements['startup-screen'].hidden, true);
  assert.equal(page.requests[1].entries.length, 2);
});

test('healthy startup cancels warning and captures document timing without URL queries', () => {
  const page = start();
  page.window.emit('app-startup-ready');
  assert.throws(() => page.run(12000));
  const ready = page.events().at(-1);
  assert.equal(ready.navigation.responseStart, 5000);
  assert.equal(ready.device.pageUrl, 'http://shop/tabs/tab1');
  assert.deepEqual(ready.bundles, ['http://shop/main-HASH.js']);
});

test('caps noisy errors and bounds retained offline events', () => {
  const page = start();
  for (let i = 0; i < 30; i++) page.window.emit('unhandledrejection', { reason: 'failure' });
  assert.equal(page.events().filter(e => e.stage === 'unhandled-rejection').length, 8);
  for (let i = 0; i < 120; i++) page.document.emit('visibilitychange');
  assert.equal(page.events().length, 80);
});
