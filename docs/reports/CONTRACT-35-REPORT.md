# CONTRACT-35 — Fix: supportsWebMcp debe chequear document.modelContext — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-35-fix-document-modelcontext.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK: todos los contratos son validos` (0 errores, 26 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK: todos los contratos de specs son validos` (0 errores, 35 archivos) |
| `python scripts/validate_changelog.py` | ✅ | `0 error(es), 35 contrato(s) verificados` |
| `node --test tests_ts/supports-webmcp.test.ts` | ✅ verde 2× (6 tests c/u) | `fail 0` ambas corridas |
| `npx tsc --noEmit` | ✅ | exit 0, sin salida |
| Grep de `navigator.modelContext` fuera de las notas históricas de corrección | ✅ | ver detalle abajo |

## T1 — Corregir el global chequeado

Verificado directamente contra dos fuentes primarias antes de tocar código:
`webmachinelearning.github.io/webmcp` (IDL: `partial interface Document { readonly
attribute ModelContext modelContext; }`) y `developer.chrome.com/docs/ai/webmcp/imperative-api`
(código real: `document.modelContext.registerTool(...)`). Ambas coinciden: la API vive en
`document`, no en `Navigator`.

Cambios:
- `src_ts/supports-webmcp.ts`: chequea `globalThis.document.modelContext` en vez de
  `globalThis.navigator.modelContext`.
- `tests_ts/supports-webmcp.test.ts`: reescrito para mockear `document`. A diferencia de
  `navigator` (accessor de solo-lectura en Node ≥21, requería `Object.defineProperty`),
  Node no define un `document` global — asignación directa (`globalThis.document = ...`)
  alcanza; se conserva igual el helper con restauración en `finally` por prolijidad y
  paridad de patrón con el test anterior.
- `knowledge/contracts/supports-webmcp.md`: `signature`/`intent`/`Invariants`/`Examples`
  actualizados a `document`; se agregó una nota de corrección explícita en `## Intent`
  con la referencia a las dos fuentes primarias. `tests_sha256` re-sellado.
- `DEFINITION.md`: las 5 menciones de `navigator.modelContext` corregidas a
  `document.modelContext` (documento vivo, no un reporte histórico cerrado).
- `CHANGELOG.md`: la entrada de Contract 34 (aún bajo `Unreleased`, no releaseada) se
  corrigió in-place más una entrada nueva propia de Contract 35 documentando el fix.

No se tocó `specs/CONTRACT-34-bootstrap-core.md` ni `docs/reports/CONTRACT-34-REPORT.md`:
son registro histórico de lo que se hizo/creyó en ese momento; la corrección vive en su
propio contrato (35), no reescribiendo el 34.

## Verificación final (independiente, re-ejecutada tras el fix)

- `node --test tests_ts/supports-webmcp.test.ts`: 2/2 corridas verdes, `fail 0` ambas,
  mismos 6 casos que la versión original (con API, sin API, `modelContext`
  undefined/null/no-objeto, `document` ausente) — cobertura no reducida por la corrección.
- `npx tsc --noEmit`: exit 0.
- `grep -rn "navigator\.modelContext"` sobre el repo: 3 coincidencias, las 3 dentro de
  notas de corrección explícitas (`specs/CONTRACT-35-*.md`, `knowledge/contracts/supports-webmcp.md`
  sección de nota, `specs/CONTRACT-34-*.md` como registro histórico intacto) — cero
  ocurrencias afirmando que esa sea la API real.

## Pendientes / ítems de seguimiento

- Ninguno nuevo. `defineTool()` (CONTRACT-36) puede construirse sobre `document.modelContext`
  con confianza — verificado contra fuente primaria, no secundaria.
