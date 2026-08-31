# CONTRACT-47 — Annotations, formato de name y avisos de presupuesto en defineTool() — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-47-tool-annotations-and-budgets.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| `annotations` soportado y pasado tal cual | ✅ | test "passes annotations through" / "omits annotations..." |
| `name` valida charset/longitud del spec real | ✅ | tests de caracter invalido y >128 chars |
| Avisos de presupuesto (30/500 chars), sin lanzar | ✅ | tests de warn para name/description, control negativo |
| Oraculo de `define-tool` re-sellado | ✅ | 8 -> 15 tests, `tests_sha256` actualizado |
| Regresion en `to-mcpwasm-skill.test.ts` detectada y arreglada | ✅ | corrida completa ANTES de cerrar T1 |
| Oraculo de `to-mcpwasm-skill` re-sellado | ✅ | `tests_sha256` actualizado, mismo conteo de tests |
| `node --test "tests_ts/*.test.ts"` 2x verde | ✅ | 53/53, sin contaminacion cruzada |
| `npx tsc --noEmit` | ✅ | exit 0 |
| Gates Nivel 1 | ✅ | contracts/specs/okf/test_commands en verde |

## Origen

El sitio de GitHub Pages de `fastwebmcp` se escaneo en `webmcp.com` (grade B+, 5 tools, 3
paginas) y senalo "No result schemas anywhere" como debilidad. Se investigo si valia la
pena agregar `outputSchema`/`resultSchema` a `defineTool()` -- descartado explicitamente
tras verificar tres fuentes primarias:

- El draft spec W3C (`webmachinelearning.github.io/webmcp`): `ModelContextTool` define
  `name`, `title`, `description`, `inputSchema`, `execute`, `annotations` -- sin ningun
  campo de output.
- Busqueda especifica sobre la implementacion real de Chrome: "Native Chrome WebMCP does
  not currently define or enforce outputSchema".
- El JSON crudo de un sitio real del directorio (`render.com`, 6 tools, via su API
  publica `/api/v1/sites/render.com`): las claves de una tool son exactamente `name`,
  `kind`, `impl`, `description`, `inputSchema`, `executable`, `handlerField`, `page` --
  tampoco tiene output schema.

Conclusion: es un limite del ecosistema WebMCP completo, no un gap de fastwebmcp. Agregar
el campo hubiera sido trabajo sin efecto (Chrome lo ignoraria).

La misma investigacion, revisando el spec completo y la guia de seguridad de Chrome, si
encontro dos gaps reales y accionables -- este contrato los cierra.

## T1 — `defineTool()`: annotations + validacion de name + avisos de presupuesto

### RECON (antes de escribir tests)

- Spec real: `ToolAnnotations` = `{ readOnlyHint?: boolean; untrustedContentHint?: boolean }`
  (ambos default `false`). `name`: 1-128 caracteres, `[A-Za-z0-9_.-]` unicamente.
- `developer.chrome.com/docs/ai/webmcp/secure-tools`: limites recomendados -- nombre de
  tool <=30 chars, descripcion de tool <=500, descripcion de parametro <=150, nombre de
  parametro <=30, output individual <=1.5K. Son recomendaciones para mejores resultados
  del agente, no reglas del spec (por eso: warn, no throw).

### Cambios

`src_ts/define-tool.ts`:
- Nueva interfaz `ToolAnnotations`, agregada como campo opcional `annotations?` a
  `ToolSpec` y `DefinedTool`.
- `NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/` -- nuevo throw si no matchea (despues del
  chequeo de no-vacio existente, para no romper el mensaje de error ya congelado en los
  tests originales de nombre vacio/whitespace).
- `warnIfOverBudget(label, value, limit)` -- helper privado, `console.warn` si excede.
  Llamado para `name` (30) y `description` (500) DESPUES de que todos los throws de
  validez estructural ya pasaron (no tiene sentido avisar sobre presupuesto de un spec
  que va a lanzar de todas formas).
