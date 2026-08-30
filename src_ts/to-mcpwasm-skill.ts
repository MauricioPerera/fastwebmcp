import type { DefinedTool } from './define-tool.ts';

export interface McpwasmSkillOptions {
  handlerBody?: string;
}

export function toMcpwasmSkillSource(tool: DefinedTool, options?: McpwasmSkillOptions): string {
  const body =
    options?.handlerBody ??
    "throw new Error('TODO: implement for the mcpwasm QuickJS-wasm sandbox (no DOM, no fetch -- only host.fetchOrigin/host.memorySearch). See https://github.com/MauricioPerera/mcpwasm.');";
  const schemaText = JSON.stringify(tool.inputSchema, null, 2).split('\n').join('\n  ');

  return `registerTool({
  name: ${JSON.stringify(tool.name)},
  description: ${JSON.stringify(tool.description)},
  inputSchema: ${schemaText},
  handler(args) {
    ${body}
  }
});
`;
}
