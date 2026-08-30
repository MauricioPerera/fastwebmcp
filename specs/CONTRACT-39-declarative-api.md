# Contrato 39 — API Declarativa de WebMCP: anotar un form + responder al submit

Prerrequisitos: CONTRACT-38 cerrado (harness de testing disponible). RECON: el spec
normativo de WebMCP marca la seccion Declarativa como TODO y remite al explainer
(`webmachinelearning/webmcp/blob/main/declarative-api-explainer.md`), consultado
directamente antes de escribir cualquier test. Confirmado: `toolname`/`tooldescription`/
`toolparamdescription` son atributos con valor string, `toolautosubmit` es booleano de
sola-presencia, y `SubmitEvent` agrega `agentInvoked`/`respondWith(Promise<any>)`. El
algoritmo que deriva el JSON Schema completo del form esta explicitamente sin
especificar (`"is TBD"`) — este contrato NO lo toca, alcance limitado a lo que SI esta
fijado.

> Capa: contrato de ejecución. T1 y T2 llevan cada uno su task contract CCDD.

## T1 (CCDD: `define-declarative-tool`) — Anotar el form

`src_ts/define-declarative-tool.ts`: `defineDeclarativeTool(form, spec)` valida
`name`/`description` (mismo fail-fast que `defineTool`), setea `toolname`/
`tooldescription`/`toolautosubmit?` en el form y `toolparamdescription` en los campos
nombrados. Ver `knowledge/contracts/define-declarative-tool.md`.

## T2 (CCDD: `respond-to-agent-submit`) — Puente del submit

`src_ts/respond-to-agent-submit.ts`: `respondToAgentSubmit(event, handler)` — si
`event.agentInvoked` es falso, no-op y devuelve `false`; si es verdadero, corre
`handler(event)` (sync o async, throw sincronico incluido) y pasa su resultado/rechazo a
`event.respondWith`, devuelve `true`. Ver
`knowledge/contracts/respond-to-agent-submit.md`.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test "tests_ts/*.test.ts"` verde 2× (39 tests, los 6 archivos juntos).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `validate_test_commands.py`: `define-declarative-tool.md` y
  `respond-to-agent-submit.md` los dos en `PASS`.

## Restricciones

- Tocar SOLO: `src_ts/define-declarative-tool.ts`, `src_ts/respond-to-agent-submit.ts`,
  `tests_ts/define-declarative-tool.test.ts`, `tests_ts/respond-to-agent-submit.test.ts`,
  `knowledge/contracts/{define-declarative-tool,respond-to-agent-submit}.md`,
  `knowledge/index.md`, `CHANGELOG.md`, `docs/reports/CONTRACT-39-REPORT.md`.
- Sin dependencias nuevas.
- Ninguno de los dos targets hace red, usa `subprocess`/`child_process`, ni depende de
  ningún LLM.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: el explainer y el spec normativo se contradicen entre si sobre la sintaxis
  de algun atributo — no se activó (el spec remite explicitamente al explainer como
  fuente para esta seccion, sin contradecirlo).

## Checklist antes de delegar

- [x] RECON corrido: spec normativo + explainer consultados directamente, sintaxis exacta
  de los 4 atributos y la interfaz `SubmitEvent` citada literal antes de escribir tests.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oráculo de T1 cubre fail-fast antes de tocar el form, el caso
  presencia-only de `toolautosubmit`, y el error cuando un `field.name` no matchea ningun
  control; el de T2 cubre el caso async, el rechazo por throw sincronico (encontrado y
  corregido un bug de timing en el oraculo mismo — el handler corre en microtask, un test
  sincronico no lo veía todavía — documentado en el reporte), y que `handler` recibe el
  `event`.
- [x] Perímetro declarado arriba, T1 y T2 sin dependencia entre si (paralelizables en
  principio; se hicieron secuenciales por simplicidad de esta sesión).
- [x] Condición de aborto explícita arriba (no se activó).
