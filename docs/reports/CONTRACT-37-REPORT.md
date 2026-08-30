# CONTRACT-37 — Registro seguro de una tool WebMCP con fallback no-op — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-37-register-tool.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 28 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 37 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 52 archivos) |
| `python scripts/validate_changelog.py` | ✅ | `0 error(es), 37 contrato(s) verificados` |
| `node --test tests_ts/register-tool.test.ts` | ✅ verde 2× (5 tests c/u) | `fail 0` ambas |
| `node --test "tests_ts/*.test.ts"` | ✅ | 19/19, sin contaminación cruzada entre mocks |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `validate_test_commands.py` | ✅ | `PASS knowledge/contracts\register-tool.md` |

## T1 (CCDD: `register-tool`)

`src_ts/register-tool.ts`: `registerTool(spec, options?)` llama primero a `defineTool(spec)`
— validación siempre activa, con o sin soporte del navegador. Si `supportsWebMcp()` es
`false`, emite `console.warn` mencionando `tool.name` y devuelve `false` sin tocar
`document`. Si es `true`, llama a `document.modelContext.registerTool(tool, options)` y
devuelve `true`. `options` (`signal`/`exposedTo`) se reenvía sin modificar, incluido
`undefined`.

Sin desvíos respecto al spec: 5/5 tests verdes en el primer intento de implementación.

## Verificación final (independiente, re-ejecutada)

- `node --test tests_ts/register-tool.test.ts`: 2/2 corridas verdes.
- `node --test "tests_ts/*.test.ts"`: 19/19 (los tres archivos: `supports-webmcp`,
  `define-tool`, `register-tool`), confirma que los mocks de `document`/`navigator` de
  cada archivo no se pisan entre si (cada `with*` restaura el descriptor original en un
  `finally`).
- `npx tsc --noEmit`: exit 0.
- Los cuatro gates de Nivel 1 relevantes re-corridos tras el cierre: los cuatro en verde.

## Estado del core imperativo

Con este contrato, el ciclo completo de la API Imperativa queda cerrado:
`supportsWebMcp()` (detección) → `defineTool()` (normalización + validación) →
`registerTool()` (registro con fallback). Las tres piezas, sus contratos y sus oráculos
están en `knowledge/contracts/{supports-webmcp,define-tool,register-tool}.md`.

## Pendientes / ítems de seguimiento

- API Declarativa (anotaciones WebMCP sobre `<form>`) — capacidad objetivo de
  `DEFINITION.md` todavía sin contrato, es un mecanismo distinto (generar/validar
  atributos HTML, no funciones JS).
- Verificación end-to-end contra un `document.modelContext` real (Chrome con origin
  trial) — sigue diferida, ninguna de las tres piezas del core imperativo la tiene
  todavía (todas se verifican con mocks puros en Node).
- Harness de testing/debug dedicado (capacidad objetivo de DEFINITION.md) — los mocks
  hoy viven inline en cada archivo de test; si se repite el patrón una vez más, vale la
  pena extraerlo a un helper compartido.
