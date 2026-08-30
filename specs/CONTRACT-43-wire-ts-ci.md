# Contrato 43 — Conectar la CI real de TypeScript (typecheck + test + build)

Prerrequisitos: CONTRACT-42 cerrado, `fastwebmcp@0.2.1` publicado (docs). Auditoria del
estado del proyecto encontro que `.github/workflows/validate.yml` nunca corrio nada de
TypeScript: el paso "Run project test suite" seguia siendo el placeholder `echo` de la
plantilla KDD original, y `node-version: '20'` seguia fijado para el contrato de
ejemplo multi-lenguaje que `init_project.py --apply` borro hace muchos contratos.
Presentado al usuario antes de tocar nada (con el riesgo real: conectar el placeholder
tal cual hubiera roto la CI, porque nuestros tests usan ejecucion nativa de `.ts` de
Node, no soportada en Node 20); confirmo seguir.

**RECON (bloqueante, antes de editar el workflow):** verificado contra la fuente
oficial (release notes de Node v23.6.0, no memoria): `--experimental-strip-types` se
saco de atras de flag en esa version — `node archivo.ts` funciona sin flags desde
entonces. Node 24 (ya usado en desarrollo local, ya reflejado en `@types/node@^24.0.0`)
lo tiene. Con eso confirmado, se corrio localmente el mismo flujo que la CI correria:
`rm -rf node_modules && npm ci && npm run typecheck && npm test && npm run build &&
npm run build:examples` — los cinco pasos verdes ANTES de tocar el YAML.

> Capa: contrato de ejecución. Sin task contracts CCDD nuevos — es configuración de CI,
> verificada por ejecución real del workflow en GitHub Actions, no por oráculos de
> función.

## T1 — Wiring del workflow

`.github/workflows/validate.yml`: el paso "Set up Node.js" pasa de `node-version: '20'`
(justificado por un contrato de ejemplo ya borrado) a `'24'`, mas `cache: 'npm'`. El
paso placeholder "Run project test suite" se reemplaza por seis pasos reales:
`npm ci`, `npm run typecheck`, `npm test` (2×, mismo criterio anti-flaky que ya usa la
suite Python de este mismo workflow), `npm run build`, `npm run build:examples` — en la
matriz dual-OS (`ubuntu-latest` + `windows-latest`) ya existente, sin tocarla.

## T2 — Badge de CI en el README

`README.md`: agregado el badge `CI` (apunta al workflow real, no decorativo — recien
ahora que el workflow verifica TypeScript de verdad tiene sentido mostrarlo).

## Criterios de aceptación

- [ ] `python -c "import yaml; yaml.safe_load(open('.github/workflows/validate.yml'))"`
  — YAML bien formado.
- [ ] `python scripts/validate_contracts.py knowledge/contracts` exit 0 (sin cambios,
  sanity check).
- [ ] `python scripts/validate_specs.py specs` exit 0.
- [ ] `python scripts/validate_changelog.py` exit 0.
- [ ] La corrida REAL de GitHub Actions sobre el push de este contrato termina en
  verde en AMBOS runners (`ubuntu-latest` y `windows-latest`) — verificado con
  `gh run list`/`gh run view`, no solo "deberia andar".

## Restricciones

- Tocar SOLO: `.github/workflows/validate.yml`, `README.md`,
  `specs/CONTRACT-43-wire-ts-ci.md`, `docs/reports/CONTRACT-43-REPORT.md`,
  `CHANGELOG.md`.
- No tocar la matriz de OS existente, ni ningun paso Python ya presente.
- NO commitear hasta correr el RECON local completo (ya corrido, ver arriba).
- ABORTAR SI: el RECON local hubiera fallado en cualquiera de los 5 comandos — no se
  activó, los 5 corrieron verdes antes de tocar el YAML.

## Checklist antes de delegar

- [x] RECON corrido: version exacta de Node donde el type-stripping se destrabo
  (v23.6.0, fuente oficial), y el flujo completo (`npm ci` limpio incluido) verde en
  local antes de editar el workflow.
- [x] Todo criterio de aceptación tiene comando + resultado esperado — incluida la
  corrida real de CI, no una suposición de que "debería pasar".
- [x] Red-team: el riesgo real (Node 20 no soporta `.ts` nativo) se identifico ANTES
  de escribir el fix, no despues de que la CI fallara — evita el ciclo de "romper,
  arreglar, re-pushear" que hubiera costado una corrida entera en rojo.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condición de aborto explícita arriba (no se activó).
