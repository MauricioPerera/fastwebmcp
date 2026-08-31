# Contrato 45 — Verificación real de extremo a extremo (WebMCP + mcpwasm)

Prerrequisitos: CONTRACT-44 cerrado (CI real y verde). El usuario pidió, en sus propias
palabras, "una prueba real de extremo a extremo para tener una idea clara" — no otra
corrida de gates locales, sino ejecutar el paquete publicado contra los DOS runtimes
reales que `fastwebmcp` promete soportar: un navegador WebMCP real (ya probado antes,
CONTRACT-40) y el sandbox real de `mcpwasm` (NUNCA probado contra un runtime real —
CONTRACT-42 solo verificó que el output de `toMcpwasmSkillSource()` compila como JS
válido, `new Function(src)`, no que un cliente MCP real pudiera descubrirlo, verificarlo
por hash y ejecutarlo).

> Capa: contrato de ejecución, verificación pura. Sin task contracts CCDD nuevos, sin
> cambios a `src_ts/`/`tests_ts/` — no hay target que implementar, solo evidencia real
> que capturar. Mismo patrón que CONTRACT-40 (demos verificadas en Chrome real): la
> evidencia vive en el reporte, no en un script permanente del repo.

## T1 — WebMCP real (paquete publicado, Chrome real)

`npm install fastwebmcp@0.2.0` (el último publicado — 0.2.1/0.2.2/0.2.3 son solo
docs/CI, `dist/` idéntico) en un proyecto scratch aislado, bundleado con `esbuild` para
el navegador. Cargado en el Chrome real del usuario (v152, ya usado en CONTRACT-40):
`registerTool()` + `executeTool()` de verdad, `defineDeclarativeTool()` seteando
atributos reales en el DOM.

## T2 — mcpwasm real (nunca antes probado)

`toMcpwasmSkillSource()` del paquete publicado genera un `tool.js` real; se arma un
`llms.txt` real (formato executable-skills v0.5, `tool_sha256` calculado de verdad) y se
sirve en un servidor HTTP local. Se corre el CLI oficial (`npx @rckflr/mcpwasm
<origin>`) — el runtime real, sandbox QuickJS-wasm real, no una simulación — y se le
habla protocolo MCP genuino por stdio (`initialize` → `tools/list` → `tools/call`) con
un cliente JSON-RPC escrito para este contrato.

## Criterios de aceptación

- [ ] WebMCP real: `getTools()` lista la tool registrada; `executeTool()` devuelve el
  resultado real del handler (no simulado); el form Declarativo tiene los atributos
  reales en el DOM.
- [ ] mcpwasm real: el CLI reporta el skill "verificado y cargado" (hash `tool_sha256`
  validado por el host, no por nuestro propio código); `tools/list` devuelve el
  `inputSchema` exacto que `defineTool()` derivó; `tools/call` devuelve el resultado
  numérico correcto, computado por el sandbox QuickJS-wasm real ejecutando el
  `handlerBody` que se le pasó a `toMcpwasmSkillSource()`.
- [ ] Toda infraestructura efímera (servidores HTTP locales, proceso del CLI, archivos
  scratch) limpiada al terminar — nada huérfano.

## Restricciones

- Tocar SOLO: `specs/CONTRACT-45-real-e2e-verification.md`,
  `docs/reports/CONTRACT-45-REPORT.md`, `CHANGELOG.md`. Sin cambios a `src_ts/`,
  `tests_ts/`, ni a ningún contrato CCDD existente.
- Todo el trabajo scratch vive fuera del repo (bajo el scratchpad de la sesión), nunca
  se stagea ni se commitea.
- ABORTAR SI: `npx @rckflr/mcpwasm` no lograra verificar el hash del skill generado, o
  `tools/call` no devolviera el resultado esperado — indicaría que
  `toMcpwasmSkillSource()` produce algo que solo PARECE válido pero no lo es de verdad.
  No se activó.

## Checklist antes de delegar

- [x] RECON: versión real instalada de `@rckflr/mcpwasm` (0.11.1, vía `npm view`),
  protocolo real observado (JSON-RPC 2.0 newline-delimited sobre stdio, no asumido de
  memoria — se escribió un cliente real y se leyó su output).
- [x] Todo criterio de aceptación verificado con evidencia REAL capturada (salida
  textual completa del CLI y de las tres respuestas JSON-RPC), no supuesta.
- [x] Red-team: `tools/call` se probó con un input NUEVO (`{a:19,b:23}` → `42`), no el
  mismo par usado al generar el ejemplo original, para descartar que el sandbox
  devolviera un valor hardcodeado en vez de ejecutar la lógica real.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condición de aborto explícita arriba (no se activó — ambos runtimes reales
  confirmaron el comportamiento esperado en el primer intento).
