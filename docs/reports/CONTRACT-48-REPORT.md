# CONTRACT-48 — Campo title en defineTool() — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-48-tool-title.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `title` soportado y pasado tal cual | ✅ | tests "passes title through" / "omits title..." |
| Oraculo de `define-tool` re-sellado | ✅ | 15 -> 17 tests, `tests_sha256` actualizado |
| `node --test "tests_ts/*.test.ts"` 2x verde | ✅ | 55/55, sin regresiones cruzadas |
| `npx tsc --noEmit` | ✅ | exit 0 |
| Gates Nivel 1 | ✅ | contracts/specs/okf/test_commands en verde |

## Origen

Continuacion directa del flujo de auditoria de CONTRACT-47 ("seguimos con algo mas de
fastwebmcp"). En vez de adivinar el proximo gap, se lanzo un agente de auditoria dedicado
(read-only, sin editar nada) con instrucciones explicitas de verificar contra fuente
primaria (spec real, Chrome docs, el propio codigo) y de NO repetir `outputSchema`
(ya descartado en CONTRACT-47).

## Hallazgos del agente de auditoria

1. **`title` -- real, no soportado (elegido).** `ModelContextTool` en el spec
   (`webmachinelearning.github.io/webmcp`) define `name`, `title` (opcional,
   `USVString`), `description`, `inputSchema`, `execute`, `annotations` -- mismo
   dictionary que ya se leyo para `annotations` en CONTRACT-47, un campo al lado.
   Confirmado ausente en `src_ts/define-tool.ts` (grep sin resultados).
2. **`toolchange` -- descartado.** El spec declara el evento
   (`attribute EventHandler ontoolchange;`) pero no documenta el shape del payload/detail
   mas alla de "se dispara cuando cambian las tools". Envolver esto ahora seria adivinar
   un contrato inestable -- mismo motivo por el que CONTRACT-47 descarto `outputSchema`.
3. **`createWebMcpMock` -- sin drift.** El mock guarda y reenvia el objeto que produce
   `defineTool()`/`registerTool()` tal cual (`entry.tool.execute(...)`), sin copiar campos
   a mano -- automaticamente compatible con `annotations` y ahora `title`, sin necesitar
   cambios.
4. **API Declarativa -- sin gap.** Verificada contra el explainer real
   (`webmachinelearning/webmcp/blob/main/declarative-api-explainer.md`): los 4 atributos
   que expone `define-declarative-tool.ts` (`toolname`, `tooldescription`,
   `toolautosubmit`, `toolparamdescription`) coinciden exactamente, incluida la derivacion
   form-a-JSON-Schema que el propio explainer marca como TBD.
5. **Documentacion, CI/lint, issues de GitHub -- sin hallazgos.** `docs.html`/README ya
   documentan `annotations`/budgets/charset de `name` (los commits `a6d8ca3`/`205d8ee`
   posteriores a CONTRACT-47 ya lo habian cerrado). Sin gate estandar faltante en CI. Cero
   issues abiertos en `MauricioPerera/fastwebmcp`.

## T1 — `defineTool()`: campo title

### Cambios

`src_ts/define-tool.ts`: `title?: string` agregado a `ToolSpec` y `DefinedTool`; copiado
via spread condicional (`...(spec.title !== undefined ? { title: spec.title } : {})`),
mismo patron que `annotations`. Sin validacion de formato -- el spec no le impone ninguna.

### Tests nuevos (`tests_ts/define-tool.test.ts`, 15 -> 17)

1. `title` presente -> se copia tal cual al objeto devuelto.
2. `title` ausente -> la clave `title` NO existe en el objeto devuelto.

Oraculo re-sellado: `tests_sha256` de `knowledge/contracts/define-tool.md` actualizado a
`97bfad186b1daf421d299fe62837ef7142621d724adc65a0d3187924fd64aaa1`.

A diferencia de CONTRACT-47, correr la suite completa (`tests_ts/*.test.ts`) ANTES de
cerrar T1 no revelo ninguna regresion -- `title` no colisiona con ningun otro contrato
(sin restriccion de formato que pudiera invalidar un fixture existente, a diferencia del
charset de `name`).

## Verificacion final

```
node --test "tests_ts/*.test.ts"   -> 55/55 verde (corrido 2x)
npx tsc --noEmit                   -> exit 0
python scripts/validate_contracts.py knowledge/contracts -> OK, 32 archivos
python scripts/validate_specs.py specs                    -> OK, 48 archivos
python scripts/validate_okf.py knowledge                  -> OK, 56 archivos
python scripts/validate_test_commands.py knowledge/contracts . -> define-tool.md PASS
```

## Pendientes / seguimiento

- Documentar `title` en `docs.html` (rama `gh-pages`, seccion `defineTool`) y en
  `README.md` -- tarea separada dentro del mismo contrato, no incluida en este reporte.
- NO se publico a npm ni se taggeo -- fuera de alcance, pendiente de pedido explicito del
  usuario.
