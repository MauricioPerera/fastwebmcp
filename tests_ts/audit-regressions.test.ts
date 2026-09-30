import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import * as api from '../src_ts/index.ts';
import { withDocument } from './mock-globals.ts';

function usingDocument<T>(document: Parameters<typeof withDocument>[0], fn: () => T): T {
  let result!: T;
  withDocument(document, () => { result = fn(); });
  return result;
}

const spec = { name: 'audit_probe', description: 'Audit regression probe.', inputSchema: z.object({}), execute: async () => 'ok' };

test('async registration waits for native completion and preserves rejection identity', async () => {
  let finish!: () => void;
  const completion = new Promise<void>(resolve => { finish = resolve; });
  await usingDocument({ modelContext: { registerTool: () => completion } }, async () => {
    let settled = false;
    const registration = api.registerToolAsync(spec).then(value => { settled = true; return value; });
    await Promise.resolve();
    assert.equal(settled, false);
    finish();
    assert.equal(await registration, true);
  });
  const failure = new DOMException('Registration denied', 'NotAllowedError');
  await usingDocument({ modelContext: { registerTool: () => Promise.reject(failure) } }, async () => {
    await assert.rejects(api.registerToolAsync(spec), error => error === failure);
  });
});

test('legacy registration handles native rejection with a warning', async () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    withDocument({ modelContext: { registerTool: () => Promise.reject(new Error('native failure')) } }, () => {
      assert.equal(api.registerTool(spec), true);
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(warnings.length, 1);
    assert.match(String(warnings[0][0]), /registration.*failed/i);
  } finally { console.warn = originalWarn; }
});

test('async registration retains unsupported fallback and forwards native options', async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await usingDocument(undefined, () => api.registerToolAsync(spec)), false);
  } finally { console.warn = originalWarn; }
  const mock = api.createWebMcpMock();
  const options = { signal: new AbortController().signal, exposedTo: ['https://agent.example'] };
  assert.equal(await api.withMockDocument(mock, () => api.registerToolAsync(spec, options)), true);
  assert.equal(mock.getTool(spec.name)?.options, options);
});

test('explicit false removes existing autosubmit while omission preserves it', () => {
  const attributes = new Map<string, string>([['toolautosubmit', '']]);
  const form = { elements: [], setAttribute: (name: string, value: string) => { attributes.set(name, value); }, removeAttribute: (name: string) => { attributes.delete(name); } };
  api.defineDeclarativeTool(form, { name: 'confirm', description: 'Confirm.' });
  assert.equal(attributes.has('toolautosubmit'), true);
  api.defineDeclarativeTool(form, { name: 'confirm', description: 'Confirm.', autoSubmit: false });
  assert.equal(attributes.has('toolautosubmit'), false);
  api.defineDeclarativeTool(form, { name: 'confirm', description: 'Confirm.', autoSubmit: true });
  assert.equal(attributes.has('toolautosubmit'), true);
  api.defineDeclarativeTool(form, { name: 'confirm', description: 'Confirm.', autoSubmit: false });
  assert.equal(attributes.has('toolautosubmit'), false);
});

test('a form-like without removeAttribute fails before any mutation when disabling autosubmit', () => {
  const attributes = new Map<string, string>();
  const form = { elements: [], setAttribute: (name: string, value: string) => { attributes.set(name, value); } };
  assert.throws(() => api.defineDeclarativeTool(form, { name: 'confirm', description: 'Confirm.', autoSubmit: false }), /removeAttribute/);
  assert.equal(attributes.size, 0);
});

test('async document scope lasts until completion and restores the original descriptor', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const mock = api.createWebMcpMock();
  await api.withMockDocument(mock, async () => {
    await Promise.resolve();
    assert.equal(globalThis.document, mock.document);
    assert.equal(api.registerTool(spec), true);
    assert.equal(await mock.invokeTool(spec.name, {}), 'ok');
  });
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'document'), original);
  await assert.rejects(api.withMockDocument(mock, async () => { await Promise.resolve(); throw new Error('scope failed'); }), /scope failed/);
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'document'), original);
  assert.throws(() => api.withMockDocument(mock, () => { throw new Error('sync failed'); }), /sync failed/);
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'document'), original);
});

