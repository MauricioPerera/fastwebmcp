# Contrato 35 — Fix: supportsWebMcp debe chequear document.modelContext, no navigator

Prerrequisitos: CONTRACT-34 cerrado y pusheado. Antes de construir `defineTool()` encima,
se verificó contra el spec oficial (webmachinelearning.github.io/webmcp) y la
documentación de Chrome dónde vive realmente la API de registro de WebMCP: el resultado
contradice la implementación de CONTRACT-34.

> Capa: contrato de ejecución. Toca el task contract CCDD ya existente
> `knowledge/contracts/supports-webmcp.md` (no crea uno nuevo).

## T1 — Corregir el global chequeado

`src_ts/supports-webmcp.ts` y su oráculo (`tests_ts/supports-webmcp.test.ts`) chequean
`navigator.modelContext`. El IDL normativo del spec dice
`partial interface Document { readonly attribute ModelContext modelContext; }` — vive en
`document`, no en `Navigator`. La fuente secundaria usada durante CONTRACT-34 (research
web previo a este proyecto) estaba equivocada.

FIX/OBJETIVO: `supportsWebMcp()` chequea `globalThis.document.modelContext`. El oráculo
se reescribe para mockear `document` (Node no tiene un `document` global de solo-lectura,
a diferencia de `navigator`, así que no hace falta el workaround de
`Object.defineProperty` de CONTRACT-34 — asignación directa alcanza). Mismo invariante:
nunca lanza, `true` solo si `modelContext` es un objeto no-null.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test tests_ts/supports-webmcp.test.ts` 2× verde.
- [ ] `npx tsc --noEmit` exit 0.
- [ ] Ningún archivo del repo (código, contrato, spec, reporte, changelog previo) sigue
  mencionando `navigator.modelContext` como la API real (grep limpio salvo la nota
  histórica de corrección en el contrato y este spec).

## Restricciones

- Tocar SOLO: `src_ts/supports-webmcp.ts`, `tests_ts/supports-webmcp.test.ts`,
  `knowledge/contracts/supports-webmcp.md`, `CHANGELOG.md`,
  `docs/reports/CONTRACT-35-REPORT.md`.
- Mismo `forbids` que el contrato original: sin red, sin subprocess, sin LLM en el target.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: el spec oficial resulta ambiguo o contradictorio entre fuentes — no se
  encontró ese caso (spec normativo y doc de Chrome coinciden en `document.modelContext`
  con cita literal del IDL), así que no aplica.

## Checklist antes de delegar

- [x] RECON corrido: spec oficial (webmachinelearning.github.io/webmcp) y
  developer.chrome.com/docs/ai/webmcp/imperative-api consultados directamente, cita
  literal del IDL obtenida antes de tocar código.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oráculo corregido cubre los mismos 6 casos que el original (con API,
  sin API, `modelContext` undefined/null/no-objeto, `document` ausente) — no se reduce
  cobertura al corregir.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condición de aborto explícita arriba (no se activó).
