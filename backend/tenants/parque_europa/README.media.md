# Parque Europa – Paquete de medios del backend

Este directorio (`backend/tenants/parque_europa/`) concentra todos los activos que el frontend consume de forma remota:

- Configuración del manifiesto (`media/slider.manifest.json`)
- Fotografías reales por monumento (`media/monuments/<slug>/`)
- Créditos/licencias (`media/ATTRIBUTIONS.json`)
- Scripts de descarga/compresión (`backend/tools/media/*`)

El frontend ya **no** bundlea las fotos y solo llama al backend mediante `/api/tenant-media/monuments` y `/api/tenant-media/file/:slug/:filename`.

## Estructura
```
backend/tenants/parque_europa/
  audio/...
  media/
    ATTRIBUTIONS.json
    LICENSES.md
    slider.manifest.json
    monuments/<slug>/*.jpg (original) + *_web.jpg (versión optimizada para web)
  README.media.md  ← este archivo
```

## API expuesta por el backend
- `GET /api/tenant-media/monuments` → devuelve `{ sliderManifest, heroSlugs, monuments }`
- `GET /api/tenant-media/file/:slug/:filename` → sirve la imagen binaria con cache-control

## Scripts para mantener las fotos
1. Ejecuta desde la raíz del repo:
   - `node backend/tools/media/fetch-images.js --tenant parque_europa`
   - `pwsh backend/tools/media/fetch-images.ps1 -TenantId parque_europa`
2. Opciones clave:
   - `--include-risky` / `-IncludeRisky` → descarga La Sirenita (copyright vigente hasta 2030 en Dinamarca).
   - `--dry-run` → simula la descarga sin escribir archivos.
3. Al finalizar tendrás:
   - `media/monuments/<slug>/` con las fotos originales y sus copias `_web` (1600px / calidad 70) para frontend.
   - `media/ATTRIBUTIONS.json` actualizado con créditos, tamaños y rutas de cada variante.

## Integración con el frontend Expo
1. El arranque de la app ejecuta `fetchTenantMediaManifest` y guarda el resultado en un contexto.
2. `HomeScreen` y `ResultScreen` consultan ese contexto para poblar hero/slider/history.
3. Para añadir un nuevo monumento:
   - Añade la entrada en `media/slider.manifest.json`.
   - Ejecuta los scripts para descargar las fotos.
   - Despliega el backend para que exponga el nuevo manifiesto.

## Notas legales
- Revisa `media/LICENSES.md` antes de redistribuir las imágenes.
- Cada foto mantiene la licencia original (CC BY, CC BY-SA, dominio público, etc.).
- Las rutas devueltas por la API incluyen el `assetUrl` absoluto y el `originalUrl` de Wikimedia para facilitar atribución.
- El frontend usa por defecto los archivos `_web.jpg`; si necesitas máxima calidad (p.ej. para impresión), usa los originales sin sufijo.
