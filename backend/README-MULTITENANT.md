# Backend Multi-Tenant - Guía de Uso

## Estructura de Tenants

Cada tenant debe tener la siguiente estructura:

```
backend/tenants/{tenant_id}/
├── models/
│   ├── swin_t_best_model.onnx          # Modelo principal de reconocimiento
│   └── efficientnet_b0_model.onnx      # Modelo secundario (opcional)
├── embeddings/
│   └── dataset_embeddings.json         # Base de datos de embeddings
├── audio/
│   ├── {piece_id}/
│   │   ├── normal.mp3                  # Audio modo normal
│   │   ├── infantil.mp3                # Audio modo infantil
│   │   ├── experto.mp3                 # Audio modo experto
│   │   └── cachondo.mp3                # Audio modo cachondo
│   └── ...
└── texts/
    ├── {piece_id}/
    │   ├── normal.txt                  # Texto modo normal
    │   ├── infantil.txt                # Texto modo infantil
    │   ├── experto.txt                 # Texto modo experto
    │   └── cachondo.txt                # Texto modo cachondo
    └── ...
```

## Configuración de Tenants

Editar `config/tenants.json`:

```json
{
  "museo_ferrocarril": {
    "name": "Museo del Ferrocarril de Madrid",
    "subdomains": ["museoferrocarril", "ferrocarril"],
    "enabled": true,
    "description": "Museo del Ferrocarril de Madrid - Colección histórica ferroviaria"
  },
  "parque_europa": {
    "name": "Parque Europa",
    "subdomains": ["parqueuropa", "europa"],
    "enabled": true,
    "description": "Parque Europa - Torrejón de Ardoz, Madrid"
  }
}
```

## Endpoints API

### 1. Status de Tenants
```
GET /api/status
```
Devuelve información de todos los tenants disponibles y su estado.

### 2. Reconocimiento de Imágenes
```
POST /api/recognize
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}
```

Headers opcionales:
- `X-Tenant-ID: {tenant_id}` - Especificar tenant manualmente

### 3. Audio por Tenant
```
GET /api/audio/{tenant_id}/{piece_id}/{mode}
```

Modes disponibles: `normal`, `infantil`, `experto`, `cachondo`

### 4. Textos por Tenant
```
GET /api/text/{tenant_id}/{piece_id}/{mode}
```

Modes disponibles: `normal`, `infantil`, `experto`, `cachondo`

Respuesta:
```json
{
  "pieceId": "7507",
  "mode": "normal",
  "tenant": "museo_ferrocarril",
  "content": "Texto del contenido...",
  "timestamp": "2025-10-24T17:25:00.000Z"
}
```

## Detección de Tenant

El sistema detecta automáticamente el tenant por:

1. **Header X-Tenant-ID** (prioridad alta)
2. **Subdomain** (ej: parqueuropa.ethcuela.es → parque_europa)
3. **Query param** `tenant_id`
4. **Default**: primer tenant habilitado en config

## Añadir Nuevo Tenant

1. **Crear estructura de carpetas:**
   ```bash
   mkdir -p backend/tenants/nuevo_tenant/{models,embeddings,audio,texts}
   ```

2. **Añadir archivos:**
   - Modelos ONNX en `models/`
   - Embeddings JSON en `embeddings/`
   - Audios MP3 en `audio/{piece_id}/`
   - Textos TXT en `texts/{piece_id}/`

3. **Actualizar configuración:**
   ```json
   "nuevo_tenant": {
     "name": "Nombre del Tenant",
     "subdomains": ["subdomain1", "subdomain2"],
     "enabled": true,
     "description": "Descripción del tenant"
   }
   ```

4. **¡Listo!** El sistema lo detectará automáticamente.

## Variables de Entorno

```bash
# Puerto del backend
BACKEND_PORT=3000

# Base de datos MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/guideitor

# Configuración de Tenants
DEFAULT_TENANT=museo_ferrocarril
TENANTS_CONFIG_PATH=config/tenants.json

# Configuración de modelos
IMG_SIZE=224
SIMILARITY_THRESHOLD=0.8
SUGGESTION_THRESHOLD=0.3
TOP_N_SUGGESTIONS=3
```

## Ejemplos de Uso

### Frontend - Detectar Tenant
```javascript
// Por header
fetch('/api/recognize', {
  headers: {
    'X-Tenant-ID': 'parque_europa'
  }
});

// Por subdomain (automático)
// Si accedes desde parqueuropa.ethcuela.es
fetch('/api/recognize', { ... });
```

### Frontend - Obtener Audio
```javascript
const audioUrl = `/api/audio/${tenantId}/${pieceId}/${mode}`;
// Ejemplo: /api/audio/parque_europa/Torre-Eiffel/normal
```

### Frontend - Obtener Texto
```javascript
const response = await fetch(`/api/text/${tenantId}/${pieceId}/${mode}`);
const data = await response.json();
console.log(data.content); // Contenido del texto
```

## Logs y Debugging

El sistema usa Pino logger con niveles configurables:

```bash
LOG_LEVEL=debug  # Para desarrollo
LOG_LEVEL=info   # Para producción
```

Los logs incluyen:
- Detección de tenant
- Carga de modelos
- Errores de reconocimiento
- Analytics de uso

## Monitoreo

### Health Check
```
GET /health
```

### Métricas (opcional)
```
GET /metrics
```
Requiere `ENABLE_METRICS=true` en .env
