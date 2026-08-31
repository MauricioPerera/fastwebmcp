# CONTRACT-51 — sideEffects: false y requisito de Node para el dev local — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-51-side-effects-and-node-docs.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `npm audit` | ✅ sin hallazgo | `found 0 vulnerabilities` |
| `sideEffects: false` es preciso | ✅ | grep exhaustivo, solo 3 constantes puras en `src_ts/` |
| `sideEffects: false` no rompe nada | ✅ | typecheck/test/build corridos DESPUES del cambio |
| README documenta Node 23.6+ para dev local | ✅ | cita del propio comentario de CI + CONTRACT-43 |
| Gates | ✅ | `validate_specs.py`, `validate_changelog.py` en verde |

## Origen

Continuacion de la auditoria ("seguimos con algo mas de fastwebmcp", ronda 5). En vez de
lanzar otro agente de investigacion amplia (rendimientos decrecientes tras 4 rondas
previas), se hicieron dos chequeos directos, rapidos y verificables a mano.

## Chequeo 1 — npm audit

```
npm audit
-> found 0 vulnerabilities
```

Sin hallazgo, nada que hacer.

## Chequeo 2 — sideEffects

`package.json` no declaraba `sideEffects`. Verificado con grep que ninguno de los 7
archivos de `src_ts/` tiene una sentencia a nivel de modulo fuera de
`export`/`import`/`interface`/`function` salvo tres constantes puras en
`define-tool.ts` (`NAME_PATTERN`, `NAME_BUDGET`, `DESCRIPTION_BUDGET` -- un regex y dos
numeros, sin ejecutar nada al definirse). El paquete es genuinamente libre de efectos
secundarios al import -- agregar `"sideEffects": false` es preciso, y permite a
bundlers (webpack/rollup) hacer tree-shaking real cuando un consumidor solo usa algunas
de las 7 funciones exportadas.

## Chequeo 3 — documentacion del requisito de Node

`README.md` no decia que version de Node hace falta para correr `npm test`
localmente. `engines.node: ">=18"` en `package.json` aplica a quien INSTALA el paquete
publicado (solo consume `dist/*.js`, JS plano ya compilado) -- pero `npm test` corre
`node --test tests_ts/**/*.test.ts`, que depende de la ejecucion nativa de `.ts` de
Node. Verificado contra la fuente ya citada en CONTRACT-43 (release notes oficiales de
Node, no una afirmacion nueva): "unflagged by default since Node v23.6.0" -- exactamente
por lo que la CI corre en Node 24, no en el 18 que declara `engines`. Un contribuidor con
Node 18-22 (que satisface `engines`) se choca con `npm test` sin ninguna pista de por
que -- ahora documentado explicitamente.

## Cambios

`package.json`: agregado `"sideEffects": false`.

`README.md`, seccion "Development / methodology": nuevo parrafo aclarando la
distincion entre `engines.node: ">=18"` (consumidores del paquete publicado) y Node
23.6+ (necesario para correr `npm test` localmente).

## Verificacion (despues del cambio, no solo antes)

```
npm run typecheck   -> exit 0
npm test            -> 55/55 verde
npm run build       -> exit 0
python scripts/validate_specs.py specs      -> OK, 51 archivos
python scripts/validate_changelog.py        -> OK
```

## Pendientes / seguimiento

- NO se publico a npm ni se taggeo -- este contrato SI toca `package.json` (metadata
  publicada, `sideEffects`), pendiente de confirmacion explicita del usuario.
