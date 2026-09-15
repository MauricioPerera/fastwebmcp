import assert from 'node:assert/strict';
import test from 'node:test';
import { createLsfaBrokerMock } from '../src_ts/lsfa-testing.ts';

const accepted = {
  status: 'accepted' as const,
  operation: 'send_email',
  request_id: 'req_01JTEST0000000000000000000',
  risk: 'high' as const,
  checks: { confirmed: true, bound: true, single_use: true },
  stored_refs: { smtp_credential: true },
};

const request = {
  protocol: 'lsfa' as const,
  version: '0.2' as const,
  intent: { operation: 'send_email', purpose: 'Test the integration.' },
  agentInput: { recipient: 'ana@example.com' },
};

test('mock broker records requests and returns a queued deterministic result', async () => {
  const mock = createLsfaBrokerMock({ results: [accepted] });
  const signal = new AbortController().signal;
  assert.deepEqual(await mock.broker.request(request, { signal, origin: 'https://example.test' }), accepted);
  assert.deepEqual(mock.requests, [{ request, context: { signal, origin: 'https://example.test' } }]);
  assert.equal(mock.callCount, 1);
});

test('mock broker never invents approval and reset clears its state', async () => {
  const mock = createLsfaBrokerMock();
  await assert.rejects(mock.broker.request(request, { signal: new AbortController().signal, origin: 'null' }), /no result queued/i);
  assert.equal(mock.callCount, 1);
  mock.reset();
  assert.equal(mock.callCount, 0);
  assert.deepEqual(mock.requests, []);
});

test('mock broker observes abort before and during a simulated request', async () => {
  const before = createLsfaBrokerMock({ results: [accepted] });
  const already = new AbortController();
  already.abort();
  await assert.rejects(before.broker.request(request, { signal: already.signal, origin: 'null' }), /aborted/i);
  assert.equal(before.callCount, 0);

  const during = createLsfaBrokerMock({ handler: async (_request, context) => {
    await new Promise<void>((resolve) => context.signal.addEventListener('abort', () => resolve(), { once: true }));
    return accepted;
  } });
  const controller = new AbortController();
  const pending = during.broker.request(request, { signal: controller.signal, origin: 'null' });
  controller.abort();
  await assert.rejects(pending, /aborted/i);
  assert.equal(during.callCount, 1);
});

