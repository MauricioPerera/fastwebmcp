---
type: 'Task Contract'
title: 'Registro seguro de una tool WebMCP con fallback no-op'
description: 'Valida y normaliza un ToolSpec con defineTool, y lo registra en document.modelContext.registerTool solo si supportsWebMcp() es true; si no, no-op + warning.'
tags: ['webmcp', 'builder', 'core']

task: register-tool
intent: "Registrar una tool en document.modelContext si WebMCP esta soportado; si no, no-op con warning, sin romper la pagina."
target: src_ts/register-tool.ts
signature: "function registerTool<TSchema extends ZodType>(spec: ToolSpec<TSchema>, options?: RegisterToolOptions): boolean"
test_command: "node --test tests_ts/register-tool.test.ts"
budget:
  cyclomatic_max: 4
  nesting_max: 2
  lines_max: 25
  params_max: 2
tests: "tests_ts/register-tool.test.ts"
tests_sha256: "83230b020903de6cffac5bfd7de32cfc2ad5bace90647477c7bf53dbbdb63ef5"
touch_only: ['src_ts/register-tool.ts']
deps_allowed: ['zod']
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Registro seguro de una tool WebMCP con fallback no-op

## Intent
Cierra el ciclo de la API Imperativa acordado en
[DEFINITION.md](../../DEFINITION.md): `defineTool()` ([contrato](./define-tool.md)) valida
y normaliza, `supportsWebMcp()` ([contrato](./supports-webmcp.md)) detecta soporte, y
`registerTool()` los une — es el unico punto de entrada que un consumidor de la libreria
llama para exponer una tool, análogo a `@mcp.tool()` de FastMCP. Si el navegador visitante
no soporta WebMCP (la mayoria hoy, con solo origin trial en Chrome 149), la pagina no se
rompe: no-op + `console.warn`, según lo cerrado en DEFINITION.md.

**Refactor (CONTRACT-38):** `withDocument`/`withWarnSpy` del oraculo se extrajeron a
`tests_ts/mock-globals.ts` (estaban duplicados/vivian solo aca). Mismos 5 casos, mismas
aserciones — solo cambio el `import`. `tests_sha256` re-sellado en consecuencia.

## Interface
```
interface RegisterToolOptions {
  signal?: AbortSignal;   // para desregistrar la tool
  exposedTo?: string[];   // origenes seguros para acceso cross-origin
}

function registerTool<TSchema extends ZodType>(
  spec: ToolSpec<TSchema>,
  options?: RegisterToolOptions,
): boolean
```

## Invariants
- La validación del `spec` (vía `defineTool`, que lanza sincrónicamente ante un spec
  inválido) ocurre SIEMPRE, sin importar si `supportsWebMcp()` es `true` o `false` — un
  spec roto es un bug del caller, no algo que el fallback deba esconder silenciosamente.
- Si `supportsWebMcp()` es `false`: no llama a ningún `document.modelContext`, emite
  exactamente un `console.warn` que menciona el `name` de la tool, y devuelve `false`.
  Nunca lanza por falta de soporte.
- Si `supportsWebMcp()` es `true`: llama a `document.modelContext.registerTool(tool,
  options)` con el `tool` normalizado por `defineTool` y el `options` reenviado sin
  modificar (incluso si es `undefined`), y devuelve `true`.
- No hace red, `subprocess`/`child_process`, ni llamadas a un LLM.

## Examples
- Sin `document.modelContext` -> `registerTool(spec)` devuelve `false`, un `console.warn`
  mencionando `spec.name`, sin lanzar.
- Con `document.modelContext.registerTool` mockeado -> se invoca una vez con
  `(defineTool(spec), options)`, devuelve `true`.
- `spec.name === ''` -> lanza `Error: defineTool: name must be a non-empty string`, tanto
  con soporte como sin soporte (nunca se llega a chequear `supportsWebMcp`).

## Do / Don't
- DO: usar `defineTool()` y `supportsWebMcp()` ya existentes — no reimplementar
  normalización ni detección de soporte acá.
- DO: reenviar `options` tal cual (incluido `undefined`) a la llamada real.
- DON'T: envolver la llamada a `document.modelContext.registerTool` en un `try/catch`
  que trague errores del navegador — eso no es fallback de soporte, es ocultar un fallo
  real.
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.

## Tests
(Los tests estan en `tests_ts/register-tool.test.ts` — escritos ANTES de la
implementación; oráculo congelado, sellado por `tests_sha256`.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar `touch_only` o
  `forbids`.
