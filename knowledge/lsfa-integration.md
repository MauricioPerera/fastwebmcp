---
type: 'Architecture'
title: 'Integracion opcional con Local Secure Forms Architecture'
description: 'Limite de autoridad entre WebMCP, FastWebMCP y un broker LSFA confiable inyectado por la aplicacion.'
tags: ['webmcp', 'lsfa', 'security', 'architecture']
---

# Integracion LSFA

La integracion es un adaptador opcional, no una implementacion de LSFA. WebMCP transporta
solo intencion y datos no sensibles del agente. Un `LsfaBroker` confiable, elegido e
inyectado por la aplicacion host, conserva toda autoridad sobre politica, riesgo, campos
sensibles, perfil de presentacion, confirmacion humana, expiracion, binding, consumo unico
y ejecucion.

El adaptador usa exclusivamente la API WebMCP imperativa. Nunca crea formularios
declarativos ni `toolautosubmit`. La extension LSFA Presentation 0.3 se transmite como una
sugerencia estructurada; los modos, temas, limites y layout siguen el schema 0.3. Una
referencia abreviada de perfil es solo un hint del adaptador: el broker construye y valida
la solicitud LSFA canonica y puede ignorar la presentacion.

Los secretos, credenciales, PIN, OTP y TOTP no pertenecen al `inputSchema` visible al
agente. El resultado que vuelve al agente es un resumen estricto: estado, operacion,
identificador, riesgo, checks booleanos, presencia de referencias almacenadas y un codigo
de error estable. No contiene valores capturados.

El primer contrato solo define una frontera transport-agnostic. HTTP loopback, Native
Messaging y extensiones de navegador quedan fuera hasta estabilizar esta interfaz.