- El objeto devuelto incluye `annotations` solo si `spec.annotations !== undefined`
  (spread condicional) -- nunca se manda `annotations: undefined` ni `{}` al navegador.

Fuera de alcance, deliberado (documentado en la spec): presupuesto de caracteres a nivel
de parametro individual o de output de `execute` -- requeriria recorrer el JSON Schema
derivado; el gap mas accionable (name/description a nivel de tool) es el que se cierra
aca.

### Tests nuevos (`tests_ts/define-tool.test.ts`, 8 -> 15)

1. `annotations` presente -> se copia tal cual al objeto devuelto.
2. `annotations` ausente -> la clave `annotations` NO existe en el objeto devuelto
   (`'annotations' in tool === false`).
3. `name` con caracter fuera de `[A-Za-z0-9_.-]` (ej. `'my tool!'`) -> lanza.
4. `name` de 129 caracteres -> lanza.
5. `name` de 35 caracteres (valido, sobre el presupuesto de 30) -> NO lanza, un solo
   `console.warn` mencionando "35 characters".
6. `description` de 501 caracteres -> NO lanza, un solo `console.warn` mencionando
   "501 characters".
7. Spec normal (nombre y descripcion cortos) -> CERO llamadas a `console.warn` (control
   negativo, evita falsos positivos).

Oraculo re-sellado: `tests_sha256` de `knowledge/contracts/define-tool.md` actualizado a
`ba6702954bc7fed3a5debd71801bbce8859dc3da62a626d14727c65e24142341` (calculado con
`python scripts/validate_contracts.py --hash tests_ts/define-tool.test.ts`).

## T2 — Regresion en `to-mcpwasm-skill.test.ts` (detectada corriendo la suite completa)

Al correr `node --test "tests_ts/*.test.ts"` (no solo el archivo de T1) ANTES de dar T1
por cerrado -- disciplina heredada de CONTRACT-37 ("correr los tres archivos juntos revela
contaminacion") -- salio 1 test rojo:

```
✖ escapes special characters in name/description safely (quotes, backslash, newline)
  Error: defineTool: name must be 1-128 characters of letters, numbers, "_", "-", or "."
```

El test usaba `name: 'weird_"tool"'` para probar que `toMcpwasmSkillSource()` escapa
comillas/backslash/newline de forma segura al generar JS -- invalido bajo la nueva regla
de charset de T1. Arreglo: el `name` pasa a ser valido (`'weird_tool'`), y la cobertura de
escapado de caracteres especiales se mueve integramente a `description` (que el spec no
restringe en charset) -- la propiedad de seguridad protegida (serializacion JS segura de
texto no confiable) sigue igual de cubierta, solo cambia el campo usado para ejercitarla.
`src_ts/to-mcpwasm-skill.ts` no se toco -- puro ajuste de test.

Oraculo re-sellado: `tests_sha256` de `knowledge/contracts/to-mcpwasm-skill.md` actualizado
a `b3f0f93fa16587b89e270efda6ed785c2ed6b9f4b70132321f73d1fd801db47c`.

## Verificacion final

```
node --test "tests_ts/*.test.ts"   -> 53/53 verde (corrido 2x)
npx tsc --noEmit                   -> exit 0
python scripts/validate_contracts.py knowledge/contracts -> OK, 32 archivos
python scripts/validate_specs.py specs                    -> OK, 47 archivos
python scripts/validate_okf.py knowledge                  -> OK, 56 archivos
python scripts/validate_test_commands.py knowledge/contracts . -> 32/32 PASS
```

## Pendientes / seguimiento

- Documentar `annotations` y la nueva validacion en `docs.html` (rama `gh-pages`, seccion
  `defineTool`) y en `README.md` -- fuera de este reporte, tarea separada dentro del mismo
  contrato.
- NO se publico a npm ni se taggeo -- fuera de alcance, pendiente de pedido explicito del
  usuario.
