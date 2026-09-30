import test from 'node:test';
import assert from 'node:assert/strict';

test('text editor tools preserve revisions, literal replacements and undo history', async () => {
  const registrations = new Map<string, { execute: (input: unknown, context: { signal: AbortSignal }) => Promise<any> }>();
  const elements = new Map<string, any>();
  for (const id of ['title', 'text', 'undo', 'redo', 'select-all', 'download', 'counts', 'saved', 'activity', 'tools', 'connection']) {
    elements.set('#' + id, { value: '', textContent: '', disabled: false, selectionStart: 0, selectionEnd: 0, children: [],
      addEventListener() {}, focus() {}, setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; },
      append(row: unknown) { this.children.push(row); }, prepend(row: unknown) { this.children.unshift(row); } });
  }
  const stored = new Map<string, string>();
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    querySelector: (id: string) => elements.get(id), createElement: () => ({ textContent: '', className: '' }),
    modelContext: { registerTool: async (tool: any) => { registrations.set(tool.name, tool); } },
  } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value),
  } });
  const invoke = (name: string, input: unknown) => {
    const tool = registrations.get(name);
    assert.ok(tool, `Missing tool ${name}`);
    return tool.execute(input, { signal: new AbortController().signal });
  };
  try {
    await import('../examples/text-editor/editor.ts');
    assert.equal(registrations.size, 8);
    assert.match(elements.get('#connection').textContent, /8 herramientas/);
    const empty = await invoke('editor_read', {});
    assert.equal(empty.text, '');
    const written = await invoke('editor_write', { title: 'Prueba', text: 'Hola Hola', expectedRevision: empty.revision });
    assert.equal(elements.get('#text').value, 'Hola Hola');
    await assert.rejects(invoke('editor_insert', { position: 0, text: 'incorrecto', expectedRevision: empty.revision }), /Conflicto/);
    assert.equal((await invoke('editor_read', {})).revision, written.revision);
    const replaced = await invoke('editor_replace', { search: 'Hola', replacement: '$&', all: true, expectedRevision: written.revision });
    assert.equal(replaced.replacements, 2);
    assert.equal(elements.get('#text').value, '$& $&');
    const inserted = await invoke('editor_insert', { position: replaced.characters, text: ' 😀', expectedRevision: replaced.revision });
    assert.equal(elements.get('#text').value, '$& $& 😀');
    const found = await invoke('editor_find', { search: '😀' });
    assert.deepEqual(found.ranges, [{ start: 6, end: 8 }]);
    const selection = await invoke('editor_select', { start: 6, end: 8, expectedRevision: inserted.revision });
    assert.equal(selection.text, '😀');
    assert.equal(elements.get('#text').selectionStart, 6);
    const undone = await invoke('editor_undo', { expectedRevision: inserted.revision });
    assert.equal(elements.get('#text').value, '$& $&');
    const redone = await invoke('editor_redo', { expectedRevision: undone.revision });
    assert.equal(elements.get('#text').value, '$& $& 😀');
    await assert.rejects(invoke('editor_replace', { search: 'absent', replacement: 'x', expectedRevision: redone.revision }), /no encontrado/);
    await assert.rejects(invoke('editor_select', { start: 8, end: 9, expectedRevision: redone.revision }), /inválido/);
    await assert.rejects(invoke('editor_insert', { position: 999, text: 'x', expectedRevision: redone.revision }), /fuera/);
    const restored = await invoke('editor_read', {});
    assert.equal(restored.revision, redone.revision);
    assert.equal(JSON.parse(stored.get('fastwebmcp-text-editor-v1')!).text, restored.text);
    assert.ok(elements.get('#activity').children.length > 0);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else Reflect.deleteProperty(globalThis, 'document');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
