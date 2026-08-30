# Contrato 41 — Dejar el paquete listo para publicar a npm (sin publicar)

Prerrequisitos: CONTRACT-40 cerrado (todas las capacidades de `DEFINITION.md`
construidas y verificadas en vivo). El usuario pidio los comandos para publicar el
mismo — este contrato prepara el paquete; `npm publish` en si mismo NO se ejecuta desde
esta sesion (requiere credenciales npm del usuario).

> Capa: contrato de ejecución. Sin task contracts CCDD nuevos — todo es configuracion de
> build/paquete y documentacion, verificado por gates + una instalacion real del tarball
> empaquetado en un proyecto scratch aislado.

## T1 — Build real del paquete (distinto del bundle de examples/)

Hasta CONTRACT-40, `src_ts/` no tenia forma de compilarse a JS distribuible: el
`tsconfig.json` de desarrollo usa `noEmit: true` + `allowImportingTsExtensions: true`
(necesario para que `node --test` ejecute `.ts` nativo). `tsconfig.build.json` nuevo
(extiende el de desarrollo): `noEmit: false`, `declaration: true`,
`rewriteRelativeImportExtensions: true` (TypeScript 5.7+, confirmado instalado 5.9.3) —
reescribe los imports `.ts` a `.js` en el output SIN bundlear (a diferencia del bundle de
`examples/`, que si bundlea zod completo porque es para un navegador standalone). Emite
un archivo `.js`+`.d.ts` por modulo de `src_ts/`, con `zod` como import externo intacto
(nunca se importa a runtime dentro de la libreria — solo se usan metodos de instancia
sobre el schema que el consumidor pasa).

## T2 — package.json listo para publicar

Quita `"private": true`; agrega `main`/`types`/`exports`/`files` (`["dist"]`, NO
`src_ts`/`tests_ts`/`examples`), `repository`/`homepage`/`bugs`/`keywords`/`license`
(`MIT`, ya en `LICENSE`), `engines.node >= 18`. Scripts nuevos: `build` (corre
`tsconfig.build.json`), `prepublishOnly` (`typecheck && test && build` — npm lo corre
solo AUTOMATICAMENTE antes de un `publish` real, red de seguridad final). Version fijada
a `0.1.0` (primer publish, no `0.0.1` — ya paso por 7 contratos verificados).

## T3 — README real del paquete (no la plantilla KDD)

El `README.md` de la raiz seguia siendo el generico de la plantilla KDD (44.5kB,
trilingue, sobre OKF/CCDD) — `init_project.py --apply` solo habia reemplazado el H1
titulo, no el cuerpo. npm publica SIEMPRE el `README.md` de la raiz sin importar
`files`; un consumidor viendo la pagina de npm hubiera visto documentacion de
metodologia, no de la libreria. Reescrito a documentacion real de `fastwebmcp`:
instalacion, ambas APIs con ejemplo, harness de testing, superficie de API, referencia a
KDD para quien quiera contribuir.

## Criterios de aceptación

- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_okf.py knowledge` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] `npm run typecheck` exit 0.
- [ ] `npm test` verde (39 tests).
- [ ] `npm run build` exit 0, genera `dist/*.js`+`dist/*.d.ts` con imports reescritos a
  `.js` (no `.ts`) y sin `zod` bundleado.
- [ ] `npm pack --dry-run` — nombre `fastwebmcp` disponible en el registro (verificado:
  `npm view fastwebmcp` devuelve 404), tarball NO incluye `src_ts`/`tests_ts`/`examples`.
- [ ] Instalacion real del tarball empaquetado (`npm pack` real, sin tocar el registro)
  en un proyecto scratch aislado: los 6 exports publicos resuelven y un roundtrip
  `registerTool` -> `createWebMcpMock` -> `invokeTool` corre correctamente contra el
  paquete YA EMPAQUETADO (no contra `src_ts/` en desarrollo).

## Restricciones

- Tocar SOLO: `package.json`, `tsconfig.build.json` (nuevo), `README.md`, `.gitignore`,
  `CHANGELOG.md`, `docs/reports/CONTRACT-41-REPORT.md`.
- Sin dependencias nuevas.
- NO ejecutar `npm publish` (ni `--dry-run` con intencion de que cuente como el publish
  real) desde esta sesion — es accion explicita del usuario, con sus credenciales.
- NO commitear (se commitea por tarea verificada, fuera de este contrato).
- ABORTAR SI: el nombre `fastwebmcp` ya estuviera tomado en el registro npm — no se
  activó (`npm view fastwebmcp` -> 404, disponible).

## Checklist antes de delegar

- [x] RECON corrido: `npx tsc --version` (5.9.3, soporta
  `rewriteRelativeImportExtensions`), `npm view fastwebmcp` (404, nombre libre),
  `npm audit` sobre el estado final (0 vulnerabilidades).
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: la verificacion no se detiene en `npm pack --dry-run` (que no prueba que
  el contenido REAL del tarball funcione) — se instala el tarball empaquetado de verdad
  en un proyecto aislado y se corre un roundtrip real contra el paquete instalado, no
  contra el codigo fuente en desarrollo.
- [x] Perímetro declarado arriba, T1/T2/T3 secuenciales (T2 depende de T1 para
  `main`/`types`; T3 es independiente pero se hizo despues por orden de descubrimiento).
- [x] Condición de aborto explícita arriba (no se activó).
