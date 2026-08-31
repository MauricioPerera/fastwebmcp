// Real smoke test: generates a real mcpwasm tool.js from the ACTUAL published
// `fastwebmcp` package, writes it to smoke/out/ (gitignored), and checks it compiles
// as valid JavaScript. Deterministic, no network -- matches every other automated
// check in this repo. It does NOT run the real mcpwasm CLI against it (that needs
// network + a third-party package at run time); see the README for how to do that
// manually, the same way CONTRACT-45 verified it for real.

import { z } from 'zod';
import { defineTool, toMcpwasmSkillSource } from 'fastwebmcp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const tool = defineTool({
  name: 'sum_numbers',
  description: 'Sum two numbers a and b.',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  execute: async ({ a, b }) => a + b, // browser-only, never auto-translated into the sandbox
});

const src = toMcpwasmSkillSource(tool, {
  handlerBody: 'return Number(args.a) + Number(args.b);',
});

// Real syntax check -- this is exactly what would be served as tool.js.
new Function(src);

mkdirSync('smoke/out', { recursive: true });
writeFileSync('smoke/out/sum_numbers.tool.js', src, 'utf-8');

const toolSha256 = createHash('sha256').update(src, 'utf-8').digest('hex');
console.log('[mcpwasm-bridge] wrote smoke/out/sum_numbers.tool.js');
console.log('[mcpwasm-bridge] tool_sha256:', toolSha256);
console.log('[mcpwasm-bridge] PASS (syntax-valid; see README for verifying against the real mcpwasm CLI)');
