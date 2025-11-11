# Parque Europa – Licencias y atribuciones

Este paquete usa fotografías reales obtenidas de Wikimedia Commons para ilustrar cada monumento del slider.
El backend expone estos recursos mediante `/api/tenant-media/monuments` y sirve los binarios desde
`/api/tenant-media/file/:slug/:filename`. Los scripts ubicados en `backend/tools/media/` descargan las imágenes
mencionadas en `media/slider.manifest.json`, rellenan `media/monuments/<slug>/` y generan el
archivo `media/ATTRIBUTIONS.json` con los créditos exactos (autor, licencia, URL original y ruta local).

## Fuentes
- **Wikimedia Commons**: cada entrada del manifiesto especifica el nombre del archivo (`File:*.jpg`).
- **Metadatos legales**: se extraen automáticamente de `extmetadata` (Autor, Licencia, Credit).

## Uso de los scripts
1. Sitúate en la raíz del repo.
2. Ejecuta uno de los comandos:
   - `node backend/tools/media/fetch-images.js --tenant parque_europa`
   - `pwsh backend/tools/media/fetch-images.ps1 -TenantId parque_europa`
3. Para incluir contenidos con avisos legales (ej. *La Sirenita*), añade `--include-risky` / `-IncludeRisky`.
4. Se puede pasar `--dry-run` para probar sin escribir archivos.

## Salida generada
- `backend/tenants/parque_europa/media/monuments/<slug>/`: imágenes descargadas por monumento.
  Cada archivo tiene su copia optimizada (`*_web.jpg`) generada con sharp (1600px máx., calidad ~70%).
- `backend/tenants/parque_europa/media/ATTRIBUTIONS.json`: mapa `{ slug: [{ filename, url, localPath, license, ... }] }`
  que se sirve al frontend.

## Notas legales
- Cada imagen mantiene su licencia original; respeta los términos indicados en `media/ATTRIBUTIONS.json`.
- Las copias `_web.jpg` son derivadas de la obra original y heredan la misma licencia y requisitos de atribución.
- *La Sirenita (Copenhague)* permanece excluida por defecto por las restricciones de copyright vigentes en
  Dinamarca hasta 2030. Usa `--include-risky` solo si has confirmado que puedes distribuirla.
- Revisa siempre las políticas locales antes de reutilizar los activos en otros soportes.
