# CONTRACT-42 — Puente acotado con mcpwasm (solo schema, no runtime) — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-42-mcpwasm-bridge.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 32 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 42 archivos) |
| `python scripts/validate_okf.py knowledge` | ✅ | `OK` (0 errores, 56 archivos) |
| `python scripts/validate_changelog.py` | ✅ | ver abajo |
| `node --test "tests_ts/*.test.ts"` | ✅ verde 2× (46 tests c/u) | `fail 0` ambas |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | `dist/to-mcpwasm-skill.js`+`.d.ts` generados correctamente |
| `validate_test_commands.py` | ✅ | `PASS knowledge/contracts\to-mcpwasm-skill.md` |

## RECON: por qué el alcance se acotó (bloqueante, decidido ANTES de diseñar)

El usuario pidió "soporte real" para `mcpwasm`. Se delegó una investigación profunda
contra el código REAL de `mcpwasm` (`host-async.mjs`,
`demo-site/content/sum_numbers.tool.js`) y `llms-txt-skills`
(`docs/ext-executable-skills.md` v0.5.1, CLI `@rckflr/llms-skills`), no solo sus
READMEs. Hallazgo bloqueante: el `handler` de mcpwasm corre en QuickJS-wasm sin DOM,
sin `fetch`, sin `window`/`document` — solo `registerTool`, `host.fetchOrigin`
(restringido al origin publicador), `host.memorySearch` opcional, y ECMAScript puro,
bajo un contador de gas determinístico (no wall-clock: Cloudflare Workers congela
`Date.now()` en ejecución síncrona). El `execute` de WebMCP existe específicamente para
tocar el DOM de una página real. Ningún documento de ninguno de los dos proyectos
describe un mecanismo para compartir esa lógica — un bridge de RUNTIME es imposible sin
inventar algo que no existe en ninguno de los dos specs.

Presentado al usuario tal cual (sin optimismo infundado): lo único compartible es la
capa de schema (`name`/`description`/`inputSchema`, JSON Schema), que `defineTool()` ya
deriva de Zod para el navegador. El usuario confirmó seguir con esa versión acotada.

## T1 (CCDD: `to-mcpwasm-skill`)

`src_ts/to-mcpwasm-skill.ts`: `toMcpwasmSkillSource(tool, options?)` toma un
`DefinedTool` y emite el texto `registerTool({ name, description, inputSchema, handler
})` que `mcpwasm` espera en un `tool.js`. `name`/`description` van por
`JSON.stringify` (a salvo de comillas/backslashes/saltos de línea); `inputSchema` es el
mismo objeto que `defineTool()` ya derivó, sin re-inferencia. El `handler` es un stub
"TODO" que menciona explícitamente las restricciones del sandbox, salvo que se provea
`options.handlerBody` (texto crudo insertado verbatim) — nunca se intenta traducir el
`execute` original.

`src_ts/index.ts` actualizado con el nuevo export público. No reimplementa
`@rckflr/llms-skills` (el CLI oficial de mcpwasm): ese sigue siendo el camino para
scaffolding completo, sellado de `tool_sha256` y publicación real.

Sin desvíos respecto al spec: 7/7 tests verdes en el primer intento de implementación.

## Verificación final (independiente, re-ejecutada)

- `node --test "tests_ts/*.test.ts"`: 2/2 corridas verdes, 46/46 tests, 7 archivos
  (`supports-webmcp`, `define-tool`, `register-tool`, `testing`,
  `define-declarative-tool`, `respond-to-agent-submit`, `to-mcpwasm-skill`) sin
  contaminación cruzada.
- `npx tsc --noEmit`: exit 0.
- `npm run build`: el build real de distribución (no el bundle de examples) sigue
  generando `dist/to-mcpwasm-skill.js`+`.d.ts` sin errores — confirma que el nuevo
  módulo es publicable sin romper la infraestructura de CONTRACT-41.
- Un test del oráculo compila el output con `new Function(src)` — verificación real de
  sintaxis JS válida, no solo forma de string.

## DEFINITION.md actualizado

Se agregó esta capacidad a "Capacidades objetivo" (pedido explícito del usuario,
justifica tocar el documento cerrado) con la misma nota de límite: no porta el
`execute`, no reimplementa el CLI de mcpwasm.

## Pendientes / ítems de seguimiento

- Ninguno nuevo. El paquete sigue en `0.1.0` (no se re-publica a npm por este contrato
  — es una adición de superficie, no un fix urgente; queda para el próximo publish
  cuando el usuario decida bumpear versión).
