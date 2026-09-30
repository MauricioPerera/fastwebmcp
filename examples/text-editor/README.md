# Editor de texto con WebMCP

Desde la raiz del repositorio:

```sh
npm ci
npm run build:examples
python -m http.server 8349 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8349/examples/text-editor/ en un navegador con WebMCP
nativo. Sin WebMCP, la edicion manual sigue disponible.

Herramientas: `editor_read`, `editor_write`, `editor_insert`, `editor_replace`,
`editor_find`, `editor_select`, `editor_undo` y `editor_redo`. Las mutaciones y la
seleccion requieren `expectedRevision`, obtenido con `editor_read`. Si otra
edicion cambio el documento, la llamada falla sin sobrescribirla.

Las posiciones cuentan unidades UTF-16 desde cero. Busquedas literales sensibles
a mayusculas, sin coincidencias solapadas. Reemplazos tratan `$&` como texto
literal. Limite de 200000 caracteres y 100 cambios deshacibles. El borrador se
guarda en localStorage; el historial solo vive mientras esta abierta la pagina.
Sin almacenamiento disponible, el editor funciona en memoria y lo indica.

El usuario puede descargar un archivo `.txt` desde la barra. El contenido se
muestra como texto plano. La actividad muestra el nombre de cada herramienta
y su resultado o error.

Prueba automatizada: `node --test tests_ts/text-editor.test.ts`.
El contrato y la evidencia se encuentran en
[text-editor-demo](../../knowledge/contracts/text-editor-demo.md) y
[Contract 54](../../docs/reports/CONTRACT-54-REPORT.md).
