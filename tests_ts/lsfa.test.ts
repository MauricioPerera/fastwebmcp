import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import {
  defineLsfaTool,
  registerLsfaTool,
  type LsfaBroker,
  type LsfaResult,
} from '../src_ts/lsfa.ts';
import { createWebMcpMock, withMockDocument } from '../src_ts/testing.ts';

const statuses = ['accepted', 'declined', 'cancelled', 'invalid', 'failed', 'expired'] as const;

function result(status: (typeof statuses)[number]): LsfaResult {
  return {
    status,
    operation: 'send_email',
    request_id: 'req_01JTEST0000000000000000000',
    risk: 'high',
    checks: { confirmed: status === 'accepted', bound: true, single_use: true },
    stored_refs: { smtp_credential: true },
    ...(status === 'failed' ? { error_code: 'delivery_failed' } : {}),
  };
}

function brokerReturning(value: unknown, calls: unknown[] = []): LsfaBroker {
  return {
    async request(request, context) {
      calls.push({ request, context });
      return value;
    },
  };
}

const base = {
  name: 'send_email',
  description: 'Ask the trusted LSFA broker to capture approval and send an email.',
  inputSchema: z.object({ recipient: z.string().email(), subject: z.string().min(1) }),
  intent: {
    operation: 'send_email',
    purpose: 'Send the email requested by the user after trusted local confirmation.',
    presentation: { profile: 'confirmation', locale: 'es-MX', theme: 'system' } as const,
  },
};

test('defineLsfaTool exposes only agent input and delegates authority to the injected broker', async () => {
  const calls: unknown[] = [];
  const tool = defineLsfaTool({ ...base, broker: brokerReturning(result('accepted'), calls) });
  assert.deepEqual(Object.keys(tool.inputSchema.properties as object).sort(), ['recipient', 'subject']);
  assert.equal(JSON.stringify(tool.inputSchema).includes('smtp_credential'), false);
  const signal = new AbortController().signal;
  assert.deepEqual(await tool.execute({ recipient: 'ana@example.com', subject: 'Hola' }, { signal }), result('accepted'));
  assert.deepEqual(calls, [{
    request: {
      protocol: 'lsfa',
      version: '0.2',
      intent: base.intent,
      agentInput: { recipient: 'ana@example.com', subject: 'Hola' },
    },
    context: { signal, origin: 'null' },
  }]);
});

test('defineLsfaTool rejects secret-bearing WebMCP schemas recursively', () => {
  const forbidden = ['password', 'api_key', 'accessToken', 'credential', 'pin', 'totp'];
  for (const key of forbidden) {
    assert.throws(
      () => defineLsfaTool({
        ...base,
        inputSchema: z.object({ envelope: z.object({ [key]: z.string() }) }),
        broker: brokerReturning(result('accepted')),
      }),
      /LSFA-captured secret/i,
      key,
    );
  }
  assert.throws(
    () => defineLsfaTool({
      ...base,
      inputSchema: z.object({ value: z.string().meta({ format: 'password' }) }),
      broker: brokerReturning(result('accepted')),
    }),
    /LSFA-captured secret/i,
  );
});

test('defineLsfaTool requires a real broker and a strict presentation hint', () => {
  assert.throws(() => defineLsfaTool({ ...base, broker: undefined as unknown as LsfaBroker }), /broker/i);
  assert.throws(() => defineLsfaTool({
    ...base,
    intent: { ...base.intent, presentation: { profile: 'confirmation', layout: { sections: [] } } as never },
    broker: brokerReturning(result('accepted')),
  }), /presentation/i);
  assert.throws(() => defineLsfaTool({
    ...base,
    intent: { ...base.intent, presentation: { profile: '<script>' } as never },
    broker: brokerReturning(result('accepted')),
  }), /presentation/i);
});

test('all protocol statuses are preserved and unknown result data is rejected', async () => {
  for (const status of statuses) {
    const tool = defineLsfaTool({ ...base, broker: brokerReturning(result(status)) });
    assert.deepEqual(await tool.execute({ recipient: 'ana@example.com', subject: 'Hola' }, { signal: new AbortController().signal }), result(status));
  }
  for (const unsafe of [
    { ...result('accepted'), password: 'leak' },
    { ...result('accepted'), status: 'approved' },
    { ...result('accepted'), checks: { confirmed: true, secret: 'leak' } },
  ]) {
    const tool = defineLsfaTool({ ...base, broker: brokerReturning(unsafe) });
    await assert.rejects(
      tool.execute({ recipient: 'ana@example.com', subject: 'Hola' }, { signal: new AbortController().signal }),
      { message: 'fastwebmcp/lsfa: broker returned an invalid result' },
    );
  }
});

test('broker errors are sanitized and an already-aborted call never reaches the broker', async () => {
  const calls: unknown[] = [];
  const failing: LsfaBroker = { async request() { throw new Error('SMTP password is hunter2'); } };
  const failedTool = defineLsfaTool({ ...base, broker: failing });
  await assert.rejects(
    failedTool.execute({ recipient: 'ana@example.com', subject: 'Hola' }, { signal: new AbortController().signal }),
    { message: 'fastwebmcp/lsfa: broker request failed' },
  );

  const controller = new AbortController();
  controller.abort();
  const cancelledTool = defineLsfaTool({ ...base, broker: brokerReturning(result('accepted'), calls) });
  await assert.rejects(
    cancelledTool.execute({ recipient: 'ana@example.com', subject: 'Hola' }, { signal: controller.signal }),
    { message: 'fastwebmcp/lsfa: request aborted before broker dispatch' },
  );
  assert.equal(calls.length, 0);
});

test('registerLsfaTool preserves exposedTo and safely degrades without WebMCP', async () => {
  const mock = createWebMcpMock();
  const registered = withMockDocument(mock, () => registerLsfaTool(
    { ...base, broker: brokerReturning(result('accepted')) },
    { exposedTo: ['https://agent.example'] },
  ));
  assert.equal(registered, true);
  assert.deepEqual(mock.getTool('send_email')?.options, { exposedTo: ['https://agent.example'] });

  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  delete (globalThis as { document?: unknown }).document;
  const warnings: unknown[][] = [];
  const oldWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    assert.equal(registerLsfaTool({ ...base, broker: brokerReturning(result('accepted')) }), false);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = oldWarn;
    if (original) Object.defineProperty(globalThis, 'document', original);
  }
});

