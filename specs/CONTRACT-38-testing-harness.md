# Contrato 38 — Extraer el harness de testing (DRY + capacidad nueva de DEFINITION.md)

Prerrequisitos: CONTRACT-37 cerrado. El patron `withDocument` (mock de `document` con
guardado/restauracion del descriptor original) aparecio identico, verbatim, en
`supports-webmcp.test.ts` y `register-tool.test.ts` — tercera repeticion inminente al
tocar la API Declarativa. Ademas, `DEFINITION.md` promete una capacidad todavia sin
construir: "harness que invoca y verifica tools sin necesitar un navegador real".

> Capa: contrato de ejecución. T2 lleva su task contract CCDD en
> `knowledge/contracts/web-mcp-mock.md`. T1 no crea contrato nuevo — actualiza los dos
> ya existentes (`supports-webmcp.md`, `register-tool.md`) porque el contenido de sus
> oraculos cambio.

## T1 (refactor, sin CCDD nuevo) — Extraer withDocument/withWarnSpy

`tests_ts/mock-globals.ts` nuevo: `withDocument(value, run)` y `withWarnSpy(run)`,
movidos verbatim desde los dos archivos que los duplicaban. Los dos test files pasan a
importarlos. Mismos casos, mismas aserciones — solo el `import` cambia. Como el
contenido de `tests_ts/supports-webmcp.test.ts` y `tests_ts/register-tool.test.ts`
cambia, sus `tests_sha256` en `knowledge/contracts/{supports-webmcp,register-tool}.md`
se re-sellan, con nota explicita del porque (refactor, no cambio de comportamiento).

## T2 (CCDD: `web-mcp-mock`) — createWebMcpMock()

`src_ts/testing.ts`: `createWebMcpMock()` devuelve `{ document, registeredTools,
invokeTool }` — un `document` mockeable apto para `registerTool()`, y un `invokeTool(name,
input, context?)` que ejecuta el `execute` real (el que devuelve `defineTool()`, con
parseo Zod incluido) de la tool registrada bajo ese nombre. Ver
`knowledge/contracts/web-mcp-mock.md`.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test "tests_ts/*.test.ts"` verde 2× (25 tests, los 4 archivos juntos).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `validate_test_commands.py`: `supports-webmcp.md`, `register-tool.md` y
  `web-mcp-mock.md` los tres en `PASS`.

## Restricciones

- Tocar SOLO: `tests_ts/mock-globals.ts` (nuevo), `tests_ts/supports-webmcp.test.ts`,
  `tests_ts/register-tool.test.ts`, `tests_ts/testing.test.ts` (nuevo),
  `src_ts/testing.ts` (nuevo), `knowledge/contracts/{supports-webmcp,register-tool,
  web-mcp-mock}.md`, `knowledge/index.md`, `CHANGELOG.md`,
  `docs/reports/CONTRACT-38-REPORT.md`.
- Sin dependencias nuevas.
- `src_ts/testing.ts` no hace red, no usa `subprocess`/`child_process`, no depende de
  ningún LLM.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: el refactor de T1 cambia el comportamiento observable de algun test (no se
  activó — 11/11 verde antes y despues de extraer los helpers, mismas aserciones).

## Checklist antes de delegar

- [x] RECON corrido: los 3 test files existentes (11 tests) verdes antes de tocar nada;
  confirmado que `withDocument` era identico en ambos archivos (diff sin cambios).
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: `invokeTool` no reimplementa validacion — delega al `execute` real de
  `defineTool()`, asi que un test que pase con el mock pero falle contra la libreria real
  es imposible salvo bug en el mock mismo, cubierto por el caso end-to-end del oraculo.
- [x] Perímetro declarado arriba, T1 y T2 secuenciales (T2 no depende de T1, pero ambos
  tocan `tests_ts/`, se hacen en orden para no pisarse).
- [x] Condición de aborto explícita arriba (no se activó).
