import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createWebMcpMock } from '../src_ts/testing.ts';
import { registerTool } from '../src_ts/register-tool.ts';
import { withDocument } from './mock-globals.ts';

test('exposes a document shaped object with modelContext.registerTool', () => {
  const mock = createWebMcpMock();
  assert.equal(typeof mock.document.modelContext.registerTool, 'function');
});

test('invokeTool runs the real registered handler end to end via registerTool()', async () => {
  const mock = createWebMcpMock();
  withDocument(mock.document, () => {
    registerTool({
      name: 'greet',
      description: 'Greets someone.',
      inputSchema: z.object({ name: z.string() }),
      execute: async ({ name }) => `Hello, ${name}!`,
    });
  });

  const result = await mock.invokeTool('greet', { name: 'Ana' });
  assert.equal(result, 'Hello, Ana!');
});

test('invokeTool rejects with a clear error when no tool is registered under that name', async () => {
  const mock = createWebMcpMock();
  await assert.rejects(() => mock.invokeTool('missing', {}), /no tool registered.*"missing"/);
});

test('invokeTool provides a default AbortSignal when the caller does not pass one', async () => {
  const mock = createWebMcpMock();
  let receivedSignal: AbortSignal | undefined;
  withDocument(mock.document, () => {
    registerTool({
      name: 'echo_signal',
      description: 'Captures the signal it receives.',
      inputSchema: z.object({}),
      execute: async (_input, context) => {
        receivedSignal = context.signal;
        return 'ok';
      },
    });
  });

  await mock.invokeTool('echo_signal', {});
  assert.ok(receivedSignal instanceof AbortSignal);
});

test('invokeTool forwards a caller-provided signal unchanged', async () => {
  const mock = createWebMcpMock();
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  withDocument(mock.document, () => {
    registerTool({
      name: 'echo_signal',
      description: 'Captures the signal it receives.',
      inputSchema: z.object({}),
      execute: async (_input, context) => {
        receivedSignal = context.signal;
        return 'ok';
      },
    });
  });

  await mock.invokeTool('echo_signal', {}, { signal: controller.signal });
  assert.equal(receivedSignal, controller.signal);
});

test('two tools registered on the same mock do not cross-contaminate', async () => {
  const mock = createWebMcpMock();
  withDocument(mock.document, () => {
    registerTool({
      name: 'a',
      description: 'A',
      inputSchema: z.object({}),
      execute: async () => 'from-a',
    });
    registerTool({
      name: 'b',
      description: 'B',
      inputSchema: z.object({}),
      execute: async () => 'from-b',
    });
  });

  assert.equal(await mock.invokeTool('a', {}), 'from-a');
  assert.equal(await mock.invokeTool('b', {}), 'from-b');
});
