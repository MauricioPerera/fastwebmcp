---
type: 'Task Contract'
title: 'Deteccion de soporte WebMCP en runtime'
description: 'Funcion pura que detecta si document.modelContext existe en el navegador visitante.'
tags: ['webmcp', 'feature-detection', 'core']

task: supports-webmcp
intent: "Detectar si el navegador visitante soporta WebMCP sin lanzar nunca."
target: src_ts/supports-webmcp.ts
signature: "function supportsWebMcp(): boolean"
test_command: "node --test tests_ts/supports-webmcp.test.ts"
budget:
  cyclomatic_max: 4
  nesting_max: 2
  lines_max: 15
  params_max: 1
tests: "tests_ts/supports-webmcp.test.ts"
tests_sha256: "49b4c9e0bc6eaa5ee0de563ed5dc380330a83c600c0fda4b53fe453a1a926b73"
touch_only: ['src_ts/supports-webmcp.ts']
deps_allowed: []
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Deteccion de soporte WebMCP en runtime

## Intent
WebMCP solo tiene origin trial (Chrome 149); la mayoria de navegadores visitantes no
va a tener `document.modelContext`. Toda pieza del core (builder, registro, API
declarativa) necesita saber esto ANTES de intentar registrar una tool, para poder
degradar a no-op + warning en vez de romper la pagina (ver
[DEFINITION.md](../../DEFINITION.md), seccion "no-op silencioso + warning").

**Correccion (post-CONTRACT-34):** la version original de este contrato asumia
`navigator.modelContext`, tomado de fuentes secundarias. El spec oficial
(webmachinelearning.github.io/webmcp) y la documentacion de Chrome confirman que la
API vive en `document.modelContext` (IDL: `partial interface Document { readonly
attribute ModelContext modelContext; }`), no en `Navigator`. Corregido antes de
construir `defineTool()` encima.

**Refactor (CONTRACT-38):** el helper `withDocument` del oraculo se extrajo a
`tests_ts/mock-globals.ts` (estaba duplicado, verbatim, en `register-tool.test.ts`).
Mismos 6 casos, mismas aserciones — solo cambio el `import`. `tests_sha256` re-sellado
en consecuencia.

## Interface
```
function supportsWebMcp(): boolean
```

## Invariants
- Nunca lanza una excepcion, sea cual sea la forma de `globalThis.document`.
- Devuelve `true` unicamente cuando `document.modelContext` existe y es un objeto
  (`typeof === 'object'`, no `null`).
- No tiene efectos secundarios (no muta `document`, no hace I/O).

## Examples
- `document = { modelContext: {} }` -> `true`
- `document = {}` -> `false`
- `document = { modelContext: null }` -> `false`
- `document` no existe (SSR) -> `false`
- `document = { modelContext: 'no-es-un-objeto' }` -> `false`

## Do / Don't
- DO: usar `typeof globalThis.document !== 'undefined'` para tolerar entornos SSR
  donde `document` no existe.
- DON'T: asumir que `document.modelContext` truthy implica que es un objeto (un
  string no vacio tambien es truthy).
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.
- DON'T: chequear `navigator.modelContext` — no es donde vive la API real.

## Tests
(Los tests estan en `tests_ts/supports-webmcp.test.ts` — escritos ANTES de la
implementacion; oraculo congelado, sellado por `tests_sha256`.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar
  `touch_only` o `forbids`.
