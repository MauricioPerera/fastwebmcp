# Contrato 42 — Puente acotado con mcpwasm (solo schema, no runtime)

Prerrequisitos: CONTRACT-41 cerrado (paquete publicado, `fastwebmcp@0.1.0` en npm).
El usuario pidio "soporte real" para github.com/MauricioPerera/mcpwasm — un proyecto
DISTINTO del mismo autor. RECON obligatorio antes de diseñar: se delego una
investigacion profunda contra el codigo REAL de `mcpwasm` y `llms-txt-skills` (no el
README solo) para responder si un bridge de runtime era siquiera posible.

**Resultado del RECON (bloqueante, decidio el alcance):** el `handler` de mcpwasm corre
en QuickJS-wasm sin DOM/`fetch`/`window` — solo `registerTool`, `host.fetchOrigin`
(restringido al origin), `host.memorySearch` opcional, y ECMAScript puro, bajo un
contador de gas deterministico (no wall-clock, porque Cloudflare Workers congela
`Date.now()` en ejecucion sincronica). El `execute` de WebMCP existe para tocar el DOM
real. Ningun documento de ninguno de los dos proyectos describe un mecanismo para
compartir esa logica. Confirmado, no supuesto: un bridge de RUNTIME es imposible sin
inventar algo que no existe en ninguno de los dos specs. Lo unico compartible es la
capa de schema (`name`/`description`/`inputSchema`), que `defineTool()` ya deriva de
Zod. Presentado al usuario, quien confirmo seguir con esa version acotada.

> Capa: contrato de ejecución. T1 lleva su task contract CCDD en
> `knowledge/contracts/to-mcpwasm-skill.md`.

## T1 (CCDD: `to-mcpwasm-skill`) — Generador de fuente de skill

`src_ts/to-mcpwasm-skill.ts`: `toMcpwasmSkillSource(tool, options?)` toma un
`DefinedTool` (el output de `defineTool()`, ya validado y con `inputSchema` derivado) y
emite el texto `registerTool({ name, description, inputSchema, handler })` que
`mcpwasm` espera en un `tool.js`. El `handler` es un placeholder (stub TODO) salvo que
se provea `options.handlerBody` — nunca se intenta traducir el `execute` original. No
reimplementa el CLI oficial de mcpwasm (`@rckflr/llms-skills`), que sigue siendo el
camino para scaffolding completo + sellado de hash + publicacion real.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `node --test "tests_ts/*.test.ts"` verde 2× (46 tests, los 7 archivos juntos).
- [ ] `npx tsc --noEmit` exit 0.
- [ ] `npm run build` exit 0 (el build real de distribucion, no solo el bundle de
  examples, sigue generando `dist/to-mcpwasm-skill.js`+`.d.ts` correctamente).
- [ ] `validate_test_commands.py` — `to-mcpwasm-skill.md` en `PASS`.

## Restricciones

- Tocar SOLO: `src_ts/to-mcpwasm-skill.ts`, `tests_ts/to-mcpwasm-skill.test.ts`,
  `src_ts/index.ts` (agregar el export), `knowledge/contracts/to-mcpwasm-skill.md`,
  `knowledge/index.md`, `CHANGELOG.md`, `docs/reports/CONTRACT-42-REPORT.md`.
- Sin dependencias nuevas.
- `to-mcpwasm-skill.ts` no hace red, no usa `subprocess`/`child_process`, no depende de
  ningún LLM, y NO invoca el CLI real de mcpwasm — es generación de texto pura.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: se descubriera un mecanismo real de bridge de runtime entre los dos
  proyectos que el RECON no haya encontrado — no se activó (RECON exhaustivo contra
  código real, no documentación de segunda mano).

## Checklist antes de delegar

- [x] RECON corrido: código real de `mcpwasm` (`host-async.mjs`,
  `demo-site/content/sum_numbers.tool.js`) y `llms-txt-skills`
  (`docs/ext-executable-skills.md` v0.5.1, CLI `@rckflr/llms-skills`) leído
  directamente, no inferido de un README resumido.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el oráculo verifica sintaxis real (`new Function(output)` sin lanzar),
  no solo forma de string — un generador que produjera JS invalido no pasaria.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condición de aborto explícita arriba (no se activó).
