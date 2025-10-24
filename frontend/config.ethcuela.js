export default {
  // Configuración de la API para tu dominio
  API_URL: 'https://guideitor.ethcuela.es',
  
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

  // Configuración de la cámara optimizada
  CAMERA: {
    ratio: '16:9',
    quality: 0.8,
    autoFocus: true,
    flashMode: 'auto',
    maxImageSize: 1024
  },

  // Configuración de reconocimiento optimizada
  RECOGNITION: {
    confidenceThreshold: 0.7,
    maxResults: 5,
    processingTimeout: 15000,
    retryAttempts: 2
  },

  // Configuración de cache
  CACHE: {
    maxHistoryItems: 20,
    audioCacheSize: 50,
    imageCacheSize: 100
  },

  // Información del museo
  MUSEUM_INFO: {
    name: 'Museo del Ferrocarril de Madrid',
    address: 'Paseo de las Delicias, 61, 28045 Madrid',
    coordinates: { latitude: 40.4406, longitude: -3.6957 },
    hours: {
      monday: 'Cerrado',
      tuesday: '10:00 - 15:00',
      wednesday: '10:00 - 15:00',
      thursday: '10:00 - 15:00',
      friday: '10:00 - 15:00',
      saturday: '10:00 - 19:00',
      sunday: '10:00 - 15:00'
    },
    contact: {
      phone: '+34 902 22 88 22',
      email: 'museoferrocarril@ffe.es',
      website: 'https://www.museodelferrocarril.org/'
    }
  }
}; 