// Real smoke test: registers a tool with the ACTUAL published `fastwebmcp` package
// (installed via package.json's "fastwebmcp": "^0.2.0", not the monorepo's src_ts/)
// against createWebMcpMock(), then invokes it the way a real agent would. No browser
// needed. Exits non-zero on any failure so this is CI-friendly (no network, no
// third-party package other than fastwebmcp/zod themselves).

import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineTool, registerTool, createWebMcpMock } from 'fastwebmcp';

const mock = createWebMcpMock();
globalThis.document = mock.document;

const registered = registerTool({
  name: 'add_todo',
  description: 'Add a todo item to the list.',
  inputSchema: z.object({ text: z.string().min(1) }),
  execute: async ({ text }) => `Added: ${text}`,
});

// The mock's document.modelContext looks like a real one to supportsWebMcp(), so this
// should be true -- if it's false, either the mock or registerTool() itself regressed.
assert.equal(registered, true, 'registerTool() did not think the mock document was supported');

const result = await mock.invokeTool('add_todo', { text: 'Buy milk' });
assert.equal(result, 'Added: Buy milk');
console.log('[mock-smoke] invokeTool("add_todo", { text: "Buy milk" }) ->', JSON.stringify(result));

// Zod validation must still reject bad input -- prove the wrapped execute really
// parses, not just passes raw args through.
await assert.rejects(
  () => mock.invokeTool('add_todo', { text: '' }),
  /too_small|String must contain|min|Invalid/i,
);
console.log('[mock-smoke] invokeTool("add_todo", { text: "" }) correctly rejected by Zod');

// defineTool()'s own fail-fast validation, exercised through the real package too.
assert.throws(() => defineTool({ name: '', description: 'x', inputSchema: z.object({}), execute: async () => 'x' }));
console.log('[mock-smoke] defineTool() with an empty name threw as expected');

console.log('[mock-smoke] PASS');
