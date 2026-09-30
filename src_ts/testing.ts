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
  const removeAbortListeners = new Map<string, () => void>();

  const document = {
    modelContext: {
      registerTool: (tool: unknown, options?: unknown) => {
        const named = tool as RegisteredMockTool['tool'];
        const signal = (options as { signal?: AbortSignal } | undefined)?.signal;
        if (signal?.aborted) {
          return;
        }
        removeAbortListeners.get(named.name)?.();
        removeAbortListeners.delete(named.name);
        const entry = { tool: named, options };
        registeredTools.set(named.name, entry);
        if (signal) {
          const onAbort = () => {
            if (registeredTools.get(named.name) !== entry) return;
            registeredTools.delete(named.name);
            removeAbortListeners.delete(named.name);
          };
          signal.addEventListener('abort', onAbort, { once: true });
          removeAbortListeners.set(named.name, () => signal.removeEventListener('abort', onAbort));
        }
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
    for (const remove of removeAbortListeners.values()) remove();
    removeAbortListeners.clear();
    registeredTools.clear();
  };

  return { document, registeredTools, invokeTool, hasTool, getTool, reset };
}

// Installs mock.document on globalThis for the duration of fn() and restores the
// original property descriptor after synchronous completion or Promise settlement.
// Async scopes must be serial, or nested and awaited: document is a shared global.
export function withMockDocument<T>(mock: WebMcpMock, fn: () => T): T {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    value: mock.document,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  const restore = () => {
    if (original) {
      Object.defineProperty(globalThis, 'document', original);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  };
  try {
    const result = fn();
    if (result != null && (typeof result === 'object' || typeof result === 'function') &&
        typeof (result as { then?: unknown }).then === 'function') {
      return Promise.resolve(result).finally(restore) as T;
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
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
