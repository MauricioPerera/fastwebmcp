# CONTRACT-46 — fastwebmcp-start: quickstart real contra el paquete publicado — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-46-fastwebmcp-start.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `npm install` real | ✅ | 52 paquetes, `npm audit`: `0 vulnerabilidades` |
| `node smoke/mock-smoke.mjs` | ✅ | `PASS`, mensaje real de Zod capturado (ver detalle) |
| `node smoke/mcpwasm-bridge.mjs` | ✅ | `PASS`, `tool_sha256` real impreso |
| `npm run build` | ✅ | `demo/dist/{imperative,declarative}-demo.js` generados |
| 5 URLs reales vía `curl` | ✅ | 5/5 `200` |
| Demo Imperativa, Browser pane sin WebMCP | ✅ | mensaje de fallback correcto |
| Demo Imperativa, Chrome real (v152) | ✅ | `executeTool()` real, DOM actualizado |
| Demo Declarativa, Chrome real | ✅ | atributos reales en el DOM |

## Origen de este contrato

El usuario compartió la respuesta de OTRA instancia de IA a la que le pidió analizar
`fastwebmcp`. Esa respuesta describía, en detalle, un directorio `fastwebmcp-start/`
con demos + smoke tests + resultados de ejecución — nada de eso existía en este repo ni
en ningún otro lugar verificable (`find` sobre todo `D:/Repo/fastmcp` no encontró
ningún `fastwebmcp-start`). Se lo señalé al usuario como contenido no verificado de una
sesión ajena. El usuario confirmó que era exactamente eso, y pidió construir el mismo
scaffold pero de verdad, acá, verificado.

## T1 — Demos contra el paquete real

`fastwebmcp-start/demo/{imperative,declarative}-demo.ts`: mismo código que
`examples/{imperative,declarative}-demo.ts` del repo principal, con el único cambio
real — `import ... from 'fastwebmcp'` en vez de `'../src_ts/index.ts'`.
`fastwebmcp-start/demo/index.html`: pieza nueva, no existía en ningún lado, enlaza las
dos demos.

## T2 — Smoke tests, Node puro

`smoke/mock-smoke.mjs`: `registerTool()` contra `createWebMcpMock()` con el paquete
REAL instalado desde npm. Corrido de verdad:

```
[mock-smoke] invokeTool("add_todo", { text: "Buy milk" }) -> "Added: Buy milk"
[mock-smoke] invokeTool("add_todo", { text: "" }) correctly rejected by Zod
[mock-smoke] defineTool() with an empty name threw as expected
[mock-smoke] PASS
```

El regex del mensaje de error de Zod (`/too_small|String must contain|min|Invalid/i`)
no se adivinó y se dejó sin correr — se escribió, se corrió, y pasó al primer intento;
de haber fallado, se habría ajustado al mensaje real antes de commitear.

`smoke/mcpwasm-bridge.mjs`: `toMcpwasmSkillSource()` con el paquete real. Corrido:

```
[mcpwasm-bridge] wrote smoke/out/sum_numbers.tool.js
[mcpwasm-bridge] tool_sha256: 56161ab846c1eb0d8cd39d7fa198ea73e7f0617a6be016ef02c6fae68a9c2637
[mcpwasm-bridge] PASS (syntax-valid; see README for verifying against the real mcpwasm CLI)
```

No corre el CLI real de mcpwasm (eso ya se hizo, a mano, en CONTRACT-45) — deliberado,
documentado en el README de `fastwebmcp-start/`, mismo principio "sin red en lo
automatizado" que sostiene el resto del proyecto.

## Verificación de las 5 URLs (real, no supuesta)

`npx http-server . -p 8347` sirviendo `fastwebmcp-start/`, `curl` contra cada una:

```
demo/index.html -> 200
demo/imperative-demo.html -> 200
demo/declarative-demo.html -> 200
demo/dist/imperative-demo.js -> 200
demo/dist/declarative-demo.js -> 200
```

## Verificación en dos navegadores reales

- **Browser pane sandboxeada** (sin `document.modelContext`): la demo Imperativa
  muestra el mensaje de fallback correcto — confirma que el no-op funciona en un
  navegador sin soporte, no solo en teoría.
- **Chrome real del usuario** (v152, con soporte): `document.modelContext.getTools()` ->
  `["add_todo"]`; `executeTool('add_todo', { text: 'Comprar leche' })` ->
  `"Added: Comprar leche"`, con el `<li>` real apareciendo en el DOM. Demo Declarativa:
  `form.getAttribute('toolname')` -> `"submit_support_request"`,
  `tooldescription` -> el texto real, `topic.getAttribute('toolparamdescription')` ->
  el texto real.

## Limpieza

Servidor HTTP local: detenido. Pestañas de ambos navegadores (Browser pane y Chrome
real): cerradas. `node_modules/`, `demo/dist/`, `smoke/out/` de `fastwebmcp-start/`:
gitignorados, nunca stageados.

## Pendientes / ítems de seguimiento

- Ninguno nuevo. `fastwebmcp-start/` queda como artefacto permanente del repo (a
  diferencia del scratch descartado de CONTRACT-45) — cualquiera puede clonarlo y
  correr los mismos smoke tests contra la versión de `fastwebmcp` que tenga publicada
  en ese momento.
