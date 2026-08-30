import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsWebMcp } from '../src_ts/supports-webmcp.ts';

// WebMCP's registration API lives on `document.modelContext` (spec IDL:
// `partial interface Document { readonly attribute ModelContext modelContext; }`),
// NOT on `navigator`. Unlike `navigator`, Node has no built-in global `document`
// accessor, so plain assignment is safe here.
function withDocument(value: unknown, run: () => void): void {
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

test('returns true when document.modelContext is an object', () => {
  withDocument({ modelContext: {} }, () => {
    assert.equal(supportsWebMcp(), true);
  });
});

test('returns false when document.modelContext is undefined', () => {
  withDocument({}, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('returns false when document.modelContext is null', () => {
  withDocument({ modelContext: null }, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('returns false when document itself does not exist', () => {
  withDocument(undefined, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('returns false when document.modelContext is not an object (e.g. a string)', () => {
  withDocument({ modelContext: 'not-an-object' }, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('never throws even with a weird document shape', () => {
  withDocument('not-an-object', () => {
    assert.doesNotThrow(() => supportsWebMcp());
  });
});
