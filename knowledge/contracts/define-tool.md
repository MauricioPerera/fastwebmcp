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
tests_sha256: "97bfad186b1daf421d299fe62837ef7142621d724adc65a0d3187924fd64aaa1"
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
interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

interface ToolSpec<TSchema extends ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  execute: (input: z.infer<TSchema>, context: { signal: AbortSignal }) => unknown;
  annotations?: ToolAnnotations;
  title?: string;
}

interface DefinedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
  execute: (rawInput: unknown, context: { signal: AbortSignal }) => Promise<unknown>;
  annotations?: ToolAnnotations;
  title?: string;
}

function defineTool<TSchema extends ZodType>(spec: ToolSpec<TSchema>): DefinedTool
```

## Invariants
- Lanza sincronicamente (al momento de definir, no de ejecutar) si `name` no es un string
  no vacio (trim), si `description` no es un string no vacio (trim), o si `execute` no es
  una funcion. Fail-fast en tiempo de definicion, igual que FastMCP al decorar una funcion
  con firma invalida.
- Lanza si `name` no cumple el charset/longitud que exige el spec real de WebMCP
  (`webmachinelearning.github.io/webmcp`, verificado con fuente primaria, CONTRACT-47):
  1-128 caracteres, solo `[A-Za-z0-9_.-]`. Antes de CONTRACT-47 esto no se validaba —
  un nombre invalido pasaba `defineTool()` sin error y fallaba despues, sin mensaje claro,
  al llegar al `document.modelContext.registerTool()` real del navegador.
- Si `name` supera 30 caracteres o `description` supera 500, emite `console.warn` (NO
  lanza) citando el limite recomendado por la guia de seguridad de Chrome
  (`developer.chrome.com/docs/ai/webmcp/secure-tools`) para resultados confiables del
  agente. Son recomendaciones, no reglas del spec — por eso avisan en vez de romper.
- Si `spec.annotations` esta presente, se copia tal cual al `DefinedTool` devuelto (mismo
  shape `ToolAnnotations` que espera `document.modelContext.registerTool()`). Si esta
  ausente, la clave `annotations` NO aparece en el objeto devuelto (no se manda `undefined`
  ni un objeto vacio al navegador).
- Si `spec.title` esta presente, se copia tal cual (mismo campo opcional `title` que define
  `ModelContextTool` en el spec real, verificado con fuente primaria, CONTRACT-48). Si esta
  ausente, la clave `title` NO aparece en el objeto devuelto. Sin validacion de formato --
  el spec no le impone ninguna al `title` (a diferencia de `name`).
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
- `defineTool({ name: 'my tool!', ... })` -> lanza `Error: defineTool: name must be 1-128
  characters of letters, numbers, "_", "-", or "."`
- `defineTool({ ..., execute: 'not-a-function' })` -> lanza `Error: defineTool: execute must be a function`
- `defineTool({ name: 'get_price', ..., annotations: { readOnlyHint: true } })` -> el objeto
  devuelto incluye `annotations: { readOnlyHint: true }`.
- `defineTool({ name: 'get_price', ..., title: 'Get Price' })` -> el objeto devuelto incluye
  `title: 'Get Price'`.
- `defineTool({ name: 'a'.repeat(35), ... })` -> no lanza, pero emite `console.warn` con
  "tool name is 35 characters; Chrome recommends <=30...".
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
