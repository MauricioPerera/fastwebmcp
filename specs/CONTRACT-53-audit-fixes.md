# Contrato 53 — correcciones de auditoria FastWebMCP

Baseline: commit cde4e669, 71 tests TypeScript y 19/19 checks locales verificados.
El entorno tiene Node 24 y Python 3.14; no se asume navegador WebMCP ni Linux local.

## Objetivo

Resolver los siete hallazgos mediante los task contracts
`knowledge/contracts/audit-runtime-fixes.md` y `audit-scan-target.md`.
Conservar la API sincrona y ofrecer confirmacion asincrona del registro nativo.

## Criterios de aceptación

- [x] `node --test tests_ts/audit-regressions.test.ts` exit 0.
- [x] `python -m unittest tests/test_audit_scan_target.py` exit 0.
- [x] `npm run typecheck`, `npm test`, `npm run build`, `npm run build:examples` exit 0.
- [x] `python -m unittest discover -s tests -p "test_*.py"` exit 0, dos corridas.
- [x] `python scripts/preflight.py --agent` exit 0, 19/19 checks.
- [x] `npm pack --dry-run --json` incluye exports y declaraciones de las nuevas APIs.
- [x] `python scripts/validate_contracts.py knowledge/contracts` exit 0 con nuevos sellos.
- [x] Los tests preexistentes no aparecen modificados en `git diff --name-only`.

## Restricciones

- Tocar SOLO: fuentes declaradas en los nuevos task contracts, README, CHANGELOG,
  nuevos tests, contratos/indice KDD, esta spec y reporte del contrato.
- Sin nuevas dependencias ni publicacion del paquete.
- ABORTAR SI: hace falta cambiar un test preexistente o ejecutar una operacion real LSFA.
- Alcance local Windows: navegador real verificado en el reporte; matriz CI remota pendiente.

## Checklist antes de delegar

- [x] RECON: comandos y baseline observados; dependencias instaladas.
- [x] Nuevos oraculos independientes con reproducciones de la auditoria.
- [x] Perimetro de cambios declarado; sin trabajo concurrente de agentes.
- [x] Condiciones de aborto explicitas.
