# Estructura de Idiomas - Parque Europa

## Organización de Archivos por Idioma

La estructura está organizada por idiomas para facilitar la gestión de contenido multiidioma:

```
backend/tenants/parque_europa/
├── audio/
│   ├── es/                    # Español (por defecto)
│   │   ├── Torre-Eiffel/
│   │   │   ├── normal.mp3
│   │   │   ├── infantil.mp3
│   │   │   ├── experto.mp3
│   │   │   └── cachondo.mp3
│   │   ├── Fontana-Trevi/
│   │   └── ...
│   ├── en/                    # Inglés
│   │   ├── Torre-Eiffel/
│   │   └── ...
│   ├── fr/                    # Francés
│   ├── it/                    # Italiano
│   ├── de/                    # Alemán
│   ├── pt/                    # Portugués
│   ├── zh/                    # Chino
│   └── ja/                    # Japonés
└── texts/
    ├── es/                    # Español (por defecto)
    │   ├── Torre-Eiffel/
    │   │   ├── normal.txt
    │   │   ├── infantil.txt
    │   │   ├── experto.txt
    │   │   └── cachondo.txt
    │   ├── Fontana-Trevi/
    │   └── ...
    ├── en/                    # Inglés
    ├── fr/                    # Francés
    ├── it/                    # Italiano
    ├── de/                    # Alemán
    ├── pt/                    # Portugués
    ├── zh/                    # Chino
    └── ja/                    # Japonés
```

## Endpoints API

### Audio con Idioma
```
GET /api/audio/{tenant_id}/{piece_id}/{mode}/{language}
```

Ejemplos:
- `/api/audio/parque_europa/Torre-Eiffel/normal/es` (Español)
- `/api/audio/parque_europa/Torre-Eiffel/normal/en` (Inglés)
- `/api/audio/parque_europa/Torre-Eiffel/normal/fr` (Francés)

### Textos con Idioma
```
GET /api/text/{tenant_id}/{piece_id}/{mode}/{language}
```

Ejemplos:
- `/api/text/parque_europa/Torre-Eiffel/normal/es` (Español)
- `/api/text/parque_europa/Torre-Eiffel/normal/en` (Inglés)
- `/api/text/parque_europa/Torre-Eiffel/normal/fr` (Francés)

## Idiomas Soportados

- `es` - Español (por defecto)
- `en` - Inglés
- `fr` - Francés
- `it` - Italiano
- `de` - Alemán
- `pt` - Portugués
- `zh` - Chino
- `ja` - Japonés

## Notas

- Si no se especifica idioma, se usa español por defecto
- Los archivos de audio deben estar en formato MP3
- Los archivos de texto deben estar en formato TXT
- Cada monumento debe tener los 4 modos: normal, infantil, experto, cachondo