test('nested scopes restore the outer document after an awaited inner scope', async () => {
  const outer = api.createWebMcpMock();
  const inner = api.createWebMcpMock();
  await api.withMockDocument(outer, async () => {
    await api.withMockDocument(inner, async () => { await Promise.resolve(); assert.equal(globalThis.document, inner.document); });
    assert.equal(globalThis.document, outer.document);
  });
});

test('reset removes stale abort listeners and preserves a new registration with the same name', () => {
  const mock = api.createWebMcpMock();
  const controller = new AbortController();
  api.withMockDocument(mock, () => api.registerTool(spec, { signal: controller.signal }));
  mock.reset();
  api.withMockDocument(mock, () => api.registerTool(spec));
  controller.abort();
  assert.equal(mock.hasTool(spec.name), true);
});

test('replacing a mock registration detaches the previous signal', () => {
  const mock = api.createWebMcpMock();
  const old = new AbortController();
  const current = new AbortController();
  api.withMockDocument(mock, () => {
    api.registerTool(spec, { signal: old.signal });
    api.registerTool(spec, { signal: current.signal });
  });
  old.abort();
  assert.equal(mock.hasTool(spec.name), true);
  current.abort();
  assert.equal(mock.hasTool(spec.name), false);
});

test('an already-aborted registration cannot remove an existing mock tool', () => {
  const mock = api.createWebMcpMock();
  const aborted = new AbortController();
  aborted.abort();
  api.withMockDocument(mock, () => {
    api.registerTool(spec);
    api.registerTool(spec, { signal: aborted.signal });
  });
  assert.equal(mock.hasTool(spec.name), true);
});

test('LSFA recognizes secret name tokens without rejecting ordinary substrings', () => {
  const base = { ...spec, intent: { operation: 'ship', purpose: 'Ship a parcel.' }, broker: { request: async () => ({ status: 'accepted', operation: 'ship' }) } };
  for (const name of ['shipping_address', 'opinion', 'spinner', 'tokenCount', 'token_count', 'credentialCount']) {
    assert.doesNotThrow(() => api.defineLsfaTool({ ...base, inputSchema: z.object({ [name]: z.string() }) }), name);
  }
  for (const name of ['password', 'accessToken', 'smtp_credential', 'api_key', 'apiKey', 'APIKey', 'privateKey', 'pin', 'totp', 'nested_password_value']) {
    assert.throws(() => api.defineLsfaTool({ ...base, inputSchema: z.object({ envelope: z.object({ [name]: z.string() }) }) }), /LSFA-captured secret/, name);
  }
});

test('LSFA sync and async registration parse input once and preserve broker options', async () => {
  const seen: number[] = [];
  const lsfaSpec = { ...spec, inputSchema: z.object({ count: z.number().overwrite(n => n + 1) }), intent: { operation: 'count', purpose: 'Count.' }, broker: { request: async (request: api.LsfaBrokerRequest) => { seen.push((request.agentInput as { count: number }).count); return { status: 'accepted', operation: 'count' }; } } };
  await api.defineLsfaTool(lsfaSpec).execute({ count: 1 }, { signal: new AbortController().signal });
  const mock = api.createWebMcpMock();
  const options = { exposedTo: ['https://agent.example'] };
  api.withMockDocument(mock, () => api.registerLsfaTool(lsfaSpec, options));
  await mock.invokeTool(spec.name, { count: 1 });
  mock.reset();
  assert.equal(await api.withMockDocument(mock, () => api.registerLsfaToolAsync(lsfaSpec, options)), true);
  assert.equal(mock.getTool(spec.name)?.options, options);
  await mock.invokeTool(spec.name, { count: 1 });
  assert.deepEqual(seen, [2, 2, 2]);
});
