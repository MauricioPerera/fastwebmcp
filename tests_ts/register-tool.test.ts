import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { registerTool } from '../src_ts/register-tool.ts';
import { withDocument, withWarnSpy } from './mock-globals.ts';

const noopSignal = new AbortController().signal;

const validSpec = {
  name: 'greet',
  description: 'Greets someone.',
  inputSchema: z.object({ name: z.string() }),
  execute: async ({ name }: { name: string }) => `Hello, ${name}!`,
};

test('returns false and warns (without throwing) when WebMCP is not supported', () => {
  withDocument(undefined, () => {
    withWarnSpy((calls) => {
      const result = registerTool(validSpec);
      assert.equal(result, false);
      assert.equal(calls.length, 1);
      assert.match(String(calls[0][0]), /greet/);
    });
  });
});

test('calls document.modelContext.registerTool and returns true when supported', () => {
  const registerCalls: unknown[][] = [];
  withDocument(
    { modelContext: { registerTool: (...args: unknown[]) => registerCalls.push(args) } },
    () => {
      const result = registerTool(validSpec);
      assert.equal(result, true);
      assert.equal(registerCalls.length, 1);
      const [registeredTool] = registerCalls[0] as [{ name: string; execute: unknown }];
      assert.equal(registeredTool.name, 'greet');
      assert.equal(typeof registeredTool.execute, 'function');
    },
  );
});

test('forwards options (signal, exposedTo) unchanged as the second argument', () => {
  const registerCalls: unknown[][] = [];
  withDocument(
    { modelContext: { registerTool: (...args: unknown[]) => registerCalls.push(args) } },
    () => {
      const options = { signal: noopSignal, exposedTo: ['https://example.com'] };
      registerTool(validSpec, options);
      assert.equal(registerCalls[0][1], options);
    },
  );
});

test('throws on an invalid spec even when WebMCP is unsupported (fails fast, never silently no-ops a bug)', () => {
  withDocument(undefined, () => {
    withWarnSpy((calls) => {
      assert.throws(
        () => registerTool({ ...validSpec, name: '' }),
        /name must be a non-empty string/,
      );
      assert.equal(calls.length, 0);
    });
  });
});

test('throws on an invalid spec when WebMCP IS supported, before ever calling the real registerTool', () => {
  const registerCalls: unknown[][] = [];
  withDocument(
    { modelContext: { registerTool: (...args: unknown[]) => registerCalls.push(args) } },
    () => {
      assert.throws(() => registerTool({ ...validSpec, description: '' }));
      assert.equal(registerCalls.length, 0);
    },
  );
});
