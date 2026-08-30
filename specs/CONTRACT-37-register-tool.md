# Contrato 37 — Registro seguro de una tool WebMCP con fallback no-op

Prerrequisitos: CONTRACT-36 cerrado (`defineTool()` normaliza y valida) y CONTRACT-35
(`supportsWebMcp()` corregido contra `document.modelContext`, fuente primaria verificada).
RECON: `node --test "tests_ts/*.test.ts"` corriendo los tres archivos juntos da 19/19 verde
sin contaminación cruzada entre los mocks de `document` de `supports-webmcp.test.ts` y
`register-tool.test.ts` (cada uno restaura el descriptor original en un `finally`).

> Capa: contrato de ejecución. T1 lleva su task contract CCDD en
> `knowledge/contracts/register-tool.md`.

## T1 (CCDD: `register-tool`) — Une defineTool + supportsWebMcp

Hoy `defineTool()` normaliza pero no registra nada, y `supportsWebMcp()` detecta soporte
pero nadie lo usa todavia para decidir si registrar. Falta el punto de entrada único que
un consumidor de `fastwebmcp` llama para exponer una tool real.

FIX/OBJETIVO: `registerTool(spec, options?)` — valida siempre vía `defineTool` (lanza ante
spec inválido, con o sin soporte del navegador); si `supportsWebMcp()` es `false`, no-op +
`console.warn` mencionando el nombre de la tool, devuelve `false`; si es `true`, llama a
`document.modelContext.registerTool(tool, options)` y devuelve `true`. Ver
`knowledge/contracts/register-tool.md`.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test tests_ts/register-tool.test.ts` 2× verde (5 tests).
- [ ] `node --test "tests_ts/*.test.ts"` verde (19 tests, sin contaminación cruzada).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `python scripts/validate_test_commands.py knowledge/contracts .` — `register-tool.md`
  en `PASS`.

## Restricciones

- Tocar SOLO: `src_ts/register-tool.ts`, `tests_ts/register-tool.test.ts`,
  `knowledge/contracts/register-tool.md`, `knowledge/index.md`, `CHANGELOG.md`,
  `docs/reports/CONTRACT-37-REPORT.md`.
- Sin dependencias nuevas.
- `register-tool.ts` no hace red, no usa `subprocess`/`child_process`, no depende de
  ningún LLM.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: correr los tres archivos de test juntos (`tests_ts/*.test.ts`) revela
  contaminación entre los mocks de `document`/`navigator` de distintos archivos — no se
  activó (19/19 verde en RECON y en la verificación final).

## Checklist antes de delegar

- [x] RECON corrido: suite completa de `tests_ts/` junta, sin contaminación cruzada.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oráculo obliga a validar SIEMPRE (con y sin soporte), a no tragar
  errores del navegador real en un `try/catch`, y a reenviar `options` tal cual — no hay
  forma de pasar el test_command con un no-op que ignore specs inválidos o un
  registro que no llegue a `document.modelContext`.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condición de aborto explícita arriba (no se activó).
