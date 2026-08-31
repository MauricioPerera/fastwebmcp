# Contrato 49 — .gitattributes para las estadisticas de lenguaje de GitHub

Prerrequisitos: CONTRACT-48 cerrado. Auditando el proyecto a pedido del usuario
("seguimos con algo mas de fastwebmcp") se lanzo un agente de auditoria dedicado que
encontro, via `gh api repos/MauricioPerera/fastwebmcp/languages`, que GitHub reporta este
repo como `Python` (755148 bytes) por encima de `TypeScript` (34552 bytes) -- para una
libreria npm/TypeScript. Verificado de forma independiente en esta sesion (no solo
confiado el hallazgo del agente): `du -sb scripts tests` da ~2MB combinados
(`scripts/`: los gates Python de la plantilla KDD; `tests/`: su propia suite de tests),
contra ~35KB de `src_ts/*.ts` -- el codigo real de la libreria. Sin `.gitattributes` en
el repo (`ls .gitattributes` -> no existe). Corroborado de forma independiente: el propio
repo hermano `mcpwasm` (mismo autor) tiene un doc
(`docs/integrations/fastwebmcp-review.md`, escrito 2026-08-31) que senala exactamente
este mismo problema de discoverability en npm/GitHub.

De paso, la misma auditoria encontro una inconsistencia trivial de redaccion: `README.md`
dice "origin trial as of Chrome 149" (sin "+"), mientras que `docs.html`/`index.html` en
`gh-pages` ya dicen "Chrome 149+" de forma consistente en las 4 apariciones verificadas
(`git show gh-pages:index.html`, lineas 787/876/937/998). El reclamo en si sigue siendo
cierto -- WebMCP sigue en origin trial en Chrome estable 152 (verificado contra
`github.com/webmachinelearning/webmcp/blob/main/implementation-status.md`, fuente
primaria del propio spec) -- solo se pareja la redaccion.

> Capa: contrato de ejecucion. Sin task contract CCDD ni oraculo -- no hay codigo de
> `src_ts/` ni tests involucrados, es configuracion de metadata del repo.

## T1 — Agregar .gitattributes

Nuevo archivo `.gitattributes` en la raiz: marca `scripts/**` y `tests/**` como
`linguist-vendored=true`, la forma documentada de GitHub Linguist para excluir
directorios completos (recursivo, incluye subdirectorios como `scripts/vendor/`) de las
estadisticas de lenguaje sin tocar ningun archivo de esos directorios. Probado primero
con el patron sin `**` (`scripts/ linguist-vendored=true`) -- `git check-attr` mostro
`unspecified`, no matcheaba nada; corregido a `scripts/**`/`tests/**`, verificado que si
matchea (incluidos subdirectorios anidados como `scripts/vendor/codex-security/`).

## T2 — Parejar la redaccion del origin trial en README

`README.md` linea 11: "Chrome 149" -> "Chrome 149+", igual que la copia ya publicada en
`gh-pages`.

## Criterios de aceptación

- [ ] `.gitattributes` existe, sintaxis valida (formato `path/ linguist-vendored=true`,
  el mismo que documenta `github-linguist/linguist#generated-code`).
- [ ] `git check-attr linguist-vendored -- scripts/validate_contracts.py` reporta
  `linguist-vendored: set`.
- [ ] `git check-attr linguist-vendored -- tests/test_versioning.py` reporta
  `linguist-vendored: set`.
- [ ] `git check-attr linguist-vendored -- src_ts/define-tool.ts` reporta
  `linguist-vendored: unspecified` (no debe afectar el codigo real de la libreria).
- [ ] `README.md` dice "Chrome 149+", no "Chrome 149".
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.

## Restricciones

- Tocar SOLO: `.gitattributes`, `README.md`, `specs/CONTRACT-49-fix-language-stats.md`,
  `docs/reports/CONTRACT-49-REPORT.md`, `CHANGELOG.md`.
- No tocar ningun archivo dentro de `scripts/` ni `tests/` -- son los targets sellados de
  otros contratos (gates), este contrato solo cambia como GitHub los clasifica, no su
  contenido ni comportamiento.
- ABORTAR SI: `git check-attr` mostrara que `src_ts/` quedo marcado como vendored por
  error de patron (regresion real: el codigo de la libreria desapareceria de las
  estadisticas de lenguaje, el problema opuesto al que este contrato arregla). No se
  activo.

## Checklist antes de delegar

- [x] RECON corrido: `gh api repos/MauricioPerera/fastwebmcp/languages` (confirma el
  problema real, no solo confiado en el reporte del agente), `du -sb scripts tests`
  (confirma la causa), `ls .gitattributes` (confirma que no existe), y el doc de
  `mcpwasm` como corroboracion independiente de un tercero (mismo autor, contexto
  distinto).
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: el criterio de `src_ts/` como `unspecified` existe especificamente para
  detectar si el patron fuera demasiado amplio y vendorizara sin querer el codigo real --
  no alcanza con confirmar que `scripts/`/`tests/` quedaron marcados, hay que confirmar
  tambien que `src_ts/` NO quedo marcado.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condicion de aborto: no se activo.

## Nota sobre verificación

Las estadísticas de lenguaje de GitHub (`gh api repos/.../languages`) se recalculan de
forma asíncrona tras el push, no en el momento — este contrato verifica que el
`.gitattributes` está bien formado y que `git check-attr` lo interpreta como se espera
(evidencia local, determinista), no que el badge de GitHub ya cambió (eso requeriría
esperar y volver a consultar la API después de pushear, fuera del alcance verificable
síncronamente).
