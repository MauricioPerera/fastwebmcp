import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineTool } from '../src_ts/define-tool.ts';
import { withWarnSpy } from './mock-globals.ts';

const noopSignal = new AbortController().signal;

test('returns a normalized tool with name, description and a JSON Schema inputSchema', () => {
  const tool = defineTool({
    name: 'toggle_layer',
    description: 'Control pizza layers (sauce, cheese).',
    inputSchema: z.object({
      layer: z.enum(['sauce-layer', 'cheese-layer']),
      action: z.enum(['add', 'remove', 'toggle']).optional(),
    }),
    execute: async ({ layer, action }) => `Performed ${action ?? 'toggle'} on layer: ${layer}`,
  });

  assert.equal(tool.name, 'toggle_layer');
  assert.equal(tool.description, 'Control pizza layers (sauce, cheese).');
  assert.equal(typeof tool.execute, 'function');
  assert.equal(tool.inputSchema.type, 'object');
  assert.deepEqual(tool.inputSchema.required, ['layer']);
  assert.ok('layer' in (tool.inputSchema.properties as Record<string, unknown>));
});

test('throws when name is an empty string', () => {
  assert.throws(
    () =>
      defineTool({
        name: '',
        description: 'desc',
        inputSchema: z.object({}),
        execute: async () => 'ok',
      }),
    /name must be a non-empty string/,
  );
});

test('throws when name is missing whitespace-only', () => {
  assert.throws(
    () =>
      defineTool({
        name: '   ',
        description: 'desc',
        inputSchema: z.object({}),
        execute: async () => 'ok',
      }),
    /name must be a non-empty string/,
  );
});

test('throws when description is an empty string', () => {
  assert.throws(
    () =>
      defineTool({
        name: 'x',
        description: '',
        inputSchema: z.object({}),
        execute: async () => 'ok',
      }),
    /description must be a non-empty string/,
  );
});

test('throws when execute is not a function', () => {
  assert.throws(
    () =>
      defineTool({
        name: 'x',
        description: 'desc',
        inputSchema: z.object({}),
        // @ts-expect-error deliberately wrong for the test
        execute: 'not-a-function',
      }),
    /execute must be a function/,
  );
});

test('the wrapped execute parses valid input and forwards it to the handler', async () => {
  const tool = defineTool({
    name: 'greet',
    description: 'Greets someone.',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => `Hello, ${name}!`,
  });

  const result = await tool.execute({ name: 'Ana' }, { signal: noopSignal });
  assert.equal(result, 'Hello, Ana!');
});

test('the wrapped execute rejects when raw input fails schema validation', async () => {
  const tool = defineTool({
    name: 'greet',
    description: 'Greets someone.',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => `Hello, ${name}!`,
  });

  await assert.rejects(() => tool.execute({ name: 42 }, { signal: noopSignal }));
});

test('the wrapped execute forwards the AbortSignal context unchanged', async () => {
  let receivedSignal: AbortSignal | undefined;
  const tool = defineTool({
    name: 'echo_signal',
    description: 'Captures the signal it receives.',
    inputSchema: z.object({}),
    execute: async (_input, context) => {
      receivedSignal = context.signal;
      return 'ok';
    },
  });

  await tool.execute({}, { signal: noopSignal });
  assert.equal(receivedSignal, noopSignal);
});

test('passes annotations through to the returned tool when provided', () => {
  const tool = defineTool({
    name: 'get_price',
    description: 'Reads the current price. Read-only.',
    inputSchema: z.object({}),
    execute: async () => '$10',
    annotations: { readOnlyHint: true, untrustedContentHint: false },
  });

  assert.deepEqual(tool.annotations, { readOnlyHint: true, untrustedContentHint: false });
});

test('omits annotations from the returned tool entirely when not provided', () => {
  const tool = defineTool({
    name: 'get_price',
    description: 'Reads the current price.',
    inputSchema: z.object({}),
    execute: async () => '$10',
  });

  assert.equal('annotations' in tool, false);
});

test('passes title through to the returned tool when provided', () => {
  const tool = defineTool({
    name: 'get_price',
    description: 'Reads the current price.',
    inputSchema: z.object({}),
    execute: async () => '$10',
    title: 'Get Price',
  });

  assert.equal(tool.title, 'Get Price');
});

test('omits title from the returned tool entirely when not provided', () => {
  const tool = defineTool({
    name: 'get_price',
    description: 'Reads the current price.',
    inputSchema: z.object({}),
    execute: async () => '$10',
  });

  assert.equal('title' in tool, false);
});

test('throws when name contains a character outside [A-Za-z0-9_.-]', () => {
  assert.throws(
    () =>
      defineTool({
        name: 'my tool!',
        description: 'desc',
        inputSchema: z.object({}),
        execute: async () => 'ok',
      }),
    /name must be 1-128 characters/,
  );
});

test('throws when name exceeds 128 characters', () => {
  assert.throws(
    () =>
      defineTool({
        name: 'a'.repeat(129),
        description: 'desc',
        inputSchema: z.object({}),
        execute: async () => 'ok',
      }),
    /name must be 1-128 characters/,
  );
});

test('warns (without throwing) when name exceeds the 30-character budget Chrome recommends', () => {
  withWarnSpy((calls) => {
    const tool = defineTool({
      name: 'a'.repeat(35),
      description: 'desc',
      inputSchema: z.object({}),
      execute: async () => 'ok',
    });

    assert.equal(tool.name.length, 35);
    assert.equal(calls.length, 1);
    assert.match(String(calls[0][0]), /tool name is 35 characters/);
  });
});

test('warns (without throwing) when description exceeds the 500-character budget Chrome recommends', () => {
  withWarnSpy((calls) => {
    defineTool({
      name: 'x',
      description: 'd'.repeat(501),
      inputSchema: z.object({}),
      execute: async () => 'ok',
    });

    assert.equal(calls.length, 1);
    assert.match(String(calls[0][0]), /tool description is 501 characters/);
  });
});

test('does not warn for a name and description within budget', () => {
  withWarnSpy((calls) => {
    defineTool({
      name: 'greet',
      description: 'Greets someone.',
      inputSchema: z.object({ name: z.string() }),
      execute: async ({ name }) => `Hello, ${name}!`,
    });

    assert.equal(calls.length, 0);
  });
});
