import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsWebMcp } from '../src_ts/supports-webmcp.ts';
import { withDocument } from './mock-globals.ts';

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
