# CONTRACT-36 — Builder tipado (Zod) para tools WebMCP Imperativas — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-36-define-tool.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 27 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 36 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 51 archivos) |
| `python scripts/validate_changelog.py` | ✅ | `0 error(es), 36 contrato(s) verificados` |
| `node --test tests_ts/define-tool.test.ts` | ✅ verde 2× (8 tests c/u) | `fail 0` ambas |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `validate_test_commands.py` | ✅ | `PASS knowledge/contracts\define-tool.md` |

## T1 (CCDD: `define-tool`)

`src_ts/define-tool.ts`: `defineTool(spec)` valida `name`/`description`/`execute` en tiempo
de definición (lanza sincrónicamente si son inválidos), deriva el `inputSchema` JSON Schema
con `schema.toJSONSchema()` (método de instancia nativo de Zod 4, mismo output que
`z.toJSONSchema(schema)` verificado en RECON — sin dependencia extra), y devuelve un
`execute` envuelto que parsea el input crudo con `spec.inputSchema.parse(...)` ANTES de
invocar el handler del usuario, reenviando el `context.signal` sin modificar.

Sin desvíos respecto al spec: el oráculo pasó en el primer intento de implementación (8/8
verde), sin necesidad de ajustar tests ni contrato después de escribirlos.

## Verificación final (independiente, re-ejecutada)

- `node --test tests_ts/define-tool.test.ts`: 2/2 corridas verdes, `fail 0` ambas — cubre
  normalización exitosa, los 3 casos de spec inválido (name vacío, name solo-espacios,
  description vacío, execute no-función — 4 en total), parseo exitoso, rechazo por input
  inválido, y reenvío del `AbortSignal`.
- `npx tsc --noEmit`: exit 0, sin `any` implícito ni supresiones.
- Gates de Nivel 1 relevantes re-corridos tras el cierre: los cuatro en verde.

## Límite conocido (documentado, no bloqueante)

El JSON Schema derivado no se verificó contra un `document.modelContext.registerTool()`
real (WebMCP solo tiene origin trial en Chrome 149; no hay entorno de este proyecto con el
flag activo). Este contrato es puro — define y normaliza, no registra — así que el límite
no bloquea su cierre; queda para el contrato que agregue el wrapper de registro real
(`registerTool()`), que sí necesita verificación end-to-end contra el navegador.

## Pendientes / ítems de seguimiento

- Wrapper `registerTool()` que llama a `document.modelContext.registerTool(defineTool(...))`
  con el fallback no-op + warning de `supportsWebMcp()` — próximo contrato natural.
- Verificación end-to-end del JSON Schema derivado contra un `document.modelContext` real
  (Chrome con origin trial) — diferida hasta que exista el wrapper de registro.
