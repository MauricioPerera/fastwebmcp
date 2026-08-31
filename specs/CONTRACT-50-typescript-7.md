# Contrato 50 — Bump a TypeScript 7 (compilador nativo Go)

Prerrequisitos: CONTRACT-49 cerrado. `npm view typescript version` (CONTRACT-49) habia
encontrado que el pin (`^5.7.3`) estaba dos majors atras de `latest` (`7.0.2`), marcado
como "no urgente, requiere evaluacion deliberada" porque TypeScript 7 es una reescritura
completa del compilador en Go (Project Corsa), no un release incremental mas. A pedido
del usuario, se evaluo antes de tocar nada.

RECON (verificado contra fuentes primarias, no memoria):
- Anuncio real y fecha de GA (8 de julio de 2026) confirmados via busqueda web.
- Los breaking changes documentados del salto estan en la frontera 5.x->6.0, NO en
  6.0->7.0: `strict` default `true`, `module` default `esnext`,
  `noUncheckedSideEffectImports` default `true`, `types` default `[]` (deja de levantar
  `@types/node` implicito), target ES5 eliminado, `downlevelIteration` eliminado, modulos
  legacy (AMD/UMD/SystemJS) eliminados, `baseUrl` eliminado, keyword `namespace`
  prohibido.
- `tsconfig.json` de fastwebmcp YA declara explicitamente: `strict: true`,
  `types: ["node"]`, `target: "ES2022"`, `module: "NodeNext"` -- ninguno de los defaults
  nuevos cambia nada porque ya estan fijados a mano.
- `grep` en `src_ts/` confirmo cero usos de `namespace` o imports de solo efecto
  secundario (`import 'x';` sin binding) -- los dos riesgos que si podian aplicar.
- La API programatica estable del compilador no viaja en 7.0 -- irrelevante, fastwebmcp
  invoca `tsc` como CLI (`npm run typecheck`/`build`), nunca via `ts.createProgram` ni
  similar.

> Capa: contrato de ejecucion. Sin task contract CCDD ni oraculo -- bump de
> devDependency, sin cambios en `src_ts/` ni `tests_ts/`.

## T1 — Bump de devDependency

`typescript`: `^5.7.3` -> `^7.0.2` en `package.json`/`package-lock.json`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` (typecheck) exit 0 contra TypeScript 7 real (no simulado).
- [ ] `node --test tests_ts/**/*.test.ts` verde (55 tests) contra el `dist/` generado
  por TypeScript 7.
- [ ] `npm run build` (dist/) y `npm run build:examples` (esbuild) ambos exit 0.
- [ ] Diff de `dist/*.js` y `dist/*.d.ts` entre TypeScript 5.7.3 y 7.0.2: sin diferencias
  de comportamiento -- solo estilo de comillas en imports/exports emitidos (`"..."` vs
  `'...'`), verificado archivo por archivo antes de aceptar el bump.

## Restricciones

- Tocar SOLO: `package.json`, `package-lock.json`,
  `specs/CONTRACT-50-typescript-7.md`, `docs/reports/CONTRACT-50-REPORT.md`,
  `CHANGELOG.md`.
- No tocar `src_ts/`, `tests_ts/`, ni `tsconfig*.json` -- si el bump exigiera cambiar
  alguno de estos, séria evidencia de que el riesgo es mayor al estimado y el contrato
  debería abortar, no seguir adelante silenciosamente.
- NO publicar a npm ni taggear todavia sin pedido explicito -- aunque el bump SI afecta
  el build (`dist/` se regenera con el nuevo compilador), amerita confirmacion del
  usuario antes de publicar, no automatica.
- ABORTAR SI: el diff de `dist/` mostrara una diferencia de comportamiento real (no solo
  de estilo), o si `npx tsc --noEmit`/`npm test`/`npm run build` fallaran contra
  TypeScript 7. No se activo -- probado en un `node_modules` temporal
  (`npm install --no-save`) ANTES de tocar `package.json`, exactamente para poder
  abortar sin ensuciar nada si algo fallaba.

## Checklist antes de delegar

- [x] RECON corrido: anuncio real de TS7, breaking changes documentados, tsconfig propio
  de fastwebmcp revisado campo por campo contra esa lista, grep de los dos riesgos de
  codigo que si aplicaban.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: se probo con `npm install --no-save` PRIMERO (sin tocar package.json),
  se corrio typecheck/test/build, y se COMPARO el `dist/` resultante linea por linea
  contra el `dist/` generado por la version pineada anterior -- no alcanzaba con "el
  build no tira error", habia que confirmar que el output es equivalente, no solo que
  compila.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condicion de aborto: no se activo -- typecheck/test/build limpios, diff de `dist/`
  sin diferencias de comportamiento.
