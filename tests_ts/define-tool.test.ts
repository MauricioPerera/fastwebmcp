import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineTool } from '../src_ts/define-tool.ts';

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
