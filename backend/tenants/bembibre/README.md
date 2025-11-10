# Bembibre Tenant (Tipo 2)

Este directorio contiene la estructura inicial para el recorrido GPS de Bembibre.  Los archivos reales de modelos ONNX, embeddings, audios y textos multi-idioma se pueden copiar siguiendo el mismo esquema que `parque_europa`.

## Estado actual
- `coordinates.json` define 4 paradas urbanas con orden de itinerario y coordenadas.
- Directorios vacíos para `models`, `embeddings`, `audio` y `texts` incluyen `.gitkeep` para facilitar el versionado.
- Usa `frontendMode = gps`, por lo que la app mostrará el flujo tipo 2.

## Próximos pasos
1. Exportar o generar `dataset_embeddings.json` y modelos en `models/`.
2. Convertir los textos del documento de Bembibre en ficheros `texts/es/<slug>/<modo>.txt`.
3. Subir los audios en `audio/es/<slug>/<modo>.mp3` si se dispone de locuciones.
