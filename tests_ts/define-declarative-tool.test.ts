import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineDeclarativeTool } from '../src_ts/define-declarative-tool.ts';

function createFakeForm(elementNames: string[]) {
  const attributes = new Map<string, string>();
  const elementAttributes = new Map<string, Map<string, string>>();
  const elements = elementNames.map((name) => {
    const attrs = new Map<string, string>();
    elementAttributes.set(name, attrs);
    return {
      name,
      setAttribute(attrName: string, value: string) {
        attrs.set(attrName, value);
      },
    };
  });
  return {
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    elements,
    attributes,
    elementAttributes,
  };
}

test('sets toolname and tooldescription on the form', () => {
  const form = createFakeForm([]);
  defineDeclarativeTool(form, { name: 'search_flights', description: 'Searches flights.' });
  assert.equal(form.attributes.get('toolname'), 'search_flights');
  assert.equal(form.attributes.get('tooldescription'), 'Searches flights.');
});

test('does not set toolautosubmit when autoSubmit is omitted', () => {
  const form = createFakeForm([]);
  defineDeclarativeTool(form, { name: 'x', description: 'desc' });
  assert.equal(form.attributes.has('toolautosubmit'), false);
});

test('sets toolautosubmit (presence-only, empty string value) when autoSubmit is true', () => {
  const form = createFakeForm([]);
  defineDeclarativeTool(form, { name: 'x', description: 'desc', autoSubmit: true });
  assert.equal(form.attributes.get('toolautosubmit'), '');
});

test('sets toolparamdescription on the matching field by name', () => {
  const form = createFakeForm(['make', 'model']);
  defineDeclarativeTool(form, {
    name: 'x',
    description: 'desc',
    fields: [{ name: 'make', description: "The vehicle's make (i.e., BMW, Ford)." }],
  });
  assert.equal(form.elementAttributes.get('make')!.get('toolparamdescription'), "The vehicle's make (i.e., BMW, Ford).");
  assert.equal(form.elementAttributes.get('model')!.has('toolparamdescription'), false);
});

test('throws when a field name has no matching form control', () => {
  const form = createFakeForm(['make']);
  assert.throws(
    () =>
      defineDeclarativeTool(form, {
        name: 'x',
        description: 'desc',
        fields: [{ name: 'does-not-exist', description: 'desc' }],
      }),
    /no form control named "does-not-exist"/,
  );
});

test('throws when name is an empty string', () => {
  const form = createFakeForm([]);
  assert.throws(
    () => defineDeclarativeTool(form, { name: '', description: 'desc' }),
    /name must be a non-empty string/,
  );
});

test('throws when description is an empty string', () => {
  const form = createFakeForm([]);
  assert.throws(
    () => defineDeclarativeTool(form, { name: 'x', description: '' }),
    /description must be a non-empty string/,
  );
});

test('never calls setAttribute on the form for name/description before validating both', () => {
  const form = createFakeForm([]);
  assert.throws(() => defineDeclarativeTool(form, { name: '', description: '' }));
  assert.equal(form.attributes.size, 0);
});
