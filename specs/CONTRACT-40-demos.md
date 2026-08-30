# Contrato 40 — Demos ejecutables, verificados contra document.modelContext real

Prerrequisitos: CONTRACT-39 cerrado (API Declarativa completa). RECON: la Browser pane
sandboxeada corre Chrome 148 (`document.modelContext` no existe — WebMCP pide 149+); el
MCP `chrome-devtools` esta bloqueado por un lock de perfil ajeno a este contrato. El
Chrome REAL del usuario (via `claude-in-chrome`) corre v152 y YA tiene
`document.modelContext` disponible (`registerTool`/`getTools`/`executeTool`/
`provideContext`) — sin necesidad de tocar `chrome://flags` ni modificar configuracion
del navegador del usuario. Esto habilito verificacion real, no solo con mocks de Node.

**Tension de diseño encontrada durante RECON:** el codigo fuente usa imports con
extension `.ts` (obligatorio para que `node --test` ejecute `.ts` nativo — verificado en
CONTRACT-34). `tsc` no puede EMITIR JS mientras `allowImportingTsExtensions` este activo
(requiere `noEmit`), asi que no se puede usar `tsc` para producir el JS que un navegador
cargue. Resuelto agregando `esbuild` como devDependency (bundler, no le importa la
extension literal del import, resuelve por archivo real) — no afecta el paquete
publicado (`zod` sigue siendo la unica dependencia runtime de `fastwebmcp`).

> Capa: contrato de ejecución. Sin task contracts CCDD nuevos — todo el trabajo es
> infraestructura de build + artefactos de ejemplo, verificados por el gate de UX/a11y
> y por ejecucion real en el navegador, no por oraculos congelados de funcion pura.

## T1 — Barrel export + build de demos

`src_ts/index.ts`: re-exporta la API publica completa (las 6 piezas de
CONTRACT-34/36/37/38/39). `esbuild` como devDependency (fijado en `^0.28.2` tras
detectar y resolver una vulnerabilidad moderada conocida del dev-server de esbuild via
`npm audit` — no aplica a nuestro uso, que es solo `--bundle` CLI, pero se fijo la
version parcheada de todos modos). Script `build:examples` en `package.json`: bundlea
`examples/imperative-demo.ts` y `examples/declarative-demo.ts` (cada uno import de
`zod` + `../src_ts/index.ts`) a `examples/dist/*.js` (gitignorado via el patron `dist/`
ya existente, se regenera con `npm run build:examples`).

## T2 — Demo Imperativa (todo list)

`examples/ux-page/imperative-demo.html` + `examples/imperative-demo.ts`: registra
`add_todo(text)` via `registerTool`, muestra un banner segun `supportsWebMcp()`, y un
form humano que usa la MISMA logica de agregado que la tool del agente.

## T3 — Demo Declarativa (support request form)

`examples/ux-page/declarative-demo.html` + `examples/declarative-demo.ts`: anota el
form via `defineDeclarativeTool` (inspirado en el ejemplo literal del explainer del
spec) y maneja el submit via `respondToAgentSubmit`, con fallback visible para el path
humano (`agentInvoked === false`).

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `npx tsc --noEmit` exit 0 (incluye `examples/*.ts`).
- [ ] `node --test "tests_ts/*.test.ts"` verde 2× (39 tests, sin regresion).
- [ ] `python scripts/validate_ux_page.py examples/ux-page` — 0 errores/warnings, 2
  archivos escaneados.
- [ ] `npm audit` — 0 vulnerabilidades.
- [ ] Verificacion EN VIVO contra Chrome real: `document.modelContext.getTools()`
  incluye `add_todo` con el `inputSchema` derivado correctamente;
  `document.modelContext.executeTool('add_todo', {...})` corre el handler real y
  actualiza el DOM; el form Declarativo tiene `toolname`/`tooldescription`/
  `toolparamdescription` seteados en el DOM real; un submit humano
  (`agentInvoked === false`) produce el mensaje de fallback esperado.

## Restricciones

- Tocar SOLO: `src_ts/index.ts`, `examples/imperative-demo.ts`,
  `examples/declarative-demo.ts`, `examples/ux-page/*.html`, `package.json`,
  `package-lock.json`, `tsconfig.json`, `CHANGELOG.md`, `docs/reports/CONTRACT-40-REPORT.md`.
- Unica dependencia nueva: `esbuild` (devDependency, no afecta el paquete publicado).
- Los archivos de `examples/` no hacen red mas alla de cargar su propio bundle local
  (sin llamadas a APIs externas, sin telemetria).
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: ningun navegador disponible tuviera `document.modelContext` — no se
  activó (el Chrome real del usuario, v152, lo tiene).

## Checklist antes de delegar

- [x] RECON corrido: version de Chrome de cada superficie de navegador disponible
  (Browser pane sandboxeada: 148, sin soporte; Chrome real del usuario via
  claude-in-chrome: 152, con soporte confirmado antes de escribir codigo de demo).
- [x] Todo criterio de aceptación tiene comando + resultado esperado (incluida la
  verificacion en vivo, no solo "por lectura").
- [x] Red-team: la verificacion en vivo usa `executeTool` (ejecuta el handler real,
  actualiza el DOM real) en vez de solo inspeccionar `getTools()` — un `registerTool`
  que solo registrara metadata sin conectar el `execute` real no hubiera pasado este
  criterio.
- [x] Perímetro declarado arriba, T1/T2/T3 secuenciales (T2/T3 dependen de T1).
- [x] Condición de aborto explícita arriba (no se activó).
