export interface RegisteredMockTool {
  tool: { name: string; execute: (rawInput: unknown, context: { signal: AbortSignal }) => Promise<unknown> };
  options: unknown;
}

export interface WebMcpMock {
  document: { modelContext: { registerTool: (tool: unknown, options?: unknown) => void } };
  registeredTools: Map<string, RegisteredMockTool>;
  invokeTool: (name: string, input: unknown, context?: { signal: AbortSignal }) => Promise<unknown>;
}

export function createWebMcpMock(): WebMcpMock {
  const registeredTools = new Map<string, RegisteredMockTool>();

  const document = {
    modelContext: {
      registerTool: (tool: unknown, options?: unknown) => {
        const named = tool as RegisteredMockTool['tool'];
        registeredTools.set(named.name, { tool: named, options });
      },
    },
  };

  const invokeTool = async (
    name: string,
    input: unknown,
    context?: { signal: AbortSignal },
  ): Promise<unknown> => {
    const entry = registeredTools.get(name);
    if (!entry) {
      throw new Error(`createWebMcpMock: no tool registered under the name "${name}"`);
    }
    const signal = context?.signal ?? new AbortController().signal;
    return entry.tool.execute(input, { signal });
  };

  return { document, registeredTools, invokeTool };
}
