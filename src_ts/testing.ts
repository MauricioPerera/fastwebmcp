import type { AgentSubmitEventLike } from './respond-to-agent-submit.ts';

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

// Installs mock.document on globalThis for the duration of fn() and restores the
// original property descriptor afterwards, so tests never leak globals. Mirrors
// withDocument in tests_ts/mock-globals.ts, but shipped in the published package.
export function withMockDocument<T>(mock: WebMcpMock, fn: () => T): T {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    value: mock.document,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  try {
    return fn();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'document', original);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  }
}

export interface MockAgentSubmitEvent {
  event: AgentSubmitEventLike;
  waitForResponse: () => Promise<unknown>;
}

// Builds an agent submit event for declarative forms (agentInvoked: true) that
// captures the promise passed to respondWith(); waitForResponse() awaits it.
export function createMockAgentSubmitEvent(): MockAgentSubmitEvent {
  let captured: Promise<unknown> | undefined;
  const event: AgentSubmitEventLike = {
    agentInvoked: true,
    respondWith(promise: Promise<unknown>) {
      captured = promise;
    },
  };
  return {
    event,
    waitForResponse: () => {
      if (!captured) {
        return Promise.reject(
          new Error('createMockAgentSubmitEvent: respondWith was never called'),
        );
      }
      return captured;
    },
  };
}
