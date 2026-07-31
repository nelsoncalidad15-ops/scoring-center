# Scoring Cent

Panel interno para gestionar solicitudes, scoring e indicadores.

> Segui [SECURITY_SETUP.md](SECURITY_SETUP.md) antes de promover la rama. La planilla existente de encuestas queda intacta y solo se lee mediante un bridge independiente.

## Arquitectura

- El navegador nunca habla directo con Google Sheets.
- Netlify Identity exige una sesion y las Functions validan roles en servidor.
- La planilla de encuestas existente se usa solo como fuente de lectura normalizada.
- El bridge no devuelve identificadores, contactos, links ni texto libre de la fuente.
- La planilla operativa es una Sheet privada nueva, separada de la fuente.
- Las APIs no se almacenan en cache y fallan cerradas ante falta de sesion o configuracion.

## Estructura de hojas sugerida

- `Solicitudes_Jujuy`
- `Solicitudes_Salta`
- `Gestiones_Scoring`
- `Catalogos`

## Variables seguras en Netlify

Las variables y las Script Properties requeridas estan documentadas en [SECURITY_SETUP.md](SECURITY_SETUP.md). No guardar secretos ni IDs de la fuente en el repositorio, navegador o chat.

## Flujo operativo

1. Recepcion carga una solicitud nueva.
2. El equipo autorizado gestiona contacto y scoring manual.
3. El bridge vincula respuestas ya existentes por una clave opaca del caso.
4. Supervisores ven indicadores y senales normalizadas, sin texto libre de la fuente.
5. La bitacora queda en la planilla operativa privada.

## Estado actual

- Acceso protegido, Functions y bridges: implementados en esta rama.
- Antes de produccion: configurar Netlify Identity, las dos Apps Script, las variables y probar un deploy preview.
- Esta fase no distribuye enlaces de encuestas; ese flujo se disena despues en una base separada.
