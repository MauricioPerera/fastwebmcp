import type { ZodType, z } from 'zod';

export interface ToolSpec<TSchema extends ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>, context: { signal: AbortSignal }) => unknown;
}

export interface DefinedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (rawInput: unknown, context: { signal: AbortSignal }) => Promise<unknown>;
}

export function defineTool<TSchema extends ZodType>(spec: ToolSpec<TSchema>): DefinedTool {
  if (typeof spec.name !== 'string' || spec.name.trim() === '') {
    throw new Error('defineTool: name must be a non-empty string');
  }
  if (typeof spec.description !== 'string' || spec.description.trim() === '') {
    throw new Error('defineTool: description must be a non-empty string');
  }
  if (typeof spec.execute !== 'function') {
    throw new Error('defineTool: execute must be a function');
  }

  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema.toJSONSchema() as Record<string, unknown>,
    execute: async (rawInput, context) => {
      const parsed = spec.inputSchema.parse(rawInput);
      return spec.execute(parsed, context);
    },
  };
}
