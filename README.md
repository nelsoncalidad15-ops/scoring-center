# Scoring Cent

Sistema interno de recepcion y Contact Center para carga, contacto y scoring de solicitudes.

## Arquitectura segura

- Frontend publico en Netlify.
- El navegador nunca habla directo con Google Sheets.
- El frontend llama a Netlify Functions.
- Netlify Functions llaman a Apps Script con `BACKEND_SECRET`.
- Apps Script escribe y lee la planilla privada en Google Sheets usando `SHEET_ID`.

## Estructura de hojas sugerida

- `Solicitudes_Jujuy`
- `Solicitudes_Salta`
- `Gestiones_Scoring`
- `Catalogos`

## Variables seguras en Netlify

- `APPS_SCRIPT_URL`
- `BACKEND_SECRET`
- `SITE_ORIGIN`

## Script Properties en Apps Script

- `SHEET_ID`
- `BACKEND_SECRET`

## Flujo operativo

1. Recepcion carga una solicitud nueva.
2. El caso queda visible para cualquier operador.
3. El operador puede mandar WhatsApp, llamar o trabajar en modo hibrido.
4. El scoring deja resultado, motivo, recontacto y bitacora.
5. Todo queda persistido en la base privada de Sheets.

## Estado actual

- Interfaz interna avanzada: lista.
- Repo local inicializado: listo.
- Netlify Functions creadas: listo.
- Plantilla Apps Script creada: listo.
- Falta terminar el reemplazo completo de `localStorage` por API en `app.js`.
- Falta crear/subir el repo remoto `scoring-cent` y vincularlo a Netlify.
