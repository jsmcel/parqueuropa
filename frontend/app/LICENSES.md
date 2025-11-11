# Parque Europa – Licencias y atribuciones

Este paquete usa fotografías reales obtenidas de Wikimedia Commons para ilustrar cada monumento del slider.
Los scripts incluidos (`scripts/fetch-images.js` y `scripts/fetch-images.ps1`) descargan las imágenes
mencionadas en `config/slider.manifest.json`, generan las subcarpetas `assets/monuments/<slug>/` y crean el
archivo `assets/ATTRIBUTIONS.json` con los créditos exactos (autor, licencia, URL original y ruta local).

## Fuentes
- **Wikimedia Commons**: cada entrada del manifiesto especifica el nombre del archivo (`File:*.jpg`).
- **Metadatos legales**: se extraen automáticamente de `extmetadata` (Autor, Licencia, Credit).

## Uso de los scripts
1. Sitúate en `frontend/app`.
2. Ejecuta uno de los comandos:
   - `node scripts/fetch-images.js`
   - `pwsh scripts/fetch-images.ps1`
3. Para incluir contenidos con avisos legales (ej. *La Sirenita*), añade `--include-risky` / `-IncludeRisky`.
4. Se puede pasar `--dry-run` para probar sin escribir archivos.

## Salida generada
- `assets/monuments/<slug>/`: imágenes descargadas por monumento.
- `assets/ATTRIBUTIONS.json`: mapa `{ slug: [{ filename, url, localPath, license, ... }] }` usado por el slider.

## Notas legales
- Cada imagen mantiene su licencia original; respeta los términos indicados en `assets/ATTRIBUTIONS.json`.
- *La Sirenita (Copenhague)* permanece excluida por defecto por las restricciones de copyright vigentes en
  Dinamarca hasta 2030. Usa `--include-risky` solo si has confirmado que puedes distribuirla.
- Revisa siempre las políticas locales antes de reutilizar los activos en otros soportes.
