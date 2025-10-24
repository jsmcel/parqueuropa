# 🏛️ Guía Parque Europa - Torrejón de Ardoz

## Descripción

La **Guía Parque Europa** es una aplicación móvil diseñada para descubrir y aprender sobre los monumentos europeos del Parque Europa en Torrejón de Ardoz, Madrid. Utiliza tecnología de reconocimiento de imágenes para identificar monumentos y proporcionar información detallada sobre cada uno.

## 🌍 Características Principales

### Reconocimiento de Monumentos
- **Escaneo por cámara**: Identifica monumentos europeos en tiempo real
- **Información detallada**: Historia, arquitectura y curiosidades de cada monumento
- **Múltiples idiomas**: Disponible en español y otros idiomas europeos

### Modos de Audio
- **Normal**: Información estándar para todos los públicos
- **Infantil**: Explicaciones adaptadas para niños
- **Experto**: Detalles técnicos y contexto histórico avanzado
- **Cachondo**: Versión con humor y curiosidades divertidas

### Categorías del Parque
- **Monumentos Europeos**: Torre Eiffel, Puerta de Brandeburgo, Torre de Pisa, etc.
- **Jardines Temáticos**: Espacios verdes únicos de cada país
- **Actividades Familiares**: Zona de entretenimiento para toda la familia
- **Gastronomía Europea**: Puntos de restauración con comida típica

## 🏗️ Arquitectura Técnica

### Frontend (React Native + Expo)
- **Navegación**: React Navigation con Stack y Tab navigators
- **Cámara**: Expo Camera para captura de imágenes
- **Almacenamiento**: AsyncStorage para datos locales
- **Audio**: Expo AV para reproducción de audio
- **Estilos**: Estilos responsivos para web y móvil

### Backend (Node.js + Express)
- **API REST**: Endpoints para reconocimiento y gestión de datos
- **Reconocimiento**: Integración con servicios de IA para identificación
- **Base de datos**: Almacenamiento de monumentos y usuarios
- **Autenticación**: Sistema de usuarios y sesiones

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Expo CLI
- React Native CLI (para desarrollo móvil)

### Instalación del Frontend
```bash
cd frontend
npm install
npm start
```

### Configuración
1. Actualiza `config.js` con la URL de tu API
2. Configura las variables de entorno necesarias
3. Asegúrate de que las imágenes de assets estén disponibles

## 📱 Funcionalidades

### Pantallas Principales
- **HomeScreen**: Pantalla principal con categorías y monumentos recientes
- **CameraScreen**: Interfaz de cámara para escanear monumentos
- **ResultScreen**: Información detallada del monumento identificado
- **SettingsScreen**: Configuración de la aplicación
- **SuggestionScreen**: Selección manual de monumentos

### Características Técnicas
- **Responsive Design**: Adaptado para móvil y web
- **Offline Support**: Funcionalidad básica sin conexión
- **Cache Management**: Gestión inteligente de caché
- **Performance**: Optimizado para dispositivos móviles

## 🎨 Diseño y UX

### Paleta de Colores
- **Verde Europa**: Color principal (#2E8B57)
- **Azul Real**: Color secundario (#4169E1)
- **Azul Bandera Europa**: Color tres (#003399)
- **Dorado**: Color de acento (#FFD700)

### Tipografías
- **Railway**: Para títulos y encabezados
- **Industrial**: Para texto y contenido

## 📊 Información del Parque

### Ubicación
- **Dirección**: Paseo de Europa, 28905 Torrejón de Ardoz, Madrid
- **Coordenadas**: 40.4589° N, 3.4707° W
- **Superficie**: 233.000 m²

### Horarios
- **Lunes a Domingo**: 10:00 - 22:00

### Monumentos Destacados
- Torre Eiffel (Francia)
- Puerta de Brandeburgo (Alemania)
- Torre de Pisa (Italia)
- Big Ben (Reino Unido)
- Molinos de viento (Países Bajos)
- Atomium (Bélgica)
- Plaza Mayor (España)

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

- **Email**: info@parqueeuropa.es
- **Teléfono**: +34 916 75 44 00
- **Web**: https://www.parqueeuropa.es/

## ⚠️ Descargo de Responsabilidad

Esta aplicación no es oficial del Parque Europa de Torrejón de Ardoz ni está afiliada, patrocinada o respaldada por el Ayuntamiento de Torrejón de Ardoz. La información proporcionada es de carácter educativo y recreativo.
