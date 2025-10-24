export default {
  // Configuración de la API para PRODUCCIÓN
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://tu-dominio-backend.com',
  
  // Configuración de colores para el Museo del Ferrocarril
  COLORS: {
    PRIMARY: '#1a3c6e',
    SECONDARY: '#e63946',
    ACCENT: '#f1faee',
    TEXT: '#1d3557',
    BACKGROUND: '#f1faee',
    DARK_ACCENT: '#457b9d',
    LIGHT_ACCENT: '#a8dadc'
  },

  // Configuración de la aplicación
  APP_NAME: 'Guía Museo del Ferrocarril',
  TENANT_ID: 'museo_ferrocarril',

  // Modos de audio disponibles
  AUDIO_MODES: [
    { id: 'normal', name: 'Normal', icon: 'information-circle-outline', description: 'Información estándar para todos los públicos' },
    { id: 'infantil', name: 'Infantil', icon: 'happy-outline', description: 'Explicaciones adaptadas para niños' },
    { id: 'experto', name: 'Experto', icon: 'school-outline', description: 'Detalles técnicos y contexto histórico avanzado' },
    { id: 'cachondo', name: 'Cachondo', icon: 'beer-outline', description: 'Versión con humor y curiosidades divertidas' }
  ],

  // Configuración de la cámara optimizada para producción
  CAMERA: {
    ratio: '16:9',
    quality: 0.8,
    autoFocus: true,
    flashMode: 'auto',
    maxImageSize: 1024 // Limitar tamaño para mejor rendimiento
  },

  // Configuración de reconocimiento optimizada
  RECOGNITION: {
    confidenceThreshold: 0.7,
    maxResults: 5,
    processingTimeout: 15000, // Aumentado para producción
    retryAttempts: 2
  },

  // Configuración de cache
  CACHE: {
    maxHistoryItems: 20,
    audioCacheSize: 50, // MB
    imageCacheSize: 100 // MB
  },

  // Configuración de analytics (opcional)
  ANALYTICS: {
    enabled: true,
    trackingId: process.env.EXPO_PUBLIC_ANALYTICS_ID || null
  },

  // Configuración de errores
  ERROR_REPORTING: {
    enabled: true,
    endpoint: process.env.EXPO_PUBLIC_ERROR_ENDPOINT || null
  }
}; 