---
type: 'Task Contract'
title: 'Adaptador imperativo WebMCP para un broker LSFA'
description: 'Define y registra tools que delegan captura, confirmacion y ejecucion a un broker LSFA inyectado sin exponer secretos al agente.'
tags: ['ccdd', 'webmcp', 'lsfa', 'security']

task: lsfa-tool
intent: "Exponer defineLsfaTool/registerLsfaTool con validacion estricta y autoridad exclusiva del broker."
target: src_ts/lsfa.ts
signature: "function defineLsfaTool<TSchema extends ZodType>(spec: LsfaToolSpec<TSchema>): DefinedTool"
test_command: "node --test tests_ts/lsfa.test.ts"
budget:
  cyclomatic_max: 10
  nesting_max: 3
  lines_max: 80
  params_max: 2
tests: "tests_ts/lsfa.test.ts"
tests_sha256: "b37b0f7084022803f3f69ba63da5e2d04be513593c669cbd8f8431cd29da1408"
touch_only: ['src_ts/lsfa.ts']
deps_allowed: ['zod', './define-tool.ts', './register-tool.ts']
forbids: ['network', 'subprocess', 'llm', 'secret-in-agent-schema', 'toolautosubmit']
---

# Contract: adaptador WebMCP para LSFA

## Intent

Implementar la frontera descrita en [integracion LSFA](../lsfa-integration.md), reutilizando
`defineTool` y `registerTool` en vez de duplicar la API imperativa.

## Interface

`defineLsfaTool(spec)` devuelve un `DefinedTool`; `registerLsfaTool(spec, options?)`
conserva el fallback y `exposedTo` de `registerTool`. El spec contiene `inputSchema`,
`intent` y un `LsfaBroker` inyectado. El broker recibe un envelope LSFA 0.2, el input ya
validado, `AbortSignal` y origin.

## Invariants

- Aplicar literalmente la frontera de autoridad de [integracion LSFA](../lsfa-integration.md).
- Rechazar recursivamente nombres y formatos de schema destinados a secretos.
- Aceptar solo resultados estrictos con los seis estados LSFA y sin propiedades extra.
- Sanitizar errores del broker; un abort previo no lo invoca.
- La presentacion es datos estructurados, sin HTML, y no puede mezclar profile con layout.

## Examples

- Un schema con `recipient` se define; uno con `password`, `api_key`, `pin` o `totp` falla.
- Un broker que devuelve `accepted` produce el mismo resumen validado.
- Sin `document.modelContext`, `registerLsfaTool` devuelve `false` y emite un warning.

## Do / Don't

- DO: reutilizar `defineTool` y `registerTool`.
- DON'T: implementar transporte, formulario LSFA o ejecutar la operacion en este modulo.

## Tests

Oraculo escrito primero en `tests_ts/lsfa.test.ts` y congelado por `tests_sha256`.

## Constraints

PARAR y reportar si hace falta exponer un secreto al agente, ejecutar sin broker o tocar el oraculo.
