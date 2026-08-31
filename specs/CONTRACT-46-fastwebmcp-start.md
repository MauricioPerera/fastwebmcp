# Contrato 46 — fastwebmcp-start: quickstart real contra el paquete publicado

Prerrequisitos: CONTRACT-45 cerrado (verificación real de extremo a extremo, hecha con
scripts scratch descartados al terminar). El usuario compartió la respuesta de OTRA
instancia de IA a la que le pidió analizar `fastwebmcp` — esa respuesta describía un
directorio `fastwebmcp-start/` con demos + smoke tests + bridge a mcpwasm que NO existía
en ningún lado (verificado: `find` no encontró nada así en el repo). Aclarado que era la
respuesta de otra sesión, no algo hecho acá. El usuario pidió construir ese mismo
scaffold de verdad, en este repo, verificado por mí.

> Capa: contrato de ejecución. Sin task contracts CCDD nuevos — `fastwebmcp-start/` es
> un paquete npm separado (su propio `package.json`, su propio `node_modules/`) que
> instala `fastwebmcp` como dependencia real, no un módulo de `src_ts/`. Nada que sellar
> con `tests_sha256`; se verifica por ejecución real, igual que CONTRACT-40/45.

## Por qué es distinto de `examples/`

`examples/` importa `../src_ts/index.ts` directamente — prueba el código fuente del
propio monorepo, el camino que usó cada contrato desde el 34. `fastwebmcp-start/` instala
`fastwebmcp` desde el registro real (`"fastwebmcp": "^0.2.0"` en su `package.json`) —
responde una pregunta distinta: "si yo fuera un consumidor nuevo, ¿`npm install
fastwebmcp` funciona de verdad como dice el README?". Los dos quedan, verifican cosas
distintas.

## T1 — Demos (paquete real)

`demo/imperative-demo.ts` y `demo/declarative-demo.ts`: misma lógica que
`examples/{imperative,declarative}-demo.ts`, con el único cambio real — el import viene
de `'fastwebmcp'`, no de una ruta relativa al monorepo. `demo/index.html` nuevo (no
existía en ningún lado): enlaza las dos demos.

## T2 — Smoke tests (Node puro, sin navegador)

`smoke/mock-smoke.mjs`: registra una tool con el paquete real contra
`createWebMcpMock()`, invoca, prueba que Zod rechaza input inválido de verdad (no
adivinado — el regex del mensaje de error se verificó corriendo el script), prueba el
fail-fast de `defineTool()`. `smoke/mcpwasm-bridge.mjs`: genera un `tool.js` real con
`toMcpwasmSkillSource()`, lo escribe a `smoke/out/` (gitignorado), verifica sintaxis con
`new Function()`. Ninguno de los dos toca red — coherente con el principio "sin red" de
todos los gates deterministas del proyecto; verificar contra el CLI real de mcpwasm
sigue siendo manual (documentado en el README de `fastwebmcp-start/`), igual que
CONTRACT-45.

## Criterios de aceptación

- [ ] `npm install` en `fastwebmcp-start/` — real, contra el registro npm, exit 0,
  `npm audit` sin vulnerabilidades.
- [ ] `node smoke/mock-smoke.mjs` — exit 0, con el mensaje de error real de Zod para
  input inválido capturado y verificado, no un regex adivinado sin correr.
- [ ] `node smoke/mcpwasm-bridge.mjs` — exit 0, `tool.js` generado y sintácticamente
  válido.
- [ ] `npm run build` (esbuild) — genera `demo/dist/*.js` sin error.
- [ ] Servidor real (`http-server`) sirviendo el directorio: las 5 URLs relevantes
  (`demo/index.html`, las 2 páginas HTML, los 2 bundles JS) responden `200` de verdad
  (`curl`, no supuesto).
- [ ] Demo Imperativa verificada en DOS navegadores reales: la Browser pane sandboxeada
  (sin WebMCP — confirma el fallback no-op) y el Chrome real del usuario (con WebMCP —
  `executeTool()` corre el handler real, actualiza el DOM real).
- [ ] Demo Declarativa verificada en el Chrome real: atributos `toolname`/
  `tooldescription`/`toolparamdescription` reales en el DOM real.
- [ ] Toda infraestructura efímera (servidor HTTP, pestañas del navegador) limpiada al
  terminar.

## Restricciones

- Tocar SOLO: `fastwebmcp-start/` (directorio nuevo completo: `package.json`,
  `.gitignore`, `README.md`, `demo/*.ts`, `demo/*.html`, `smoke/*.mjs` — `node_modules/`,
  `demo/dist/` y `smoke/out/` quedan gitignorados, ninguno se commitea),
  `specs/CONTRACT-46-fastwebmcp-start.md`, `docs/reports/CONTRACT-46-REPORT.md`,
  `CHANGELOG.md`.
- No tocar `examples/`, `src_ts/`, ni ningún contrato CCDD existente — este es un
  paquete nuevo y separado, no una modificación del que ya existe.
- Sin red en los smoke tests automatizados; la verificación contra el CLI real de
  mcpwasm queda documentada como manual, no automatizada (mismo principio que
  CONTRACT-45).
- ABORTAR SI: `npm install fastwebmcp` fallara, o alguno de los dos smoke tests fallara
  contra el paquete real — indicaría una regresión real en lo publicado. No se activó.

## Checklist antes de delegar

- [x] RECON: `npm view fastwebmcp version` -> `0.2.0` (el único publicado con código;
  0.2.1-0.2.5 son solo docs/CI) verificado antes de fijar la dependencia.
- [x] Todo criterio de aceptación tiene comando + resultado esperado, corrido de
  verdad, no supuesto.
- [x] Red-team: el smoke test de Zod no se conformó con "no lanzó" — se verificó el
  mensaje de error real corriendo el script antes de fijar el regex en el código
  commiteado, para no dejar una aserción que pase por accidente sobre cualquier
  rechazo genérico.
- [x] Perímetro declarado arriba, directorio nuevo autocontenido.
- [x] Condición de aborto explícita arriba (no se activó).
