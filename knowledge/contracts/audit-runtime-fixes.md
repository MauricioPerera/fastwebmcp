---
type: 'Task Contract'
title: 'Correcciones de la auditoria del runtime FastWebMCP'
description: 'Corrige registro asincrono, reconfiguracion declarativa, scopes de pruebas y normalizacion LSFA sin modificar los oraculos existentes.'
tags: ['webmcp', 'security', 'testing', 'audit']
task: audit-runtime-fixes
intent: "Corregir los seis fallos reproducidos en el runtime de FastWebMCP."
target: src_ts/register-tool.ts
signature: "function registerToolAsync<TSchema extends ZodType>(spec: ToolSpec<TSchema>, options?: RegisterToolOptions): Promise<boolean>"
test_command: "node --test tests_ts/audit-regressions.test.ts"
budget:
  cyclomatic_max: 12
  nesting_max: 4
  lines_max: 100
  params_max: 3
tests: "tests_ts/audit-regressions.test.ts"
tests_sha256: "fcdf3679b1275a6482253a54d33e6874887e9c8095a15bcba4b8511ebb256f70"
touch_only: ['src_ts/register-tool.ts', 'src_ts/index.ts', 'src_ts/define-declarative-tool.ts', 'src_ts/testing.ts', 'src_ts/lsfa.ts', 'README.md']
deps_allowed: ['zod', './define-tool.ts', './supports-webmcp.ts', './register-tool.ts']
forbids: ['network', 'subprocess', 'llm', 'real-authorization']
---

# Contract: correcciones del runtime auditado

## Intent

Corregir las reproducciones preservando la [frontera LSFA](../lsfa-integration.md)
y el [ciclo de validacion](../validacion.md). Este contrato amplia
[registro](./register-tool.md), [formularios](./define-declarative-tool.md) y
[testing](./web-mcp-mock.md). Sustituye expresamente la regla antigua de no tocar
el atributo cuando autoSubmit=false; los oraculos anteriores permanecen intactos.

## Interface

`registerToolAsync(spec, options?): Promise<boolean>` y
`registerLsfaToolAsync(spec, options?): Promise<boolean>` esperan al navegador.
Las variantes sincronas conservan boolean como indicacion de dispatch y avisan
si falla una promesa nativa. `withMockDocument` preserva el tipo de retorno
sincrono o asincrono. `removeAttribute` es opcional en form-like, pero obligatorio
para solicitar autoSubmit=false.

## Invariants

- Registro asincrono propaga el error original; ausencia de soporte devuelve false.
- La variante sincrona maneja rechazos de registro con warning sin ocultar throws sincronicos.
- autoSubmit=false retira el atributo o falla antes de mutar si no hay removeAttribute.
- Un scope espera su promesa y restaura el descriptor al resolver o rechazar.
- Reset/reemplazo del mock retira listeners; una senal antigua no elimina otra tool.
- LSFA parsea una sola vez y distingue tokens sensibles de substrings ordinarios.
- Se documenta que scopes globales asincronos deben usarse en serie o anidados con await.

## Examples

- Registro nativo rechazado -> registerToolAsync rechaza con el mismo error.
- Formulario con toolautosubmit y autoSubmit=false -> atributo ausente.
- Entrada count=1 con overwrite(+1) -> broker recibe 2 por todas las variantes.

## Do / Don't

- DO: compartir el dispatch de DefinedTool sin volver a parsear datos LSFA.
- DON'T: modificar tests sellados preexistentes ni implementar autoridad del broker.

## Tests

Oraculo nuevo en tests_ts/audit-regressions.test.ts, escrito y ejecutado en rojo
antes de modificar fuentes; sello en frontmatter.

## Constraints

Respetar touch_only para fuentes; contratos, indice y reportes son artefactos de
coordinacion. No publicar ni ejecutar operaciones reales LSFA.
PARAR y reportar si la solucion requiere modificar un oraculo preexistente.
