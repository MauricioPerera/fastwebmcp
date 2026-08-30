// Shared test-only helpers to stub globalThis properties safely (save/restore the
// original property descriptor) and to spy on console.warn. Extracted after the same
// withDocument body appeared verbatim in supports-webmcp.test.ts and
// register-tool.test.ts (CONTRACT-38). Not part of the published package (src_ts/):
// this is oracle-supporting test infrastructure, not product code.

export function withDocument(value: unknown, run: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  (globalThis as { document?: unknown }).document = value;
  try {
    run();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'document', original);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  }
}

export function withWarnSpy(run: (calls: unknown[][]) => void): void {
  const calls: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };
  try {
    run(calls);
  } finally {
    console.warn = original;
  }
}
