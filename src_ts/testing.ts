export interface RegisteredMockTool {
  tool: { name: string; execute: (rawInput: unknown, context: { signal: AbortSignal }) => Promise<unknown> };
  options: unknown;
}

export interface WebMcpMock {
  document: { modelContext: { registerTool: (tool: unknown, options?: unknown) => void } };
  registeredTools: Map<string, RegisteredMockTool>;
  invokeTool: (name: string, input: unknown, context?: { signal: AbortSignal }) => Promise<unknown>;
  hasTool: (name: string) => boolean;
  getTool: (name: string) => RegisteredMockTool | undefined;
  reset: () => void;
}

export function createWebMcpMock(): WebMcpMock {
  const registeredTools = new Map<string, RegisteredMockTool>();

  const document = {
    modelContext: {
      registerTool: (tool: unknown, options?: unknown) => {
        const named = tool as RegisteredMockTool['tool'];
        const signal = (options as { signal?: AbortSignal } | undefined)?.signal;
        if (signal?.aborted) {
          registeredTools.delete(named.name);
          return;
        }
        registeredTools.set(named.name, { tool: named, options });
        signal?.addEventListener('abort', () => {
          registeredTools.delete(named.name);
        });
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

  const hasTool = (name: string): boolean => registeredTools.has(name);

  const getTool = (name: string): RegisteredMockTool | undefined => registeredTools.get(name);

  const reset = (): void => {
    registeredTools.clear();
  };

  return { document, registeredTools, invokeTool, hasTool, getTool, reset };
}
