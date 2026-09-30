---
type: 'Task Contract'
title: 'Alinear el objetivo local de escaneo con CI'
description: 'Corrige el default de scan_secrets del dispatch KDD para escanear la biblioteca TypeScript real.'
tags: ['security', 'gate', 'audit']
task: audit-scan-target
intent: "Alinear el objetivo de escaneo local y MCP con el objetivo de CI."
target: scripts/mcp_gate_dispatch.py
signature: "def build_argv(tool_name, params) -> list"
test_command: "python -m unittest tests/test_audit_scan_target.py"
budget:
  cyclomatic_max: 14
  nesting_max: 4
tests: "tests/test_audit_scan_target.py"
tests_sha256: "0073181b381cee23c4adf9615a1159f5c812e5b03ee1241a8122ab3651f8f094"
touch_only: ['scripts/mcp_gate_dispatch.py', 'scripts/mcp_server.py']
deps_allowed: []
forbids: ['network', 'llm']
---

# Contract: objetivo real del escaneo local

## Intent

Alinear [dispatch MCP](./mcp-gate-dispatch.md) y preflight con el pipeline descrito
en [validacion](../validacion.md). No cambiar el scanner generico de la plantilla.

## Interface

`build_argv('scan_secrets', {})` selecciona src_ts como directorio por defecto.

## Invariants

- El default apunta al codigo real del proyecto.
- Los overrides explicitos se conservan.
- El scan real detecta una credencial de fixture en src_ts.

## Examples

- Sin override -> argv termina en src_ts.
- dirs=['custom'] -> argv termina en custom.

## Do / Don't

- DO: reutilizar el scanner y alinear la descripcion del servidor.
- DON'T: introducir dependencia MCP en la logica de dispatch.

## Tests

Oraculo nuevo tests/test_audit_scan_target.py, escrito y corrido en rojo antes de
implementar; prueba integrada aislada en un directorio temporal.

## Constraints

No modificar los oraculos anteriores. No cambiar la semantica del scanner generico.
PARAR y reportar si hace falta modificar un oraculo preexistente.
