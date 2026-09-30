---
type: 'Task Contract'
title: 'Editor de texto visible con WebMCP'
description: 'Ejemplo local con ocho herramientas, revisiones optimistas, historial y guardado en el navegador.'
tags: ['webmcp', 'examples', 'testing']
task: text-editor-demo
intent: 'Integrar el editor probado en el navegador como ejemplo reproducible del repositorio.'
target: examples/text-editor/editor.ts
signature: 'async function expose<S extends z.ZodType>(name: string, description: string, schema: S, run: (input: z.infer<S>) => unknown, readOnly?: boolean): Promise<void>'
test_command: 'node --test tests_ts/text-editor.test.ts'
budget:
  cyclomatic_max: 15
  nesting_max: 4
  lines_max: 150
  params_max: 5
tests: 'tests_ts/text-editor.test.ts'
tests_sha256: 'dc125f4c766cee8058a9efc802aa24f99b298d0a1e59bd3d042641eba02abdc8'
touch_only: ['examples/text-editor/*', 'package.json', 'tsconfig.json', 'README.md']
deps_allowed: ['zod', '../../src_ts/index.ts']
forbids: ['network', 'llm', 'external-writes']
---

# Contract: editor de texto WebMCP

## Intent

Ejemplo basado en [registro asincrono](./audit-runtime-fixes.md) y sujeto al
[ciclo de validacion](../validacion.md).

## Interface

Ocho herramientas: editor_read, editor_write, editor_insert, editor_replace,
editor_find, editor_select, editor_undo y editor_redo. Las mutaciones y la
seleccion necesitan expectedRevision. Posiciones UTF-16 desde cero.

## Invariants

- Todas las herramientas actuan sobre el mismo documento visible.
- Una revision obsoleta falla antes de mutar el documento.
- Reemplazos literales preservan caracteres especiales de replacement.
- Deshacer y rehacer restauran el contenido; la revision siempre aumenta.
- Seleccionar o buscar no modifica contenido ni revision.
- Errores de rango o texto ausente no mutan el estado.
- Guardado local, sin operaciones externas; edicion manual sin WebMCP.

## Examples

- Hola Hola y reemplazo literal por $& -> $& $&.
- Revision 0 tras escribir revision 1 -> conflicto sin cambios.
- Emoji en posicion 6 -> rango UTF-16 [6, 8).

## Do / Don't

- DO: usar registerToolAsync y actualizar la interfaz desde los handlers.
- DON'T: simular llamadas WebMCP mediante inyeccion de DOM.

## Tests

Oraculo sellado nuevo en tests_ts/text-editor.test.ts; primero en rojo por
ausencia del ejemplo. Las pruebas anteriores permanecen intactas.

## Constraints

Sin dependencias nuevas. Limite de 200000 caracteres y 100 cambios deshacibles.
PARAR y reportar si hace falta modificar oraculos existentes o enviar datos a terceros.
