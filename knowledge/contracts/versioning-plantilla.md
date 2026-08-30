---
type: 'Task Contract'
title: 'Versionado de la plantilla: coherencia CHANGELOG/README/upgrade'
description: 'Test de coherencia que fija el versionado de la plantilla: CHANGELOG semver, mencion en README y nodo de upgrade enlazado desde el index.'
tags: ['versionado', 'changelog', 'upgrade', 'coherencia', 'tooling']

task: versioning-plantilla
intent: "Fijar por test de coherencia el versionado de la plantilla: CHANGELOG, README y nodo de upgrade no pueden desincronizarse."
target: tests/test_versioning.py
signature: "def test_changelog_first_entry_is_semver(self) -> None:"
test_command: "python -m unittest tests/test_versioning.py"
budget:
  cyclomatic_max: 5
  nesting_max: 3
tests: "tests/test_versioning.py"
tests_sha256: "2797f9e1b089c37a25abc27d7a06d8a5594ecfae53daa834306df3a78322345b"
touch_only: ['tests/test_versioning.py']
deps_allowed: []
forbids: ['network', 'subprocess']
---

# Contract: versioning-plantilla

## Intent
Que la plantilla tenga versión y quien la instanció pueda traer mejoras: CHANGELOG con
semver, README que lo anuncia y la historia de upgrade como nodo OKF. El test de
coherencia (target de este contrato) fija doc↔doc, patrón de
[agents-context-rule](./agents-context-rule.md). Spec:
`specs/CONTRACT-14-versionado-plantilla.md`; proceso: [metodología de
ejecución](../metodologia-ejecucion.md).

**Corrección (post-CONTRACT-43, fastwebmcp):** la versión original exigía que el README
tuviera el formato bilingüe EN/ES de la plantilla, particionado por
`<a id="español">`. Un proyecto instanciado puede reemplazar legítimamente el README por
documentación propia (fastwebmcp lo hizo desde CONTRACT-41: README propio en inglés, sin
secciones EN/ES) — exigir el formato viejo ahí es un falso positivo detectado recién al
conectar la CI real de TypeScript (nunca se había corrido la suite Python completa desde
el reemplazo del README). Relajado al invariante que sigue siendo real siempre: el
README menciona `CHANGELOG.md` en algún lado.

## Interface
```python
class TestVersioning(unittest.TestCase):
    def test_changelog_first_entry_is_semver(self) -> None: ...
    def test_readme_mentions_changelog(self) -> None: ...
    def test_upgrade_node_exists_and_indexed(self) -> None: ...
```
La "implementación" incluye los artefactos que el test fija: `CHANGELOG.md`,
`knowledge/plantilla-upgrade.md`, el enlace en `index.md` y la mención en el README.

## Invariants
- El test lee archivos con `pathlib`/`open` (UTF-8); sin red, sin subprocess, sin mocks.
- `CHANGELOG.md` existe y su primera entrada `## v` matchea `\d+\.\d+\.\d+`.
- README menciona `CHANGELOG.md` al menos una vez, en cualquier idioma/formato.
- `knowledge/plantilla-upgrade.md` existe y `knowledge/index.md` lo enlaza.
- Mensajes de aserción que nombran QUÉ falta y EN QUÉ archivo.
- Borrar la entrada semver del CHANGELOG o el enlace del index pone el test en rojo.

## Examples
- Repo tras la tarea: `python -m unittest tests/test_versioning.py` -> OK (3+ tests).
- Mutación: quitar toda mención de `CHANGELOG.md` del README -> el test falla nombrando
  el README.

## Do / Don't
- DO: regex simple para semver.
- DO: historia retroactiva del CHANGELOG destilada de `docs/reports/` (rastreable).
- DON'T: red, subprocess, editar specs/reportes históricos, crear tags (los crea el PM).
- DON'T: reintroducir un requisito de formato específico del README (bilingüe o
  cualquier otro) — un proyecto instanciado tiene su propio README legítimo.

## Tests
(Los tests están en `tests/test_versioning.py` — el target de este contrato. El dev
reemplaza el stub sellado y re-sella `tests_sha256` aquí al terminar.)

## Constraints
- PARAR y reportar si... la coherencia exigiera editar `tests/test_init_project.py`,
  `scripts/init_project.py` o estructura del index más allá del enlace nuevo.
