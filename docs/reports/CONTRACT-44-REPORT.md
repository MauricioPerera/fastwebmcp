# CONTRACT-44 — Apuntar el gate de secretos a src_ts/ — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-44-fix-secret-scan-target.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| YAML bien formado | ✅ | `python -c "import yaml; yaml.safe_load(...)"` |
| Prueba positiva: secreto falso detectado | ✅ | `ERROR [AWS_KEY] src_ts\__poison_test.ts: line 1: AKIAABCD...`, exit 1 |
| Código real limpio | ✅ | `python scripts/scan_secrets.py src_ts` exit 0, DESPUÉS de probar el camino positivo |
| Corrida REAL de GitHub Actions | ✅ | [run 33344378409](https://github.com/MauricioPerera/fastwebmcp/actions/runs/33344378409) |

## Hallazgo

Auditando el proyecto ("seguimos con algo más de fastwebmcp") se encontró la misma
clase de bug que CONTRACT-43 corrigió para los tests: `.github/workflows/validate.yml`
apunta el gate "Scan for leaked secrets" a `src/` por default — el directorio de
ejemplos Python de la plantilla, vacío desde que `init_project.py --apply` borró
`hello.py`/`users.py`/etc. hace muchos contratos. El código real de `fastwebmcp` vive en
`src_ts/`, nunca escaneado. `scan_secrets.py src` da `exit 0` sobre un directorio
vacío — verde silencioso. El propio CHANGELOG de la plantilla (v1.12.0) documenta
exactamente esta clase de fallo como su lección más cara ("un gate que no puede
reportar su propia ausencia de cobertura no es un gate, es una sensación de
cobertura").

## T1 — Redirigir el gate

`.github/workflows/validate.yml`: `src_dir_secrets` default `'src'` → `'src_ts'`, en los
dos lugares que el propio archivo exige mantener equivalentes (el `default:` de
`workflow_call.inputs`, y el fallback literal del `run:` para cuando el workflow corre
por su propio trigger nativo). `scripts/scan_secrets.py` (target sellado del contrato
`secret-scan-gate`) no se tocó — solo cambió a qué directorio lo invoca el caller,
configuración fuera de ese `touch_only`.

## Verificación — camino positivo ANTES que el negativo

Un `exit 0` solo no distingue "escaneó y no encontró nada" de "no escaneó nada" — el bug
mismo que este contrato corrige. Por eso, antes de confiar en que el código real está
limpio, se plantó un secreto falso (`AKIAABCDEFGHIJKLMNOP`, prefijo AWS) en un archivo
temporal bajo `src_ts/` y se confirmó que `scan_secrets.py src_ts` lo detecta de verdad
(`exit 1`, finding `AWS_KEY` real). Archivo temporal borrado, nunca stageado. Recién
después de esa prueba positiva se corrió el gate contra el código real: `exit 0`, limpio
de verdad, no por omisión.

## Verificación final — corrida real de CI

[run 33344378409](https://github.com/MauricioPerera/fastwebmcp/actions/runs/33344378409):
verde en `windows-latest`, con el paso renombrado "Scan for leaked secrets (src_ts/ —
see knowledge/contracts/secret-scan-gate.md)" pasando de verdad contra el código real.

## Pendientes / ítems de seguimiento

- Ninguno nuevo. Con CONTRACT-43 y CONTRACT-44, los dos gates de la CI que apuntaban a
  ubicaciones vacías/desactualizadas de la plantilla original ya están corrigiendo
  contra el código real del proyecto.
