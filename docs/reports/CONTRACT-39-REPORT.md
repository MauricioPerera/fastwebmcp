# CONTRACT-39 — API Declarativa de WebMCP: anotar un form + responder al submit — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-39-declarative-api.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 31 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 39 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 55 archivos) |
| `python scripts/validate_changelog.py` | ✅ | `0 error(es), 39 contrato(s) verificados` |
| `node --test "tests_ts/*.test.ts"` | ✅ verde 2× (39 tests c/u) | `fail 0` ambas |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `validate_test_commands.py` | ✅ | `define-declarative-tool.md` y `respond-to-agent-submit.md` en `PASS` |

## RECON (antes de escribir codigo)

El spec normativo (webmachinelearning.github.io/webmcp) marca la seccion Declarativa
como `TODO` y remite al explainer
(`webmachinelearning/webmcp/blob/main/declarative-api-explainer.md`), consultado
directamente. Confirmado con cita literal: `toolname`/`tooldescription`/
`toolparamdescription` son atributos con valor string; `toolautosubmit` es booleano de
sola-presencia (`<form toolautosubmit>`, sin `="..."`); `SubmitEvent` agrega
`readonly attribute boolean agentInvoked` y `undefined respondWith(Promise<any>
agentResponse)`. El propio explainer dice explicitamente que el algoritmo que deriva el
JSON Schema completo del form "is TBD" y que "Chromium is implementing a loose version"
— por eso ninguno de los dos contratos de esta vuelta lo toca.

## T1 (CCDD: `define-declarative-tool`)

`src_ts/define-declarative-tool.ts`: valida `name`/`description` ANTES de tocar el
`form` (mismo fail-fast que `defineTool`), setea `toolname`/`tooldescription` siempre,
`toolautosubmit` (valor `''`, presencia-only) solo si `autoSubmit` es `true`, y
`toolparamdescription` en cada control nombrado en `fields` — lanza si algun `field.name`
no matchea ningun control de `form.elements`.

Sin desvíos: 8/8 tests verdes en el primer intento de implementación.

## T2 (CCDD: `respond-to-agent-submit`)

`src_ts/respond-to-agent-submit.ts`: si `event.agentInvoked` es falso, no-op y devuelve
`false`. Si es verdadero, llama `event.respondWith(Promise.resolve().then(() =>
handler(event)))` y devuelve `true` — el `.then()` convierte un throw sincronico del
handler en un rechazo de la promesa, en vez de una excepcion no capturada.

**Bug encontrado y corregido en el oraculo (no en la implementación), antes de sellar:**
el test "the handler receives the event itself as its argument" era sincronico y
chequeaba una variable capturada ANTES de que el microtask del `.then()` hubiera corrido
— fallaba con `undefined` en vez del `event` esperado, aunque la implementación era
correcta. Se corrigió haciendo el test `async` y awaiteando
`event.respondWithCalls[0]` antes de la aserción. `tests_sha256` re-sellado con el hash
del test corregido (nunca se selló el hash del test con el bug).

## Verificación final (independiente, re-ejecutada)

- `node --test "tests_ts/*.test.ts"`: 2/2 corridas verdes, 39/39 tests, 6 archivos
  (`supports-webmcp`, `define-tool`, `register-tool`, `testing`,
  `define-declarative-tool`, `respond-to-agent-submit`) sin contaminación cruzada.
- `npx tsc --noEmit`: exit 0.
- `validate_test_commands.py`: ambos contratos nuevos en `PASS`.
- Los cuatro gates de Nivel 1 relevantes re-corridos tras el cierre: los cuatro en verde.

## Estado de DEFINITION.md

Con este contrato, las 5 capacidades objetivo listadas en `DEFINITION.md` tienen al
menos una pieza construida:
1. Builder tipado (Zod) Imperativo — `defineTool`/`registerTool` (CONTRACT-36/37).
2. Anotaciones WebMCP Declarativas — `defineDeclarativeTool`/`respondToAgentSubmit`
   (este contrato), acotado a lo que el spec fija (el JSON Schema derivado queda fuera,
   documentado como límite real, no evadido).
3. Detección de soporte — `supportsWebMcp` (CONTRACT-34/35).
4. Harness sin navegador real — `createWebMcpMock` (CONTRACT-38).
5. Demos ejecutables contra Chrome DevTools — todavía sin contrato.

## Pendientes / ítems de seguimiento

- Demos/examples verificados contra el panel WebMCP de Chrome DevTools — única capacidad
  de `DEFINITION.md` sin ningún contrato todavía.
- Derivación/validación del JSON Schema desde un form Declarativo — bloqueado hasta que
  el spec upstream fije el algoritmo (`is TBD`); no es deuda de este proyecto.
- `createWebMcpMock` (CONTRACT-38) todavía no tiene un equivalente para probar el flujo
  Declarativo (invocar un form anotado como lo haria un agente) — candidato a contrato
  futuro si se necesita antes de las demos.
