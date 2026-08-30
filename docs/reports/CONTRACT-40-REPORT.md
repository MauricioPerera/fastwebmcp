# CONTRACT-40 — Demos ejecutables, verificados contra document.modelContext real — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-40-demos.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 31 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 40 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 55 archivos) |
| `python scripts/validate_changelog.py` | ✅ | ver abajo |
| `npx tsc --noEmit` | ✅ | exit 0, incluye `examples/*.ts` |
| `node --test "tests_ts/*.test.ts"` | ✅ verde 2× (39 tests c/u) | sin regresion |
| `python scripts/validate_ux_page.py examples/ux-page` | ✅ | `0 error(es), 0 warning(s), 2 archivo(s)` |
| `npm audit` | ✅ | `0 vulnerabilidades` |
| Verificacion en vivo contra Chrome real | ✅ | ver detalle abajo |

## RECON (antes de escribir código)

- Browser pane sandboxeada (Claude_Browser): Chrome 148 — `document.modelContext` NO
  existe (`typeof === 'undefined'`). WebMCP pide 149+.
- `chrome-devtools` MCP: bloqueado por `The browser is already running for ... Use
  --isolated` — infraestructura fuera del control de este contrato, no perseguido mas
  alla del intento inicial.
- Chrome real del usuario (`claude-in-chrome`, v152.0.0.0): `document.modelContext`
  presente con `registerTool`/`getTools`/`executeTool`/`provideContext` como funciones
  — verificado ANTES de escribir cualquier demo. No se toco `chrome://flags` ni se
  modifico configuracion del navegador del usuario (esa accion esta fuera de lo que
  este agente hace unilateralmente; result: no hizo falta).

## Tensión de diseño encontrada y resuelta

El codigo fuente usa `.ts` en los import specifiers (obligatorio para `node --test`
nativo, ver CONTRACT-34). `tsc` con `allowImportingTsExtensions: true` exige `noEmit` —
no puede emitir JS para el navegador desde ese mismo `tsconfig.json`. Resuelto con
`esbuild` (devDependency nueva, `^0.28.2`): un bundler no le importa la extension
literal del specifier, resuelve por archivo real en disco. `npm audit` detecto una
vulnerabilidad moderada conocida en `esbuild@<=0.24.2` (CORS del dev-server, GHSA-67mh-4wv8-2f99)
— no aplica a nuestro uso (solo `--bundle` CLI, nunca `esbuild serve`), pero se fijo
igual la version parcheada `^0.28.2`; `npm audit` final: 0 vulnerabilidades. `zod` sigue
siendo la unica dependencia runtime del paquete publicado — `esbuild` es solo dev.

## T1 — Barrel export + build

`src_ts/index.ts`: re-exporta las 6 piezas publicas (`supportsWebMcp`, `defineTool`,
`registerTool`, `createWebMcpMock`, `defineDeclarativeTool`, `respondToAgentSubmit`) mas
sus tipos. Script `build:examples` (`esbuild ... --bundle --minify --format=esm
--outdir=examples/dist`). Bundle de la demo Imperativa: 424.9kb minificado (incluye Zod
4 completo, que la demo importa para construir su schema — el paquete `fastwebmcp` en si
mismo NO bundlea Zod, ver el bundle de solo `src_ts/index.ts` sin demo: 3.3kb). Bundle
de la demo Declarativa: 1.2kb (no usa Zod).

## T2 — Demo Imperativa (todo list) — verificación en vivo

Servida por un servidor HTTP local efimero (`python -m http.server`, detenido al
terminar) para evitar el bloqueo de CORS de Chrome sobre `<script type="module">` cargado
via `file://`. Cargada en el Chrome real del usuario:

- `document.modelContext.getTools()` devuelve `add_todo` con `description` correcta y
  `inputSchema` real derivado por `z.toJSONSchema()` (`type: object`, `required:
  ["text"]`, `minLength` en la propiedad `text`).
- `await document.modelContext.executeTool('add_todo', { text: '...' })` corrio el
  handler REAL — devolvio `"Added: ..."` y el `<li>` aparecio en el DOM real. Esto
  prueba el round-trip completo (`registerTool` -> `defineTool`'s wrapped `execute` con
  parseo Zod -> handler del usuario -> DOM), no solo que la metadata se registro.
- El banner de estado mostro `status status--supported` con el texto correcto
  (`supportsWebMcp()` devolviendo `true` contra el `document.modelContext` real).

## T3 — Demo Declarativa (support request) — verificación en vivo

- `form.getAttribute('toolname')` -> `'submit_support_request'`,
  `tooldescription` -> `'Submit a request for support.'`,
  `select#topic.getAttribute('toolparamdescription')` -> el texto esperado — los tres
  seteados por `defineDeclarativeTool` sobre el DOM real, no un mock.
- Un submit disparado por `form.requestSubmit()` (equivalente a un submit humano real,
  `agentInvoked === false` en este flujo) produjo el mensaje de fallback esperado:
  `"Submitted by Ana. Routed to: Website support team"` — confirma que
  `respondToAgentSubmit` distingue correctamente el path humano y no llama
  `event.respondWith`.

**Observación honesta, no perseguida más allá:** `document.modelContext.getTools()` NO
listó `submit_support_request` (solo el tool Imperativo `add_todo`). Los atributos SI
estaban correctamente seteados en el DOM real, coincidiendo exactamente con lo que el
explainer especifica. No se pudo determinar si esto es (a) diseño intencional de Chrome
(`getTools()` es solo-Imperativa por ahora) o (b) un requisito adicional no documentado
(recarga, mutation observer, etc.) — la sección Declarativa del spec normativo sigue
marcada TODO upstream. No se investigó más porque hubiera significado adivinar sobre
comportamiento no especificado, la misma clase de error que motivó CONTRACT-35.

## Verificación final (independiente, re-ejecutada)

- Los cuatro gates de Nivel 1 relevantes + `validate_ux_page` + `npm audit`: todos en
  verde, re-corridos tras el cierre.
- Suite completa `tests_ts/`: 39/39, 2×, sin regresión por los cambios de
  `tsconfig.json`/`package.json`.
- Servidor HTTP local y pestaña del navegador real: detenidos/cerrados al terminar
  (sin infraestructura huérfana).

## Pendientes / ítems de seguimiento

- Ninguna capacidad objetivo de `DEFINITION.md` queda sin al menos una pieza construida
  y verificada. `fastwebmcp` tiene: detección de soporte, builder Imperativo, registro
  con fallback, harness de testing, dos piezas Declarativas, y ahora dos demos
  verificadas contra la API real del navegador.
- `document.modelContext.getTools()` sin reflejar tools Declarativas — observación
  documentada arriba, no bloqueante, no perseguida (comportamiento no especificado).
- Sin build/publicación a npm todavía (`package.json` sigue `"private": true`) — fuera
  de alcance de este contrato, como se documentó desde CONTRACT-34.
