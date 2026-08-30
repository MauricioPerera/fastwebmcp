# CONTRACT-43 — Conectar la CI real de TypeScript — REPORT

Fecha: 2026-08-30
Spec: `specs/CONTRACT-43-wire-ts-ci.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| YAML bien formado | ✅ | `python -c "import yaml; yaml.safe_load(...)"` |
| `python scripts/validate_contracts.py knowledge/contracts` | ✅ | `OK` (0 errores, 32 archivos) |
| `python scripts/validate_specs.py specs` | ✅ | `OK` (0 errores, 43 archivos) |
| `python scripts/validate_changelog.py` | ✅ | `0 error(es), 43 contrato(s) verificados` |
| Suite Python completa (`tests/`) | ✅ | exit 0 (antes: 1 fallo real, ver abajo) |
| Corrida REAL de GitHub Actions | ✅ **verde en ubuntu-latest Y windows-latest** | [run 33340221338](https://github.com/MauricioPerera/fastwebmcp/actions/runs/33340221338) |

## Hallazgo inicial que motivó este contrato

Auditoría del estado del proyecto (a pedido del usuario, "seguimos con algo más de
fastwebmcp") encontró que `.github/workflows/validate.yml` nunca había corrido nada de
TypeScript: el paso "Run project test suite" seguía siendo el placeholder `echo` de la
plantilla, intacto desde CONTRACT-34. Cada `typecheck`/`test`/`build` de los 9 contratos
anteriores se verificó manualmente en local — la CI nunca lo confirmó de forma
independiente.

## RECON antes de tocar el YAML

Fuente oficial, no memoria: release notes de Node v23.6.0 —
`module: unflag --experimental-strip-types` (PR #56350) — confirma que `node
archivo.ts` funciona sin flags desde esa versión. `node-version: '20'` en el workflow
(dejado de un contrato de ejemplo multi-lenguaje ya borrado por `init_project.py`) no lo
soporta. Antes de editar el YAML, corrido en local exactamente lo que la CI correría:
`rm -rf node_modules && npm ci && npm run typecheck && npm test && npm run build && npm
run build:examples` — los 5 pasos verdes.

## Dos bugs reales encontrados al mirar la corrida REAL (no supuestos)

El RECON local no los detectó porque el entorno local ya tenía `node_modules/` instalado
y ya tenía el README y la suite Python en el estado post-CONTRACT-41 — ninguna de las
dos condiciones que expone el bug se reproduce localmente sin partir de cero. Solo
mirar la corrida real de GitHub Actions (`gh run view`, no asumir que "debería andar")
los sacó a la luz:

**Bug 1 — orden del `npm ci`.** El primer push (`feae109`) puso `npm ci` en la posición
del placeholder viejo, MÁS ABAJO que "Run each contract's test_command" — que ya invoca
`node --test tests_ts/*.ts` antes en el archivo. Los 4 contratos TS con `zod` como
dependencia fallaron con `ERR_MODULE_NOT_FOUND` porque `node_modules/` todavía no
existía. Arreglado moviendo "Install Node dependencies" justo después de "Set up
Node.js", antes de cualquier gate que invoque `node`/`npm`.

**Bug 2 — `test_readme_mentions_changelog_en_and_es` desactualizado.** Parte de la suite
Python heredada de la plantilla (Contrato 14): exige que el README esté particionado por
`<a id="español">` en mitades EN/ES, cada una mencionando `CHANGELOG.md`. El README real
de fastwebmcp (CONTRACT-41) reemplazó legítimamente el formato bilingüe de la plantilla
por documentación propia del proyecto en inglés — una divergencia deliberada, no un bug
— asi que esta aserción viene siendo falsa (silenciosamente) desde CONTRACT-41: nadie
había vuelto a correr la suite Python COMPLETA (`tests/`, no solo los gates de Nivel 1)
desde entonces. Relajado al invariante que sigue siendo real siempre: el README menciona
`CHANGELOG.md` en algún lado — y de paso se agregó esa mención real (el README no lo
mencionaba en absoluto). Re-sellado `tests_sha256` en
`knowledge/contracts/versioning-plantilla.md` (el archivo de test es a la vez el
`target` y el oráculo de ese contrato — patrón autorreferencial del propio template) y
actualizada su documentación para prohibir reintroducir un requisito de formato de
README.

## T1 — Wiring final del workflow

`.github/workflows/validate.yml`: `node-version: '24'` + `cache: 'npm'`. "Install Node
dependencies" (`npm ci`) inmediatamente después de "Set up Node.js". Seis pasos reales
reemplazan el placeholder: `typecheck`, `test` ×2 (mismo criterio anti-flaky que la
suite Python ya usaba en este archivo), `build`, `build:examples` — sin tocar la matriz
dual-OS existente.

## T2 — Badge de CI

`README.md`: badge `CI` apuntando al workflow real (recién ahora tiene sentido — antes
hubiera sido decorativo, ya que el workflow no verificaba TypeScript). También se
agregó una sección "Changelog" (ver Bug 2).

## Verificación final (la más fuerte de todo el proyecto hasta ahora)

No "debería pasar" — se observó pasar: [run 33340221338](https://github.com/MauricioPerera/fastwebmcp/actions/runs/33340221338),
ambos runners (`ubuntu-latest` 1m31s, `windows-latest` 1m31s) verdes, los 32 pasos de
cada uno incluidos `TypeScript typecheck`, `Run TypeScript test suite (1/2)` y `(2/2)`,
`Build the published package (dist/)`, `Build the example bundles`. Suite Python
completa local: exit 0. `validate_test_commands.py`: los 4 contratos TS +
`versioning-plantilla` en `PASS`.

## Pendientes / ítems de seguimiento

- Ninguno nuevo de este contrato. La CI ahora verifica de verdad lo que hasta ahora solo
  yo verificaba a mano — cualquier regresión futura en `src_ts/`, el build, o el
  bundling de examples se va a ver en rojo en el próximo push, no descubierta
  meses después.
- Deuda descubierta y ya saldada en el mismo contrato (no diferida): el gap de la suite
  Python completa no corriéndose desde CONTRACT-41 hasta ahora.
