# Ejemplo de Estructura Correcta

## Estructura Actual Implementada

```
backend/tenants/parque_europa/
├── audio/
│   ├── es/                    # Español (por defecto)
│   │   ├── Torre-Eiffel/
│   │   ├── Fontana-Trevi/
│   │   └── Puerta-Brandeburgo/
│   ├── en/                    # Inglés
│   │   ├── Torre-Eiffel/
│   │   ├── Fontana-Trevi/
│   │   └── Puerta-Brandeburgo/
│   ├── fr/                    # Francés
│   │   ├── Torre-Eiffel/
│   │   ├── Fontana-Trevi/
│   │   └── Puerta-Brandeburgo/
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
    │   │   ├── normal.txt
    │   │   ├── infantil.txt
    │   │   ├── experto.txt
    │   │   └── cachondo.txt
    │   └── Puerta-Brandeburgo/
    │       ├── normal.txt
    │       ├── infantil.txt
    │       ├── experto.txt
    │       └── cachondo.txt
    ├── en/                    # Inglés
    ├── fr/                    # Francés
    ├── it/                    # Italiano
    ├── de/                    # Alemán
    ├── pt/                    # Portugués
    ├── zh/                    # Chino
    └── ja/                    # Japonés
```

## Endpoints API Actualizados

### Audio con Idioma
```
GET /api/audio/{tenant_id}/{piece_id}/{mode}/{language}
```

### Textos con Idioma
```
GET /api/text/{tenant_id}/{piece_id}/{mode}/{language}
```

## Ejemplos de Uso

### Español (por defecto)
- `/api/audio/parque_europa/Torre-Eiffel/normal/es`
- `/api/text/parque_europa/Torre-Eiffel/normal/es`

### Inglés
- `/api/audio/parque_europa/Torre-Eiffel/normal/en`
- `/api/text/parque_europa/Torre-Eiffel/normal/en`

### Francés
- `/api/audio/parque_europa/Torre-Eiffel/normal/fr`
- `/api/text/parque_europa/Torre-Eiffel/normal/fr`

## Notas

- Si no se especifica idioma, se usa español por defecto
- Los archivos de audio deben estar en formato MP3
- Los archivos de texto deben estar en formato TXT
- Cada monumento debe tener los 4 modos: normal, infantil, experto, cachondo

