---
type: 'Task Contract'
title: 'Generador de anotaciones WebMCP Declarativas sobre un <form>'
description: 'Setea toolname/tooldescription/toolautosubmit/toolparamdescription sobre un form-like, validando nombre/descripcion como defineTool.'
tags: ['webmcp', 'declarative', 'core']

task: define-declarative-tool
intent: "Anotar un form con los atributos WebMCP Declarativos, validando en tiempo de definicion."
target: src_ts/define-declarative-tool.ts
signature: "function defineDeclarativeTool(form: DeclarativeFormElementLike, spec: DeclarativeToolSpec): void"
test_command: "node --test tests_ts/define-declarative-tool.test.ts"
budget:
  cyclomatic_max: 8
  nesting_max: 3
  lines_max: 35
  params_max: 2
tests: "tests_ts/define-declarative-tool.test.ts"
tests_sha256: "d6e547a09ddaa9b85dd6d482c584ce64e79564e35cf284ed5e65177e9124e307"
touch_only: ['src_ts/define-declarative-tool.ts']
deps_allowed: []
forbids: ['network', 'subprocess', 'llm']
---

# Contract: Generador de anotaciones WebMCP Declarativas sobre un `<form>`

## Intent
La API Declarativa de WebMCP (distinta de la Imperativa que ya tiene `defineTool`/
`registerTool`) anota un `<form>` existente con atributos en vez de registrar una
funcion. Verificado contra la fuente primaria — el spec normativo
(webmachinelearning.github.io/webmcp) marca la seccion Declarativa como TODO y remite
al explainer (`webmachinelearning/webmcp/blob/main/declarative-api-explainer.md`), que SI
fija los 4 atributos con su sintaxis exacta:

- `toolname="..."` — string, analogo a `name` de la API Imperativa.
- `tooldescription="..."` — string, analogo a `description`.
- `toolautosubmit` — booleano de sola-presencia (SIN valor, como `required`).
- `toolparamdescription="..."` — string, sobre cada control del form (`<input>`, etc.).

**Limite conocido, documentado a proposito:** el algoritmo que deriva el JSON Schema
completo desde el form (labels, `aria-description`, opciones de `<select>`) esta
explicitamente sin especificar todavia (`"The exact algorithms reducing a form...is
TBD"`, `"Chromium is implementing a loose version"`). Este contrato NO intenta derivar
ni validar ese JSON Schema — solo setea los 4 atributos fijados. Derivarlo seria
adivinar sobre un target que el propio spec dice que todavia se mueve.

## Interface
```
interface DeclarativeFieldSpec {
  name: string;
  description: string;
}

interface DeclarativeToolSpec {
  name: string;
  description: string;
  autoSubmit?: boolean;
  fields?: DeclarativeFieldSpec[];
}

interface DeclarativeFormElementLike {
  setAttribute(name: string, value: string): void;
  elements: Iterable<{ name?: string | null; setAttribute(name: string, value: string): void }>;
}

function defineDeclarativeTool(form: DeclarativeFormElementLike, spec: DeclarativeToolSpec): void
```

## Invariants
- Lanza sincronicamente, ANTES de tocar `form`, si `spec.name` o `spec.description` no
  son strings no vacios (trim) — mismo fail-fast que `defineTool` (ver
  [define-tool.md](./define-tool.md)). Ningun `setAttribute` se llama si la validacion
  falla.
- Si pasa la validacion: `form.setAttribute('toolname', spec.name)` y
  `form.setAttribute('tooldescription', spec.description)` siempre se llaman.
- `toolautosubmit` solo se setea (con valor `''`, presencia-only) si `spec.autoSubmit`
  es `true`; si es `false`/`undefined`, no se toca ese atributo.
- Por cada `field` en `spec.fields` (default `[]`): busca en `form.elements` el elemento
  cuyo `name` coincide; si lo encuentra, `setAttribute('toolparamdescription',
  field.description)`; si NO lo encuentra, lanza mencionando el nombre buscado.
- No hace red, `subprocess`/`child_process`, ni llamadas a un LLM.

## Examples
- `defineDeclarativeTool(form, { name: 'search_flights', description: 'Searches flights.' })`
  -> `form.toolname === 'search_flights'`, `form.tooldescription === 'Searches flights.'`.
- `{ ..., autoSubmit: true }` -> `form.toolautosubmit === ''`.
- `{ ..., fields: [{ name: 'make', description: "The vehicle's make." }] }` con un
  `<input name="make">` en el form -> ese input recibe `toolparamdescription`.
- `{ ..., fields: [{ name: 'no-existe', description: '...' }] }` -> lanza.

## Do / Don't
- DO: validar `name`/`description` ANTES de llamar cualquier `setAttribute`.
- DO: usar exactamente los 4 nombres de atributo fijados por el explainer — no inventar
  variantes.
- DON'T: intentar derivar o validar el JSON Schema resultante del form — esta TBD en el
  spec, documentado arriba.
- DON'T: agregar red, `subprocess`/`child_process`, ni ninguna llamada a un LLM.

## Tests
(Los tests estan en `tests_ts/define-declarative-tool.test.ts` — escritos ANTES de la
implementación; oráculo congelado, sellado por `tests_sha256`.)

## Constraints
- PARAR y reportar si el `intent` resulta imposible de cumplir sin violar `touch_only` o
  `forbids`.
