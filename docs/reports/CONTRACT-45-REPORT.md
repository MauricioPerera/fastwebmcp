# CONTRACT-45 — Verificación real de extremo a extremo (WebMCP + mcpwasm) — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-45-real-e2e-verification.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| WebMCP real: tool registrada visible | ✅ | `getTools()` → `["e2e_add"]` |
| WebMCP real: `executeTool()` corre el handler real | ✅ | `executeTool('e2e_add', {a:40,b:2})` → `42` |
| WebMCP real: atributos Declarativos en el DOM real | ✅ | `toolname`/`tooldescription` reales, ver detalle |
| mcpwasm real: skill descubierto y hash verificado | ✅ | `"1 skill(s) verificadas y cargadas (e2e_sum)"` |
| mcpwasm real: `tools/list` expone el schema real | ✅ | JSON Schema idéntico al derivado por `defineTool()` |
| mcpwasm real: `tools/call` ejecuta en el sandbox real | ✅ | `{a:19,b:23}` → `42`, computado por QuickJS-wasm |

## Por qué este contrato, y por qué ahora

El usuario pidió, textual, "una prueba real de extremo a extremo para tener una idea
clara". Hasta CONTRACT-44, la verificación de `fastwebmcp` era sólida pero parcial: el
lado WebMCP se había probado contra un Chrome real en CONTRACT-40, pero el lado
`mcpwasm` (CONTRACT-42) solo probó que `toMcpwasmSkillSource()` produce texto
sintácticamente válido (`new Function(src)` sin lanzar) — nunca se había verificado que
un cliente MCP real pudiera descubrir, verificar por hash, y ejecutar el skill
generado. Esa brecha es exactamente el tipo de "verde que no prueba lo que dice probar"
que CONTRACT-43/44 ya habían cazado dos veces en la propia CI del proyecto.

## RECON

`npm view @rckflr/mcpwasm` → versión real `0.11.1`, confirmando el mecanismo
(`QuickJS-wasm sandbox`, `llms.txt` executable-skills). `npx @rckflr/mcpwasm --help` no
tiene flag de ayuda — el CLI espera un origin como único argumento y habla MCP por
stdio; el protocolo exacto (JSON-RPC 2.0, mensajes delimitados por newline, no framing
estilo LSP) se confirmó escribiendo un cliente real (`mcp-client.mjs`) y leyendo su
comportamiento observado, no asumido de la spec de MCP de memoria.

## T1 — WebMCP real (paquete publicado, Chrome real)

`npm install fastwebmcp@0.2.0` (el último realmente publicado a npm; 0.2.1/0.2.2/0.2.3
son solo cambios de docs/CI, `dist/` idéntico) en un proyecto scratch aislado.
Bundleado con `esbuild` para el navegador (mismo patrón que CONTRACT-41's tarball test,
pero ahora ejercitado en un navegador real, no solo `node verify.mjs`). Cargado en el
Chrome real del usuario (v152):

- `document.modelContext.getTools()` → `["e2e_add"]`.
- `await document.modelContext.executeTool('e2e_add', { a: 40, b: 2 })` → `42` — el
  handler real (`(window as any).__e2e.ranImperativeExecute` quedó en `true`,
  confirmando que se ejecutó la función provista, no un stub).
- Form Declarativo: `document.getElementById('e2e-form').getAttribute('toolname')` →
  `"e2e_declarative"`, `tooldescription` → el texto real provisto —
  `defineDeclarativeTool()` seteó los atributos reales en el DOM real.
- Un `requestSubmit()` normal (no disparado por un agente) dejó
  `declarativeSubmitResult` en `null` — comportamiento CORRECTO, no un fallo:
  `respondToAgentSubmit()` solo corre el handler cuando `event.agentInvoked` es
  verdadero, y no hay forma de simular esa señal de confianza del navegador desde JS de
  página (misma limitación ya documentada en CONTRACT-40).

