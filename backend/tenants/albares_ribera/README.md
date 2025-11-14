# Bembibre Tenant (Tipo 2)

Este directorio contiene la estructura inicial para el recorrido GPS de Bembibre.  Los archivos reales de modelos ONNX, embeddings, audios y textos multi-idioma se pueden copiar siguiendo el mismo esquema que `parque_europa`.

## Estado actual
- `coordinates.json` define 7 paradas del nuevo itinerario urbano (Plaza Mayor -> Museo Alto Bierzo) con radio por defecto de 35 m y duracion estimada de 85 min.
- Los textos del modo `normal` para cada parada viven en `texts/es/<slug>/normal.txt`, generados automaticamente desde `Future/Bembibre.txt` mediante `parse_bembibre.py`.
- La estructura para `models`, `embeddings` y `audio` esta lista para recibir los binarios cuando se produzcan las locuciones.

Para regenerar los textos desde la fuente principal:

```bash
python parse_bembibre.py --write-texts --mode normal --texts-root backend/tenants/bembibre/texts/es
```

## Proximos pasos
1. Exportar o generar `dataset_embeddings.json` y modelos ONNX en `models/`.
2. Anadir versiones `infantil`, `experto` y `cachondo` de los textos dentro de cada slug cuando esten disponibles.
3. Subir los audios en `audio/es/<slug>/<modo>.mp3` y actualizar los manifiestos de media del backend.
