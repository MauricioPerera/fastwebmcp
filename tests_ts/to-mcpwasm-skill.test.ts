import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineTool } from '../src_ts/define-tool.ts';
import { toMcpwasmSkillSource } from '../src_ts/to-mcpwasm-skill.ts';

const sample = defineTool({
  name: 'sum_numbers',
  description: 'Sum two numbers a and b.',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ a, b }) => a + b,
});

test('emits a registerTool({...}) call with the tool name and description as JSON strings', () => {
  const src = toMcpwasmSkillSource(sample);
  assert.match(src, /^registerTool\(\{/);
  assert.match(src, /name:\s*"sum_numbers"/);
  assert.match(src, /description:\s*"Sum two numbers a and b\."/);
  assert.match(src, /\}\);\s*$/);
});

test('embeds the JSON Schema derived by defineTool(), not a re-declared one', () => {
  const src = toMcpwasmSkillSource(sample);
  const schemaText = src.slice(src.indexOf('inputSchema:') + 'inputSchema:'.length, src.indexOf('handler('));
  const parsed = JSON.parse(schemaText.slice(0, schemaText.lastIndexOf(',')));
  assert.deepEqual(parsed, sample.inputSchema);
});

test('defaults to a TODO stub handler mentioning the sandbox constraints', () => {
  const src = toMcpwasmSkillSource(sample);
  assert.match(src, /handler\(args\)\s*\{/);
  assert.match(src, /TODO/);
  assert.match(src, /mcpwasm/);
});

test('embeds a caller-provided handlerBody verbatim instead of the default stub', () => {
  const src = toMcpwasmSkillSource(sample, { handlerBody: 'return Number(args.a) + Number(args.b);' });
  assert.match(src, /return Number\(args\.a\) \+ Number\(args\.b\);/);
  assert.doesNotMatch(src, /TODO/);
});

test('output is syntactically valid JavaScript (compiles as a function body without throwing)', () => {
  const src = toMcpwasmSkillSource(sample, { handlerBody: 'return args.a + args.b;' });
  assert.doesNotThrow(() => new Function(src));
});

test('escapes special characters in description safely (quotes, backslash, newline)', () => {
  // The name field can no longer carry these characters -- defineTool (CONTRACT-47) now
  // rejects any name outside the WebMCP spec's [A-Za-z0-9_.-]{1,128} charset. The
  // description field has no such restriction, so the escaping property this test
  // guards (safe JS-string serialization of untrusted text) still lives there.
  const tricky = defineTool({
    name: 'weird_tool',
    description: 'Has a "quote", a backslash \\ and a\nnewline.',
    inputSchema: z.object({}),
    execute: async () => 'ok',
  });
  const src = toMcpwasmSkillSource(tricky);
  assert.doesNotThrow(() => new Function(src));
  const descMatch = src.match(/description:\s*(".*?[^\\]")/);
  assert.ok(descMatch);
  assert.equal(JSON.parse(descMatch[1]), 'Has a "quote", a backslash \\ and a\nnewline.');
});

test('handler is declared as a plain method (works for both sync and async handlerBody text)', () => {
  const src = toMcpwasmSkillSource(sample, { handlerBody: 'return await Promise.resolve(args.a + args.b);' });
  assert.match(src, /handler\(args\)\s*\{\s*return await Promise\.resolve/);
});
