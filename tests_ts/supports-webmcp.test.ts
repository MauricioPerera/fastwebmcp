import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsWebMcp } from '../src_ts/supports-webmcp.ts';

// Node's global `navigator` is a getter-only accessor (since Node 21): plain
// assignment throws `TypeError: Cannot set property navigator of ... which has
// only a getter`. Object.defineProperty with configurable:true is required to
// stub and restore it around each case.
function withNavigator(value: unknown, run: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true,
  });
  try {
    run();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'navigator', original);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
}

test('returns true when navigator.modelContext is an object', () => {
  withNavigator({ modelContext: {} }, () => {
    assert.equal(supportsWebMcp(), true);
  });
});

test('returns false when navigator.modelContext is undefined', () => {
  withNavigator({}, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('returns false when navigator.modelContext is null', () => {
  withNavigator({ modelContext: null }, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('returns false when navigator itself does not exist', () => {
  withNavigator(undefined, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('returns false when navigator.modelContext is not an object (e.g. a string)', () => {
  withNavigator({ modelContext: 'not-an-object' }, () => {
    assert.equal(supportsWebMcp(), false);
  });
});

test('never throws even with a weird navigator shape', () => {
  withNavigator('not-an-object', () => {
    assert.doesNotThrow(() => supportsWebMcp());
  });
});
