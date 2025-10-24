# 🚂 Modo Thomas & Friends - Museo del Ferrocarril

## Descripción

El **Modo Thomas** es una versión especial y divertida de la aplicación del Museo del Ferrocarril, diseñada específicamente para niños y familias. Incluye un diseño más colorido, animaciones divertidas y audios especiales narrados con el estilo de Thomas y sus amigos.

## 🎨 Características del Modo Thomas

### Diseño Visual
- **Colores vibrantes**: Naranja, turquesa, amarillo y azul Thomas
- **Emojis**: Uso extensivo de emojis para hacer la interfaz más amigable
- **Animaciones**: Efectos de entrada, rebote y pulso
- **Iconos**: Iconos de trenes y elementos ferroviarios

### Funcionalidades Especiales
- **Audio Thomas**: Busca automáticamente archivos con sufijo `-THOMAS`
- **Modo por defecto**: Se activa automáticamente el modo Thomas
- **Animaciones**: El botón de play pulsa cuando está reproduciendo
- **Icono rotatorio**: El icono de play gira cuando está reproduciendo

## 📁 Archivos del Modo Thomas

### Configuración
- `configThomas.js` - Configuración específica con colores y modos Thomas

### Pantallas
- `ResultScreenThomas.js` - Pantalla de resultados con diseño Thomas

### Componentes
- `AudioPlayerThomas.js` - Reproductor de audio con animaciones Thomas

## 🎵 Modos de Audio Disponibles

1. **Normal** - Información estándar para todos los públicos
2. **Infantil** - Explicaciones adaptadas para niños
3. **Experto** - Detalles técnicos y contexto histórico avanzado
4. **Cachondo** - Versión con humor y curiosidades divertidas
5. **Thomas** - ¡Modo especial con Thomas y sus amigos! 🚂

## 🔧 Cómo Usar el Modo Thomas

### 1. Navegación
Para usar el modo Thomas, navega a la pantalla `ResultScreenThomas` en lugar de `ResultScreen`:

```javascript
navigation.navigate('ResultScreenThomas', {
  recognitionResult: result,
  imageUri: imageUri,
  audioMode: 'thomas'
});
```

### 2. Configuración
El modo Thomas usa la configuración de `configThomas.js` que incluye:
- Colores más vibrantes y infantiles
- Modo Thomas como predeterminado
- Configuración específica para audios Thomas

### 3. Audios Thomas
Los audios del modo Thomas deben tener el sufijo `-THOMAS`:
- `locomotora-THOMAS.mp3`
- `vagon-THOMAS.mp3`
- etc.

Si no existe el audio Thomas, la aplicación intentará usar el audio normal.

## 🎨 Paleta de Colores Thomas

```javascript
COLORS: {
  PRIMARY: '#ff6b35',        // Naranja vibrante como Thomas
  SECONDARY: '#4ecdc4',      // Turquesa divertido
  ACCENT: '#ffeaa7',         // Amarillo suave
  TEXT: '#2d3436',           // Gris oscuro para buen contraste
  BACKGROUND: '#f8f9fa',     // Blanco suave
  DARK_ACCENT: '#fd79a8',    // Rosa oscuro
  LIGHT_ACCENT: '#a29bfe',   // Púrpura claro
  THOMAS_BLUE: '#0984e3',    // Azul Thomas
  THOMAS_RED: '#e17055'      // Rojo Thomas
}
```

## 🚂 Animaciones Especiales

### Animaciones de Entrada
- **Fade in**: Los elementos aparecen gradualmente
- **Scale**: Los elementos se escalan suavemente
- **Bounce**: Los botones rebotan al presionarlos

### Animaciones de Reproducción
- **Pulse**: El botón de play pulsa cuando está reproduciendo
- **Rotate**: El icono de play gira cuando está reproduciendo

## 📱 Integración con la App Principal

El modo Thomas es completamente independiente de la app principal, pero puede integrarse fácilmente:

1. **Selector de modo**: Añadir un botón para cambiar entre modo normal y Thomas
2. **Configuración**: Permitir al usuario elegir su modo preferido
3. **Navegación**: Usar la pantalla Thomas cuando se detecte que es un usuario infantil

## 🎯 Casos de Uso

### Para Niños
- Interfaz más colorida y divertida
- Audios narrados de forma más amigable
- Animaciones que mantienen la atención

### Para Familias
- Experiencia compartida más entretenida
- Explicaciones adaptadas para diferentes edades
- Diseño que apela tanto a niños como adultos

### Para Educadores
- Herramienta educativa más atractiva
- Contenido adaptado para diferentes niveles
- Interfaz que facilita la enseñanza

## 🔄 Migración desde el Modo Normal

Para migrar desde el modo normal al modo Thomas:

1. **Cambiar imports**:
   ```javascript
   // Antes
   import config from '../config.js';
   import ResultScreen from './ResultScreen.js';
   
   // Después
   import config from '../configThomas.js';
   import ResultScreen from './ResultScreenThomas.js';
   ```

2. **Actualizar navegación**:
   ```javascript
   // Antes
   navigation.navigate('ResultScreen', params);
   
   // Después
   navigation.navigate('ResultScreenThomas', params);
   ```

3. **Verificar audios**: Asegurar que existen los archivos `-THOMAS`

## 🎉 ¡Disfruta del Modo Thomas!

El modo Thomas transforma la experiencia del Museo del Ferrocarril en una aventura divertida y educativa, perfecta para toda la familia. ¡Chu-chu! 🚂✨ 