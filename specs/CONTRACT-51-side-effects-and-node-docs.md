# Contrato 51 — sideEffects: false y requisito de Node para el dev local

Prerrequisitos: CONTRACT-50 cerrado. Auditando el proyecto a pedido del usuario
("seguimos con algo mas de fastwebmcp") se hicieron dos chequeos directos (sin agente,
verificados a mano):

1. `npm audit` sobre el arbol real de dependencias -> `found 0 vulnerabilities`. Sin
   hallazgo.
2. `package.json` no declara `sideEffects`. Verificado con `grep` que `src_ts/` no tiene
   NINGUNA sentencia a nivel de modulo fuera de `export`/`import`/`interface`/`function`
   salvo tres constantes puras (`NAME_PATTERN`, `NAME_BUDGET`, `DESCRIPTION_BUDGET` en
   `define-tool.ts`, ninguna con efecto -- solo literales). El paquete es
   genuinamente libre de efectos secundarios al importar, pero no lo declara, lo que le
   impide a bundlers (webpack/rollup) hacer tree-shaking con confianza cuando un
   consumidor importa solo algunas de las 7 funciones exportadas.
3. El README no menciona que version de Node hace falta para correr `npm test`
   localmente. `engines.node: ">=18"` describe a quien INSTALA el paquete publicado
   (consume `dist/*.js`, JS plano compilado, no necesita nada especial) -- pero
   `npm test` corre `node --test tests_ts/**/*.test.ts`, que depende de la ejecucion
   nativa de `.ts` de Node, "unflagged by default since Node v23.6.0" (cita textual del
   comentario en `.github/workflows/validate.yml`, a su vez sourceada de las release
   notes oficiales de Node en CONTRACT-43). Un contribuidor con Node 18-22 (que satisface
   `engines`) se choca sin ninguna pista de por que.

> Capa: contrato de ejecucion. Sin task contract CCDD ni oraculo -- metadata de
> `package.json` y documentacion, sin cambios en `src_ts/` ni `tests_ts/`.

## T1 — sideEffects: false

`package.json`: agregado `"sideEffects": false` (campo estandar que leen
webpack/rollup/esbuild para tree-shaking).

## T2 — Documentar el requisito de Node para dev local

`README.md`, seccion "Development / methodology": nuevo parrafo aclarando que
`npm test` necesita Node 23.6+, distinto del `engines.node: ">=18"` que aplica a quien
instala el paquete.

## Criterios de aceptación

- [ ] `npm run typecheck` exit 0 (sin regresion por el cambio de `package.json`).
- [ ] `npm test` verde, 55 tests (sin regresion).
- [ ] `npm run build` exit 0 (sin regresion).
- [ ] `package.json` contiene `"sideEffects": false`.
- [ ] `README.md` menciona "23.6" en la seccion de Development.
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.

## Restricciones

- Tocar SOLO: `package.json`, `README.md`, `specs/CONTRACT-51-side-effects-and-node-docs.md`,
  `docs/reports/CONTRACT-51-REPORT.md`, `CHANGELOG.md`.
- No tocar `src_ts/` ni `tests_ts/` -- si `sideEffects: false` rompiera algo (indicaria
  un efecto secundario real no detectado por el grep), la correccion seria revertir el
  campo, no tocar el codigo fuente dentro de este contrato.
- NO publicar a npm ni taggear todavia sin pedido explicito -- este bump SI toca
  `package.json` (metadata publicada), asi que amerita confirmacion antes de publicar.
- ABORTAR SI: `npm test`/`npm run build` fallaran despues de agregar `sideEffects: false`
  -- indicaria un efecto secundario real que el grep no detecto. No se activo.

## Checklist antes de delegar

- [x] RECON corrido: `npm audit` (sin hallazgo), grep exhaustivo de sentencias a nivel
  de modulo en los 7 archivos de `src_ts/` (solo 3 constantes puras, ningun efecto),
  y la cita textual verificada contra el propio comentario de CI y CONTRACT-43 (no una
  afirmacion nueva sin respaldo).
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: se corrio la suite completa DESPUES de agregar `sideEffects: false` para
  confirmar que no hay regresion -- no alcanzaba con "el grep no encontro nada", habia
  que confirmar que el build/test siguen pasando con el campo puesto.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condicion de aborto: no se activo.
