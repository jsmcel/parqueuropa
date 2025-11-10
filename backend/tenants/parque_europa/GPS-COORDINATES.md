# Coordenadas GPS - Parque Europa

## Descripción

Este archivo contiene las coordenadas GPS de todos los monumentos del Parque Europa en Torrejón de Ardoz. Las coordenadas están organizadas para facilitar la integración con sistemas de audioguías GPS.

## Estructura de Datos

Las coordenadas se almacenan en el archivo `coordinates.json` con la siguiente estructura:

```json
{
  "monuments": {
    "nombre-monumento": {
      "name": "Nombre del Monumento",
      "original_country": "País de origen",
      "original_city": "Ciudad de origen",
      "coordinates": {
        "latitude": 40.439705,
        "longitude": -3.459865
      }
    }
  }
}
```

## Monumentos con Coordenadas

### 1. Torre Eiffel 🇫🇷
- **Coordenadas**: 40.439705° N, -3.459865° O
- **País original**: Francia, París

### 2. Fontana de Trevi 🇮🇹
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Italia, Roma

### 3. Puerta de Brandeburgo 🇩🇪
- **Coordenadas**: 40.44676° N, -3.45304° O
- **País original**: Alemania, Berlín

### 4. Atomium 🇧🇪
- **Coordenadas**: 40.439705° N, -3.459865° O
- **País original**: Bélgica, Bruselas

### 5. Barco Vikingo 🇳🇴
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Escandinavia, Oslo

### 6. La Sirenita 🇩🇰
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Dinamarca, Copenhague

### 7. Manneken Pis 🇧🇪
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Bélgica, Bruselas

### 8. Molinos Holandeses 🇳🇱
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Países Bajos, Kinderdijk

### 9. Muro de Berlín 🇩🇪
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Alemania, Berlín

### 10. Plaza Mayor 🇪🇸
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: España, Madrid

### 11. Puente de Londres 🇬🇧
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Reino Unido, Londres

### 12. Puerta de Alcalá 🇪🇸
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: España, Madrid

### 13. Teatro Griego 🇬🇷
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Grecia, Epidauro

### 14. David de Miguel Ángel 🇮🇹
- **Coordenadas**: 40.44103° N, -3.45814° O
- **País original**: Italia, Florencia

## Uso en Audioguías

### Integración con GPS

Las coordenadas pueden ser utilizadas por las audioguías para:

1. **Detección automática de proximidad**: Cuando el usuario se acerque a un monumento, la audioguía puede activarse automáticamente.

2. **Navegación**: Proporcionar direcciones hacia los monumentos desde la ubicación actual del usuario.

3. **Información contextual**: Mostrar información relevante basada en la proximidad a monumentos específicos.

### API de Coordenadas

```javascript
// Ejemplo de uso en JavaScript
const coordinates = require('./coordinates.json');

function getMonumentCoordinates(monumentName) {
  return coordinates.monuments[monumentName];
}

function findNearestMonument(userLat, userLng) {
  // Lógica para encontrar el monumento más cercano
  // basado en las coordenadas del usuario
}
```

### Endpoints API

```
GET /api/coordinates/{monument_name}
GET /api/coordinates/all
GET /api/coordinates/nearest?lat={latitude}&lng={longitude}
```

## Notas Técnicas

- **Sistema de coordenadas**: WGS84 (GPS estándar)
- **Precisión**: Coordenadas aproximadas para el Parque Europa
- **Formato**: Decimal degrees (DD)
- **Actualización**: Las coordenadas pueden necesitar ajustes según la disposición real de los monumentos en el parque

## Mantenimiento

Para actualizar las coordenadas:

1. Editar el archivo `coordinates.json`
2. Verificar la precisión de las coordenadas
3. Actualizar la documentación si es necesario
4. Probar la integración con las audioguías

## Contacto

Para consultas sobre coordenadas o integración GPS, contactar con el equipo de desarrollo.




