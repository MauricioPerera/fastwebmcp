# Contrato 44 — Apuntar el gate de secretos a src_ts/ (verde silencioso)

Prerrequisitos: CONTRACT-43 cerrado (CI real de TypeScript, verde). Auditando el
proyecto a pedido del usuario ("seguimos con algo más de fastwebmcp") se encontró la
misma clase de bug que CONTRACT-43 arregló para los tests: el gate "Scan for leaked
secrets" del workflow apunta a `src/` por default, pero `src/` está vacío desde que
`init_project.py --apply` borró los ejemplos Python de la plantilla — el código real de
este proyecto vive en `src_ts/`, que nunca fue escaneado. `scan_secrets.py src` da exit
0 sobre un directorio vacío: verde silencioso, exactamente el patrón que el propio
CHANGELOG de la plantilla (v1.12.0) documenta como la lección más cara del proyecto
("un gate que no puede reportar su propia ausencia de cobertura no es un gate, es una
sensación de cobertura"). Presentado al usuario antes de tocar nada; confirmó seguir.

> Capa: contrato de ejecución. Sin task contract CCDD nuevo ni resello — el `target`
> sellado del gate (`scripts/scan_secrets.py`, contrato `secret-scan-gate`) no cambia;
> solo cambia a QUÉ directorio lo invoca el workflow, que es configuración del caller,
> fuera del `touch_only` de ese contrato.

## T1 — Redirigir el gate

`.github/workflows/validate.yml`: el default de `src_dir_secrets` (tanto en
`workflow_call.inputs` como en el fallback literal del `run:` de la reusable workflow,
para no romper la equivalencia que el propio archivo documenta en su comment de
cabecera) pasa de `'src'` a `'src_ts'`.

## Criterios de aceptación

- [ ] `python -c "import yaml; yaml.safe_load(...)"` — YAML bien formado.
- [ ] Prueba positiva ANTES de commitear: plantar un secreto falso
  (`AKIAABCDEFGHIJKLMNOP`) en un archivo temporal bajo `src_ts/`, correr
  `python scripts/scan_secrets.py src_ts`, confirmar `exit 1` con el finding real — no
  solo confiar en que `exit 0` significa "escaneado y limpio" (podría significar "no
  escaneó nada", el bug mismo que este contrato corrige). Archivo temporal borrado
  después.
- [ ] `python scripts/scan_secrets.py src_ts` sobre el código real: `exit 0` (limpio de
  verdad, ya probado que el gate puede detectar).
- [ ] La corrida REAL de GitHub Actions sobre el push de este contrato termina en verde
  en ambos runners — verificado con `gh run view`.

## Restricciones

- Tocar SOLO: `.github/workflows/validate.yml`, `specs/CONTRACT-44-fix-secret-scan-target.md`,
  `docs/reports/CONTRACT-44-REPORT.md`, `CHANGELOG.md`.
- No tocar `scripts/scan_secrets.py` (target sellado de otro contrato) ni su oráculo.
- NO commitear el archivo de prueba con el secreto falso (se crea, se verifica, se
  borra, nunca se stagea).
- ABORTAR SI: el secreto falso plantado NO fuera detectado — indicaría que el gate en sí
  tiene un bug más profundo que un simple directorio mal apuntado. No se activó.

## Checklist antes de delegar

- [x] RECON corrido: confirmado que `src/` está vacío (`ls -la src/` sin archivos) y que
  `scan_secrets.py src` da exit 0 sobre eso, ANTES de asumir que el fix era necesario.
- [x] Todo criterio de aceptación tiene comando + resultado esperado.
- [x] Red-team: se probó el camino positivo (secreto SÍ detectado) antes de confiar en
  el camino negativo (código real limpio) — un `exit 0` sin la prueba positiva primero
  es indistinguible de "no escaneó nada", el bug exacto que se está arreglando.
- [x] Perímetro declarado arriba, sin tareas concurrentes.
- [x] Condición de aborto explícita arriba (no se activó).
