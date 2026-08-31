# Contrato 48 — Campo title en defineTool()

Prerrequisitos: CONTRACT-47 cerrado (`annotations`, validacion de `name`, avisos de
presupuesto). RECON: la misma auditoria que encontro `annotations` en CONTRACT-47
(re-lectura del spec real, `webmachinelearning.github.io/webmcp`) confirmo que
`ModelContextTool` define tambien `title` (`USVString`, opcional, sin restriccion de
charset ni longitud) -- ausente por completo de `ToolSpec`/`DefinedTool` en fastwebmcp.
Se corrio un agente de auditoria dedicado (no solo memoria) para descartar otros gaps
antes de elegir este: `toolchange` (evento real pero sin shape documentado en el spec --
descartado, mismo motivo que `outputSchema` en CONTRACT-47), drift en `createWebMcpMock`
(ninguno -- el mock reenvia el objeto de `defineTool()` tal cual, agnostico a que campos
trae), API Declarativa contra el explainer real (sin gap), `docs.html`/README (ya al dia,
CONTRACT-47 los cerro en commits posteriores), CI/lint (nada faltante evidente), issues
abiertos en GitHub (cero).

> Capa: contrato de ejecucion. T1 amplia el task contract CCDD existente en
> `knowledge/contracts/define-tool.md` (NO crea uno nuevo).

## T1 (CCDD: `define-tool`, AMPLIADO) — campo title

FIX/OBJETIVO: `defineTool(spec)` acepta `spec.title?: string` y lo copia tal cual al
`DefinedTool` devuelto -- ausente si no se paso (nunca `undefined` en el objeto). Sin
validacion de formato: el spec no le impone ninguna a `title` (a diferencia de `name`,
que si tiene charset/longitud fijos).

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0 (`define-tool.md`
  re-sellado).
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test tests_ts/define-tool.test.ts` 2x verde (17 tests, era 15).
- [ ] `node --test "tests_ts/*.test.ts"` 2x verde (55 tests, sin contaminacion cruzada).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `python scripts/validate_test_commands.py knowledge/contracts .` -- `define-tool.md`
  en `PASS`.

## Restricciones

- Tocar SOLO: `src_ts/define-tool.ts`, `tests_ts/define-tool.test.ts`,
  `knowledge/contracts/define-tool.md`, `README.md`, `docs.html` (rama `gh-pages`,
  seccion `defineTool`), `CHANGELOG.md`, `docs/reports/CONTRACT-48-REPORT.md`.
- Sin dependencias nuevas.
- `define-tool.ts` sigue sin red, sin `subprocess`/`child_process`, sin LLM.
- NO publicar a npm ni taggear -- eso se hace por pedido explicito, fuera de este
  contrato.
- ABORTAR SI: agregar `title` rompiera algun test existente en `tests_ts/*.test.ts` --
  se corrio la suite completa antes de dar T1 por cerrado; no aparecio ningun caso (a
  diferencia de CONTRACT-47, que si encontro una regresion real en
  `to-mcpwasm-skill.test.ts`).

## Checklist antes de delegar

- [x] RECON corrido: spec real de WebMCP (`ModelContextTool.title`), mas un agente de
  auditoria dedicado que descarto explicitamente `toolchange`, drift en el mock, gaps en
  la API Declarativa, docs desactualizadas, CI/lint e issues abiertos -- no solo memoria.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oraculo cubre `title` presente (se copia tal cual) y `title` ausente
  (la clave no aparece en el objeto devuelto) -- el mismo par de casos que valido
  `annotations` en CONTRACT-47, suficiente para un campo pass-through sin validacion.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condicion de aborto: no se activo (55/55 verde, sin regresiones).
