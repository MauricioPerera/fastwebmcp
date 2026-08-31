# CONTRACT-49 — .gitattributes para las estadisticas de lenguaje de GitHub — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-49-fix-language-stats.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| Problema real (repo reportado como Python) | ✅ | `gh api .../languages`: Python 755148 vs TypeScript 34552 |
| Causa confirmada | ✅ | `du -sb scripts tests` ~2MB vs `src_ts/*.ts` ~35KB |
| `.gitattributes` cubre `scripts/`/`tests/` (recursivo) | ✅ | `git check-attr` en archivo anidado (`scripts/vendor/...`) |
| `src_ts/` NO afectado | ✅ | `git check-attr` -> `unspecified` |
| README wording pareja con gh-pages | ✅ | "Chrome 149" -> "Chrome 149+" |
| Gates | ✅ | `validate_specs.py`, `validate_changelog.py` en verde |

## Origen

Continuacion del flujo de auditoria ("seguimos con algo mas de fastwebmcp",
CONTRACT-47/48). Un agente de auditoria dedicado (read-only) investigo angulos no
cubiertos en las dos rondas anteriores: opciones de `registerTool()` contra el spec
completo, estado de shipping de WebMCP, freshness del puente mcpwasm, y version de
dependencias. De los cuatro, el unico hallazgo genuinamente accionable fue el de
estadisticas de lenguaje en GitHub -- los otros tres se descartaron (ver detalle abajo).

## Verificacion independiente (no solo confiado el hallazgo del agente)

```
gh api repos/MauricioPerera/fastwebmcp/languages
-> {"Python":755148,"TypeScript":34552,"HTML":5045,"JavaScript":3489}

ls -la .gitattributes
-> No such file or directory (confirmado que no existia)

du -sb scripts tests knowledge .agents | sort -rn
-> tests: 1066591, scripts: 995423, knowledge: 536900, .agents: 69350

find scripts tests -type f | sed 's/.*\./\./' | sort | uniq -c
-> 72 .py, 67 .pyc (verificado con `git ls-files` que los .pyc NO estan trackeados --
   gitignorados correctamente, solo artefactos locales de __pycache__)
```

Confirmado ademas contra una fuente independiente de terceros: el repo hermano
`mcpwasm` (mismo autor) tiene `docs/integrations/fastwebmcp-review.md`, escrito el mismo
dia, que senala exactamente este mismo problema de discoverability npm/GitHub para
`fastwebmcp` -- no es una preocupacion inventada por el agente de auditoria de esta
sesion.

## Los otros tres candidatos investigados (descartados)

1. **Opciones de `registerTool()` vs. el spec real.** `ModelContextRegisterToolOptions`
   en el spec tiene exactamente `exposedTo` y `signal` -- `RegisterToolOptions` en
   `src_ts/register-tool.ts` ya los tiene ambos. Sin gap.
2. **Estado de shipping de WebMCP.** Verificado contra
   `github.com/webmachinelearning/webmcp/blob/main/implementation-status.md` (fuente
   primaria del spec): sigue en origin trial en Chrome estable (152 al momento de
   escribir esto), no shippeado por default. El reclamo de `README.md`/`docs.html` sigue
   siendo cierto -- solo se encontro la inconsistencia trivial de redaccion arreglada en
   T2.
3. **Freshness del puente mcpwasm.** Sin drift que rompa las asunciones de
   `to-mcpwasm-skill.ts` -- el propio doc de review de `mcpwasm` confirma que el formato
   de `tool.js` que genera fastwebmcp sigue siendo correcto.
4. **Version de dependencias.** `zod`/`esbuild` estan pineados a su version exacta mas
   reciente (`^4.5.4`, `^0.28.2`, sin gap). `typescript` esta dos majors atras
   (`^5.7.3` vs `7.0.2`, el nuevo compilador reescrito en Go, `tsgo`) -- real, pero un
   salto de 2 majors de un compilador reescrito desde cero no es un cambio de bajo
   riesgo para hacer como parte de este contrato; queda fuera de alcance, mencionado
   para consideracion futura, no urgente.

## T1 — .gitattributes

Primer intento: `scripts/ linguist-vendored=true` (sin `**`) -- `git check-attr` mostro
`unspecified`, el patron no matcheaba nada (un `/` final solo, sin glob, no es
suficiente en la sintaxis de gitattributes que usa `git check-attr`). Corregido a
`scripts/**`/`tests/**`, verificado que si matchea, incluidos subdirectorios anidados:

```
git check-attr linguist-vendored -- scripts/validate_contracts.py
-> linguist-vendored: true
git check-attr linguist-vendored -- tests/test_versioning.py
-> linguist-vendored: true
git check-attr linguist-vendored -- scripts/vendor/codex-security/finalize_scan_contract.py
-> linguist-vendored: true
git check-attr linguist-vendored -- src_ts/define-tool.ts
-> linguist-vendored: unspecified   (confirma que el codigo real NO quedo vendorizado)
```

Nota: las estadisticas de lenguaje que muestra GitHub en la UI/API se recalculan de
forma asincrona tras el push -- no verificable sincronamente en esta sesion. La
evidencia verificada aca es que `.gitattributes` esta bien formado y que Git lo
interpreta exactamente como se espera (determinista, local).

## T2 — Redaccion del origin trial

`README.md` linea 11: "Chrome 149" -> "Chrome 149+", igual que las 4 apariciones ya
consistentes en `gh-pages` (`git show gh-pages:index.html`, lineas 787/876/937/998).

## Verificacion final

```
python scripts/validate_specs.py specs     -> OK, 49 archivos
python scripts/validate_changelog.py       -> OK
```

## Pendientes / seguimiento

- NO se publico a npm ni se taggeo -- este contrato no toca `src_ts/` ni `dist/`, no hay
  nada que publicar. Si se quiere un tag igual (por consistencia con el patron de otros
  contratos "no dist/ change"), es una decision del usuario, no automatica.
- TypeScript 7 (`tsgo`) queda anotado como salto de major pendiente de evaluacion
  deliberada, no urgente -- ver seccion de candidatos descartados arriba.
