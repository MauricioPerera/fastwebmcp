import { test } from 'node:test';
import assert from 'node:assert/strict';
import { respondToAgentSubmit } from '../src_ts/respond-to-agent-submit.ts';

function createFakeEvent(agentInvoked: boolean) {
  const respondWithCalls: Promise<unknown>[] = [];
  return {
    agentInvoked,
    respondWith(promise: Promise<unknown>) {
      respondWithCalls.push(promise);
    },
    respondWithCalls,
  };
}

test('returns false and never calls respondWith when agentInvoked is false', () => {
  const event = createFakeEvent(false);
  const result = respondToAgentSubmit(event, () => 'unused');
  assert.equal(result, false);
  assert.equal(event.respondWithCalls.length, 0);
});

test('returns true and calls respondWith exactly once when agentInvoked is true', () => {
  const event = createFakeEvent(true);
  const result = respondToAgentSubmit(event, () => 'ok');
  assert.equal(result, true);
  assert.equal(event.respondWithCalls.length, 1);
});

test('the promise passed to respondWith resolves to the handler return value', async () => {
  const event = createFakeEvent(true);
  respondToAgentSubmit(event, () => ({ status: 'submitted' }));
  const resolved = await event.respondWithCalls[0];
  assert.deepEqual(resolved, { status: 'submitted' });
});

test('the promise passed to respondWith resolves to the handler return value even when the handler is async', async () => {
  const event = createFakeEvent(true);
  respondToAgentSubmit(event, async () => 'from-async-handler');
  const resolved = await event.respondWithCalls[0];
  assert.equal(resolved, 'from-async-handler');
});

test('a synchronous throw inside the handler rejects the promise instead of escaping', async () => {
  const event = createFakeEvent(true);
  respondToAgentSubmit(event, () => {
    throw new Error('boom');
  });
  await assert.rejects(() => event.respondWithCalls[0], /boom/);
});

test('the handler receives the event itself as its argument', async () => {
  const event = createFakeEvent(true);
  let received: unknown;
  respondToAgentSubmit(event, (receivedEvent) => {
    received = receivedEvent;
    return 'ok';
  });
  // The handler runs inside a microtask (see the sync-throw test above), so it has not
  // necessarily run yet at this point -- awaiting the promise passed to respondWith
  // guarantees it has.
  await event.respondWithCalls[0];
  assert.equal(received, event);
});
