---
type: 'Task Contract'
title: 'Deteccion de soporte WebMCP en runtime'
description: 'Funcion pura que detecta si navigator.modelContext existe en el navegador visitante.'
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
tests_sha256: "15622f9663dc997dc8ee706698d391362a2d0d0c2c4ab11acb42f57525aae09a"
touch_only: ['src_ts/supports-webmcp.ts']
deps_allowed: []
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Deteccion de soporte WebMCP en runtime

## Intent
WebMCP solo tiene origin trial (Chrome 149); la mayoria de navegadores visitantes no
va a tener `navigator.modelContext`. Toda pieza del core (builder, registro, API
declarativa) necesita saber esto ANTES de intentar registrar una tool, para poder
degradar a no-op + warning en vez de romper la pagina (ver
[DEFINITION.md](../../DEFINITION.md), seccion "no-op silencioso + warning").

## Interface
```
function supportsWebMcp(): boolean
```

## Invariants
- Nunca lanza una excepcion, sea cual sea la forma de `globalThis.navigator`.
- Devuelve `true` unicamente cuando `navigator.modelContext` existe y es un objeto
  (`typeof === 'object'`, no `null`).
- No tiene efectos secundarios (no muta `navigator`, no hace I/O).

## Examples
- `navigator = { modelContext: {} }` -> `true`
- `navigator = {}` -> `false`
- `navigator = { modelContext: null }` -> `false`
- `navigator` no existe (SSR) -> `false`
- `navigator = { modelContext: 'no-es-un-objeto' }` -> `false`

## Do / Don't
- DO: usar `typeof globalThis.navigator !== 'undefined'` para tolerar entornos SSR
  donde `navigator` no existe.
- DON'T: asumir que `navigator.modelContext` truthy implica que es un objeto (un
  string no vacio tambien es truthy).
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.

## Tests
(Los tests estan en `tests_ts/supports-webmcp.test.ts` — escritos ANTES de la
implementacion; oraculo congelado, sellado por `tests_sha256`.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar
  `touch_only` o `forbids`.
