# CONTRACT-38 — Extraer el harness de testing — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-38-testing-harness.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 29 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 38 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 53 archivos) |
| `python scripts/validate_changelog.py` | ✅ | `0 error(es), 38 contrato(s) verificados` |
| `node --test "tests_ts/*.test.ts"` | ✅ verde 2× (25 tests c/u) | `fail 0` ambas |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `validate_test_commands.py` | ✅ | `supports-webmcp.md`, `register-tool.md`, `web-mcp-mock.md` los 3 en `PASS` |

## T1 — Extraer withDocument/withWarnSpy (refactor, sin CCDD nuevo)

`tests_ts/mock-globals.ts`: `withDocument`/`withWarnSpy` movidos verbatim desde
`supports-webmcp.test.ts` y `register-tool.test.ts` (el primero estaba duplicado
identico en ambos; el segundo solo vivia en `register-tool.test.ts`). Los dos archivos
pasan a importarlos. Verificado ANTES del reseal que las 11 assertions no cambiaron
(mismo comportamiento, solo cambia el `import`): 11/11 verde con el refactor aplicado.

`tests_sha256` re-sellado en `knowledge/contracts/supports-webmcp.md` (
`85209bad...` -> `49b4c9e0...`) y `knowledge/contracts/register-tool.md` (
`7fb0ac7a...` -> `83230b02...`), cada uno con una nota explícita en `## Intent` marcando
que es un refactor (extracción de helper compartido), no un cambio de comportamiento.

## T2 (CCDD: `web-mcp-mock`) — createWebMcpMock()

`src_ts/testing.ts`: `createWebMcpMock()` devuelve `{ document, registeredTools,
invokeTool }`. `document.modelContext.registerTool` guarda la tool por nombre;
`invokeTool(name, input, context?)` llama al `execute` REAL de la tool registrada (el que
devuelve `defineTool()`, con parseo Zod incluido) — no reimplementa nada. Sin `context`
provisto, usa un `AbortSignal` fresco por default.

Sin desvíos respecto al spec: 6/6 tests verdes en el primer intento, incluido el caso
end-to-end que registra una tool real vía `registerTool()` y la invoca a través del mock.

## Verificación final (independiente, re-ejecutada)

- `node --test "tests_ts/*.test.ts"`: 2/2 corridas verdes, 25/25 tests, los 4 archivos
  (`supports-webmcp`, `define-tool`, `register-tool`, `testing`) sin contaminación
  cruzada entre mocks.
- `npx tsc --noEmit`: exit 0.
- `validate_test_commands.py`: los tres contratos afectados (2 resellados + 1 nuevo) en
  `PASS`.
- Los cuatro gates de Nivel 1 relevantes re-corridos tras el cierre: los cuatro en verde.

## Estado del core

`fastwebmcp` ahora tiene el ciclo Imperativo completo (`supportsWebMcp` → `defineTool` →
`registerTool`) MAS el harness de testing (`createWebMcpMock`) que `DEFINITION.md`
promete como una de las dos pieles del proyecto. Un consumidor externo puede probar sus
propias tools sin Chrome ni el origin trial.

## Pendientes / ítems de seguimiento

- API Declarativa (anotaciones WebMCP sobre `<form>`) — capacidad objetivo de
  `DEFINITION.md` todavía sin contrato.
- Examples/demos contra Chrome DevTools — capacidad objetivo de `DEFINITION.md` todavía
  sin contrato (ahora que existe el harness, los ejemplos podrían dogfoodearlo en sus
  propios tests).
- Verificación end-to-end contra un `document.modelContext` real (Chrome con origin
  trial) — sigue diferida; ninguna pieza del core la tiene todavía.
