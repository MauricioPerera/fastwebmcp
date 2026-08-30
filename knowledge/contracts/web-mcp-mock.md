---
type: 'Task Contract'
title: 'Harness: mock de document.modelContext que invoca tools sin navegador real'
description: 'createWebMcpMock() da un document falso con modelContext.registerTool y un invokeTool() para probar tools de WebMCP en Node puro, sin panel de Chrome DevTools.'
tags: ['webmcp', 'testing', 'harness', 'core']

task: web-mcp-mock
intent: "Dar un document mockeado que registra tools y permite invocarlas directamente, para probar codigo que usa registerTool() sin navegador real."
target: src_ts/testing.ts
signature: "function createWebMcpMock(): WebMcpMock"
test_command: "node --test tests_ts/testing.test.ts"
budget:
  cyclomatic_max: 5
  nesting_max: 2
  lines_max: 30
  params_max: 1
tests: "tests_ts/testing.test.ts"
tests_sha256: "18f48324d310671edfa13d5e45758d74afeefc7413e3fd2c8da85a946da429c0"
touch_only: ['src_ts/testing.ts']
deps_allowed: []
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Harness de testing sin navegador real

## Intent
`DEFINITION.md` promete un "harness que invoca y verifica tools sin necesitar un
navegador real" como una de las dos pieles que consumen el core. Hasta ahora, cada
archivo de test de este propio proyecto mockeaba `document` a mano (y `withDocument` ya
se duplico una vez — ver la nota de refactor en
[register-tool.md](./register-tool.md)); un desarrollador externo que use `fastwebmcp`
para exponer SUS tools no tiene ninguna forma de probarlas sin Chrome con el origin
trial activo. `createWebMcpMock()` es esa pieza: un `document` falso apto para
`registerTool()` mas `invokeTool()`, que simula lo que haria un agente real.

## Interface
```
interface WebMcpMock {
  document: { modelContext: { registerTool: (tool: unknown, options?: unknown) => void } };
  registeredTools: Map<string, { tool: unknown; options: unknown }>;
  invokeTool: (
    name: string,
    input: unknown,
    context?: { signal: AbortSignal },
  ) => Promise<unknown>;
}

function createWebMcpMock(): WebMcpMock
```

## Invariants
- `mock.document` es un objeto valido para asignar a `globalThis.document`: tiene
  `modelContext.registerTool(tool, options)`, que guarda la tool por `tool.name` en
  `registeredTools` (sobrescribe si se registra dos veces el mismo nombre).
- `invokeTool(name, input, context?)` busca la tool registrada por `name` y llama a su
  `execute(input, context)` — el `execute` real que devuelve `defineTool()` (parsea el
  input con Zod antes de ejecutar el handler del usuario), no una reimplementacion.
- Si no hay ninguna tool registrada con ese `name`, `invokeTool` devuelve una promesa
  rechazada con un mensaje que incluye el nombre buscado — nunca `undefined` silencioso.
- Si `context` (o `context.signal`) no se provee, `invokeTool` usa un `AbortSignal` fresco
  (`new AbortController().signal`) por default, para que el handler del usuario siempre
  reciba una `context.signal` valida.
- Dos tools registradas bajo nombres distintos en el mismo mock no se pisan entre si.
- No hace red, `subprocess`/`child_process`, ni llamadas a un LLM.

## Examples
- `createWebMcpMock().document.modelContext.registerTool` -> function.
- Con `globalThis.document = mock.document`, `registerTool({ name: 'greet', ... })` y
  luego `await mock.invokeTool('greet', { name: 'Ana' })` -> `'Hello, Ana!'`.
- `mock.invokeTool('missing', {})` -> promesa rechazada, mensaje menciona `"missing"`.

## Do / Don't
- DO: delegar la ejecucion real al `execute` que devuelve `defineTool()` (via
  `registerTool()`) — este harness NO reimplementa validacion ni normalizacion.
- DO: mantenerlo puro respecto a `globalThis` — `createWebMcpMock()` en si mismo no toca
  `document`/`navigator`; quien lo use decide si lo instala (`globalThis.document =
  mock.document`) y cuando restaurarlo (ver `withDocument` en
  `tests_ts/mock-globals.ts`, patron reusable aunque vive fuera del paquete publicado).
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.

## Tests
(Los tests estan en `tests_ts/testing.test.ts` — escritos ANTES de la implementación;
oráculo congelado, sellado por `tests_sha256`. Incluyen un caso end-to-end real via
`registerTool()`, no solo unidad aislada del mock.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar `touch_only` o
  `forbids`.
