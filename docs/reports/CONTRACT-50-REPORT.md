# CONTRACT-50 — Bump a TypeScript 7 (compilador nativo Go) — REPORT

Fecha: 2026-08-31
Spec: `specs/CONTRACT-50-typescript-7.md`

## Resumen ejecutivo

| Criterio | Veredicto | Evidencia |
|---|---|---|
| TypeScript 7 real, no simulado | ✅ | `npx tsc --version` -> `Version 7.0.2` |
| `npx tsc --noEmit` contra TS7 | ✅ | exit 0 |
| `node --test` contra dist/ de TS7 | ✅ | 55/55 verde |
| `npm run build` / `build:examples` | ✅ | ambos exit 0 |
| `dist/` sin diferencias de comportamiento | ✅ | diff linea por linea, solo estilo de comillas |
| tsconfig propio ya cubre los breaking changes documentados | ✅ | revisado campo por campo |

## Origen

CONTRACT-49 encontro que `typescript` estaba pineado a `^5.7.3` mientras `latest` en
el registro es `7.0.2` -- marcado explicitamente como "no urgente, requiere evaluacion
deliberada" porque TypeScript 7 es la reescritura completa del compilador en Go
(Project Corsa), no un bump incremental. El usuario eligio evaluarlo en la siguiente
ronda ("seguimos con algo mas de fastwebmcp").

## RECON

Busqueda web confirmo: TS7 anuncio original marzo 2025, GA el 8 de julio de 2026,
codename interno "Project Corsa" (el compilador legado en JS se llama "Strada"),
8x-12x mas rapido en builds completos. Los breaking changes documentados estan en la
frontera 5.x -> 6.0, no en 6.0 -> 7.0:

- `strict` default `true`
- `module` default `esnext`
- `noUncheckedSideEffectImports` default `true`
- `types` default `[]` (deja de levantar `@types/node` implicitamente)
- target `ES5` eliminado
- `downlevelIteration` eliminado
- modulos legacy (AMD/UMD/SystemJS) eliminados
- `baseUrl` eliminado
- keyword `namespace` prohibido
- API programatica estable del compilador no viaja en 7.0

Contra el `tsconfig.json` real de fastwebmcp:

```json
{
  "strict": true,
  "target": "ES2022",
  "module": "NodeNext",
  "types": ["node"],
  ...
}
```

Los 5 campos que cambian de default en TS7 (`strict`, `module`, `noUncheckedSideEffectImports`,
`types`, target ES5) ya estan fijados a mano en fastwebmcp -- ningun default nuevo
cambia el comportamiento real. `baseUrl` no se usa. `namespace` y side-effect imports:
confirmado con grep, cero ocurrencias en `src_ts/`. La API programatica del compilador
no aplica -- fastwebmcp invoca `tsc` via CLI (`npm run typecheck`/`build`), nunca
`ts.createProgram` ni similar.

## Verificacion (antes de tocar package.json)

`npm install --no-save typescript@latest` en un `node_modules` local, SIN modificar
`package.json`/`package-lock.json` todavia -- para poder abortar limpio si algo fallaba:

```
npx tsc --version          -> Version 7.0.2
npx tsc --noEmit           -> exit 0
npx tsc -p tsconfig.build.json -> exit 0
node --test tests_ts/**/*.test.ts -> 55/55 verde
```

### Comparacion de `dist/` (TS 5.7.3 vs TS 7.0.2)

Se genero `dist/` con TS 5.7.3 (la version pineada), se copio a un directorio temporal,
se regenero `dist/` con TS 7.0.2, y se comparo archivo por archivo:

```
diff -rq dist/*.d.ts <copia con TS5>   -> sin diferencias, ningun archivo .d.ts cambio
diff -rq dist/*.js <copia con TS5>     -> 2 archivos difieren (index.js, register-tool.js)
```

La unica diferencia real en los `.js`: TS 5.7.3 emite imports/exports con comillas
dobles (`"./define-tool.js"`), TS 7.0.2 los emite con comillas simples
(`'./define-tool.js'`) -- cambio de estilo del emisor, JavaScript funcionalmente
identico. Cero diferencias en los `.d.ts` (las firmas de tipos publicadas no cambian en
absoluto).

## T1 — Bump

`typescript`: `^5.7.3` -> `^7.0.2` en `package.json` y `package-lock.json`. Verificacion
final (post-bump, `node_modules` real, no temporal):

```
npm run typecheck       -> exit 0
npm test                -> 55/55 verde
npm run build            -> exit 0
npm run build:examples   -> exit 0 (425.3kb + 1.2kb, igual que antes)
```

## Pendientes / seguimiento

- NO se publico a npm ni se taggeo -- aunque el bump SI regenera `dist/` con un
  compilador distinto (a diferencia de CONTRACT-49, que no tocaba `dist/` en absoluto),
  amerita confirmacion explicita del usuario antes de publicar, no automatica.
- La CI (`.github/workflows/validate.yml`) correra con TypeScript 7 en el proximo push
  -- no verificable sincronamente en esta sesion (requiere que GitHub Actions termine),
  pero usa los mismos comandos (`npm run typecheck`/`test`/`build`) ya verificados
  localmente en ambos runners historicamente equivalentes.
