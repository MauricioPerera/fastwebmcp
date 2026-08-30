---
type: 'Task Contract'
title: 'Builder tipado (Zod) para tools WebMCP Imperativas'
description: 'Normaliza name/description/inputSchema(Zod)/execute a la forma que espera document.modelContext.registerTool(), con validacion runtime del input.'
tags: ['webmcp', 'builder', 'zod', 'core']

task: define-tool
intent: "Normalizar una definicion de tool con schema Zod a la forma que espera registerTool, validando el input en runtime."
target: src_ts/define-tool.ts
signature: "function defineTool<TSchema extends ZodType>(spec: ToolSpec<TSchema>): DefinedTool"
test_command: "node --test tests_ts/define-tool.test.ts"
budget:
  cyclomatic_max: 6
  nesting_max: 2
  lines_max: 40
  params_max: 1
tests: "tests_ts/define-tool.test.ts"
tests_sha256: "1d18409aa83eff93f6cb49c988b9bd24be95e3f59636a3efec4448870d8c30b1"
touch_only: ['src_ts/define-tool.ts']
deps_allowed: ['zod']
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Builder tipado (Zod) para tools WebMCP Imperativas

## Intent
La API Imperativa cruda de WebMCP (`document.modelContext.registerTool(tool)`) exige un
`inputSchema` en JSON Schema escrito a mano y no valida el input en runtime antes de
llamar a `execute` — el desarrollador tiene que hacerlo el mismo o confiar ciegamente en
el agente. `defineTool()` es el analogo de FastMCP a esto: se declara el schema una vez
con Zod, se deriva el JSON Schema automaticamente (`z.toJSONSchema`, nativo de Zod 4, sin
dependencia extra) y el `execute` que se expone valida el input ANTES de invocar el
handler del usuario. Ver [DEFINITION.md](../../DEFINITION.md), "Builder tipado (Zod)".

Verificado contra la forma real de la API (no una fuente secundaria, tras el incidente de
[supports-webmcp.md](./supports-webmcp.md)): `developer.chrome.com/docs/ai/webmcp/imperative-api`,
campo `inputSchema` = JSON Schema con `type`/`properties`/`required`, `execute` recibe
`(inputs, { signal })` y devuelve `string | result`.

## Interface
```
interface ToolSpec<TSchema extends ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>, context: { signal: AbortSignal }) => unknown;
}

interface DefinedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  execute: (rawInput: unknown, context: { signal: AbortSignal }) => Promise<unknown>;
}

function defineTool<TSchema extends ZodType>(spec: ToolSpec<TSchema>): DefinedTool
```

## Invariants
- Lanza sincronicamente (al momento de definir, no de ejecutar) si `name` no es un string
  no vacio (trim), si `description` no es un string no vacio (trim), o si `execute` no es
  una funcion. Fail-fast en tiempo de definicion, igual que FastMCP al decorar una funcion
  con firma invalida.
- El `inputSchema` devuelto es siempre el resultado de `z.toJSONSchema(spec.inputSchema)`
  — nunca el objeto Zod crudo.
- El `execute` devuelto SIEMPRE parsea (`spec.inputSchema.parse(rawInput)`) antes de llamar
  al `execute` del usuario; si el parseo falla, la promesa devuelta rechaza con el error de
  Zod (no lo silencia ni lo transforma).
- El `context` (`{ signal }`) se reenvia sin modificar al `execute` del usuario.
- No registra nada en `document.modelContext` — eso es responsabilidad de otra pieza
  (fuera de este contrato).

## Examples
- `defineTool({ name: 'toggle_layer', description: '...', inputSchema: z.object({ layer: z.enum([...]) }), execute: ... })`
  -> `{ name: 'toggle_layer', description: '...', inputSchema: <JSON Schema>, execute: <fn> }`
- `defineTool({ name: '', ... })` -> lanza `Error: defineTool: name must be a non-empty string`
- `defineTool({ ..., execute: 'not-a-function' })` -> lanza `Error: defineTool: execute must be a function`
- `tool.execute({ name: 42 }, { signal })` (donde el schema espera `string`) -> promesa
  rechazada con el `ZodError` del parseo.

## Do / Don't
- DO: usar `z.toJSONSchema` (nativo de Zod 4, ya en `dependencies`) para la conversion —
  no agregar `zod-to-json-schema` ni ninguna otra dependencia.
- DO: parsear el input ANTES de invocar el handler del usuario, para que el handler reciba
  siempre datos ya validados y tipados (`z.infer<TSchema>`), nunca `unknown` crudo.
- DON'T: llamar a `document.modelContext.registerTool` desde esta funcion — este contrato
  es puro (define, no registra).
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.

## Tests
(Los tests estan en `tests_ts/define-tool.test.ts` — escritos ANTES de la implementacion;
oraculo congelado, sellado por `tests_sha256`.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar `touch_only` o
  `forbids`.