## T2 — mcpwasm real (nunca antes probado contra un runtime real)

`toMcpwasmSkillSource()` del paquete publicado generó el `tool.js` real:

```js
registerTool({
  name: "e2e_sum",
  description: "E2E real mcpwasm sandbox test: sum two numbers.",
  inputSchema: {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": { "a": { "type": "number" }, "b": { "type": "number" } },
    "required": ["a", "b"],
    "additionalProperties": false
  },
  handler(args) {
    return Number(args.a) + Number(args.b);
  }
});
```

Servido junto a un `llms.txt` real (formato executable-skills v0.5, `tool_sha256`
calculado con `crypto.createHash('sha256')` sobre el contenido exacto servido) en un
`python -m http.server` local. Corrido `npx @rckflr/mcpwasm http://127.0.0.1:<puerto>`
como proceso hijo, hablado protocolo MCP real por stdio con un cliente JSON-RPC 2.0
escrito para este contrato:

- stderr del CLI: `[mcpwasm-local] listo: 1 skill(s) verificadas y cargadas (e2e_sum)`
  — el HOST REAL verificó el `tool_sha256`, no nuestro propio código.
- `initialize` → responde como servidor MCP real (`protocolVersion: "2025-06-18"`,
  `serverInfo: { name: "mcpwasm-local", version: "0.11.1" }`).
- `tools/list` → expone `e2e_sum` con el `inputSchema` EXACTO que `defineTool()`
  derivó de Zod (mismo `$schema`, `properties`, `required`, `additionalProperties`) —
  además de un segundo tool `get_skill_guide`, agregado automáticamente por el host
  para servir el `SKILL.md` verificado (no generado por `fastwebmcp`; comportamiento
  propio del host, documentado aquí porque cambia lo que un cliente real ve).
- `tools/call('e2e_sum', { a: 19, b: 23 })` → `{ "content": [{ "type": "text", "text":
  "42" }], "structuredContent": { "result": 42 }, "isError": false }` — **19 + 23 = 42,
  computado por el sandbox QuickJS-wasm real** ejecutando el `handlerBody` que se le
  pasó a `toMcpwasmSkillSource()`. Input deliberadamente distinto al usado en el
  ejemplo de CONTRACT-42 (no el mismo par ya visto), para descartar un valor
  hardcodeado en cualquier capa.

## Conclusión

`toMcpwasmSkillSource()` no solo produce JS sintácticamente válido (lo único que
CONTRACT-42 había probado): produce un skill mcpwasm genuinamente funcional,
verificado por hash por el host real, descubrible y ejecutable por cualquier cliente
MCP real. Es la verificación más fuerte que tiene el proyecto hasta ahora — el paquete
publicado, ejercitado contra los DOS runtimes reales que promete soportar, sin mocks en
ningún extremo.

## Limpieza

Servidor HTTP del test WebMCP: detenido. Pestaña del navegador real: cerrada. Servidor
HTTP del test mcpwasm: detenido. Proceso del CLI: terminado (`SIGTERM`) al finalizar el
cliente. Todo el directorio scratch (`e2e-real-test/`, incluidos `entry.ts`,
`mcp-client.mjs`, `gen-skill.mjs`, el `tool.js`/`llms.txt` generados): borrado — vivía
fuera del repo, nunca se stageó. Nada huérfano.

## Pendientes / ítems de seguimiento

- No se agregó esta verificación como paso automático de CI: depende de red (descarga
  `@rckflr/mcpwasm` vía `npx` en el momento) y de un paquete de un tercero (aunque sea
  del mismo autor) — corre en contra del principio "sin red" que sostienen todos los
  gates deterministas de este proyecto. Queda como verificación manual, documentada
  aquí, repetible por cualquiera que quiera confirmarla de nuevo.
- Ninguna otra deuda nueva. Ningún bug encontrado en ninguno de los dos runtimes.
